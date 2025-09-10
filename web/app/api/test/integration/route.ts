import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

export async function GET() {
  const results: TestResult[] = [];
  const supabase = await createClient();
  
  // Test 1: Database Connection
  try {
    const { data, error } = await supabase
      .from('video')
      .select('count')
      .limit(1);
    
    results.push({
      name: 'Database Connection',
      passed: !error,
      message: error ? error.message : 'Connected successfully',
    });
  } catch (error: any) {
    results.push({
      name: 'Database Connection',
      passed: false,
      message: error.message,
    });
  }
  
  // Test 2: Insert Test Video (Discovery)
  let testVideoId: string | null = null;
  try {
    const testVideo = {
      video_id: `test_${Date.now()}`,
      url: `https://www.tiktok.com/@testuser/video/${Date.now()}`,
      title: 'Integration Test Video',
      author: 'testuser',
      view_count: 1000,
      is_promoted: true,
      discovered_at: new Date().toISOString(),
      metadata: {
        description: 'Test video for integration testing #ad',
        likes: 100,
        shares: 50,
      },
    };
    
    const { data, error } = await supabase
      .from('video')
      .insert(testVideo)
      .select()
      .single();
    
    testVideoId = data?.video_id || null;
    
    results.push({
      name: 'Video Discovery (Insert)',
      passed: !error && !!data,
      message: error ? error.message : `Video ${data?.video_id} created`,
      data: data,
    });
  } catch (error: any) {
    results.push({
      name: 'Video Discovery (Insert)',
      passed: false,
      message: error.message,
    });
  }
  
  // Test 3: Insert Test Comments (Harvesting)
  let testComments: any[] = [];
  if (testVideoId) {
    try {
      const comments = [
        {
          comment_id: `comment_${Date.now()}_1`,
          video_id: testVideoId,
          author: 'user1',
          text: 'Check out deals at example.com!',
          created_at: new Date().toISOString(),
        },
        {
          comment_id: `comment_${Date.now()}_2`,
          video_id: testVideoId,
          author: 'user2',
          text: 'Better prices at shop.example.net',
          created_at: new Date().toISOString(),
        },
      ];
      
      const { data, error } = await supabase
        .from('comment')
        .insert(comments)
        .select();
      
      testComments = data || [];
      
      results.push({
        name: 'Comment Harvesting',
        passed: !error && data?.length === 2,
        message: error ? error.message : `${data?.length} comments created`,
        data: data,
      });
    } catch (error: any) {
      results.push({
        name: 'Comment Harvesting',
        passed: false,
        message: error.message,
      });
    }
  } else {
    results.push({
      name: 'Comment Harvesting',
      passed: false,
      message: 'Skipped - no test video created',
    });
  }
  
  // Test 4: Extract and Store Domains
  if (testComments.length > 0) {
    try {
      const domains = new Set<string>();
      const domainMentions: any[] = [];
      
      // Extract domains from comments
      testComments.forEach(comment => {
        const regex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/gi;
        const matches = comment.text.matchAll(regex);
        
        for (const match of matches) {
          const domain = match[1].toLowerCase();
          domains.add(domain);
          
          domainMentions.push({
            domain_name: domain,
            comment_id: comment.comment_id,
            video_id: comment.video_id,
            mentioned_at: new Date().toISOString(),
          });
        }
      });
      
      // Insert domains
      const domainArray = Array.from(domains).map(domain => ({
        domain_name: domain,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        mention_count: 1,
      }));
      
      const { data: domainData, error: domainError } = await supabase
        .from('domain')
        .upsert(domainArray, { onConflict: 'domain_name' })
        .select();
      
      // Insert domain mentions
      const { error: mentionError } = await supabase
        .from('domain_mention')
        .upsert(domainMentions, {
          onConflict: 'domain_name,comment_id,video_id',
        });
      
      results.push({
        name: 'Domain Extraction',
        passed: !domainError && !mentionError && domains.size > 0,
        message: domainError?.message || mentionError?.message || 
                 `${domains.size} domains extracted`,
        data: { domains: Array.from(domains), mentions: domainMentions.length },
      });
    } catch (error: any) {
      results.push({
        name: 'Domain Extraction',
        passed: false,
        message: error.message,
      });
    }
  } else {
    results.push({
      name: 'Domain Extraction',
      passed: false,
      message: 'Skipped - no test comments created',
    });
  }
  
  // Test 5: Query Dashboard Views
  try {
    const { data: domainView, error: viewError } = await supabase
      .from('domain')
      .select('*')
      .order('mention_count', { ascending: false })
      .limit(5);
    
    results.push({
      name: 'Dashboard Views',
      passed: !viewError,
      message: viewError ? viewError.message : 
               `Retrieved ${domainView?.length || 0} domains`,
      data: domainView,
    });
  } catch (error: any) {
    results.push({
      name: 'Dashboard Views',
      passed: false,
      message: error.message,
    });
  }
  
  // Test 6: Error Handling - Invalid Data
  try {
    const { error } = await supabase
      .from('video')
      .insert({
        video_id: null, // Invalid - should fail
        url: 'invalid',
      });
    
    results.push({
      name: 'Error Handling (Invalid Data)',
      passed: !!error, // Should have an error
      message: error ? 'Correctly rejected invalid data' : 
               'Failed to reject invalid data',
    });
  } catch (error: any) {
    results.push({
      name: 'Error Handling (Invalid Data)',
      passed: true,
      message: 'Correctly threw error for invalid data',
    });
  }
  
  // Cleanup test data
  try {
    if (testVideoId) {
      await supabase
        .from('domain_mention')
        .delete()
        .eq('video_id', testVideoId);
      
      await supabase
        .from('comment')
        .delete()
        .eq('video_id', testVideoId);
      
      await supabase
        .from('video')
        .delete()
        .eq('video_id', testVideoId);
      
      // Clean up test domains
      await supabase
        .from('domain')
        .delete()
        .like('domain_name', '%.example.%');
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
  
  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  return NextResponse.json({
    success: failed === 0,
    summary: {
      passed,
      failed,
      total,
      percentage: Math.round((passed / total) * 100),
    },
    results,
    timestamp: new Date().toISOString(),
    message: failed === 0 
      ? '✅ All integration tests passed!' 
      : `⚠️ ${failed} test(s) failed. Review the results.`,
  });
}