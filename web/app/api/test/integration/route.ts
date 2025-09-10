import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

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
    const { error } = await supabase
      .from('video')
      .select('video_id')
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
    const testVideo: Database['public']['Tables']['video']['Insert'] = {
      video_id: `test_${Date.now()}`,
      url: `https://www.tiktok.com/@testuser/video/${Date.now()}`,
      title: 'Integration Test Video',
      description: 'Test video for integration testing #ad',
      view_count: 1000,
      share_count: 50,
      comment_count: 10,
      is_promoted: true,
      metadata: {
        author: 'testuser',
        likes: 100,
      },
    };
    
    const { data, error } = await (supabase
      .from('video')
      .insert([testVideo] as any)
      .select()
      .single()) as { data: any; error: any };
    
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
      const comments: Database['public']['Tables']['comment']['Insert'][] = [
        {
          comment_id: `comment_${Date.now()}_1`,
          video_id: testVideoId,
          author_username: 'user1',
          content: 'Check out deals at example.com!',
          like_count: 5,
          reply_count: 0,
          is_author_reply: false,
        },
        {
          comment_id: `comment_${Date.now()}_2`,
          video_id: testVideoId,
          author_username: 'user2',
          content: 'Better prices at shop.example.net',
          like_count: 3,
          reply_count: 0,
          is_author_reply: false,
        },
      ];
      
      const { data, error } = await supabase
        .from('comment')
        .insert(comments as any)
        .select();
      
      testComments = data || [];
      
      results.push({
        name: 'Comment Harvesting (Insert)',
        passed: !error && !!data && data.length === 2,
        message: error ? error.message : `${data?.length || 0} comments created`,
        data: data,
      });
    } catch (error: any) {
      results.push({
        name: 'Comment Harvesting (Insert)',
        passed: false,
        message: error.message,
      });
    }
  }
  
  // Test 4: Domain Extraction
  if (testComments.length > 0) {
    try {
      const { data: domains, error } = await supabase
        .from('domain')
        .select('*')
        .or('domain.eq.example.com,domain.eq.shop.example.net');
      
      results.push({
        name: 'Domain Extraction',
        passed: !error && !!domains && domains.length > 0,
        message: error 
          ? error.message 
          : `Found ${domains?.length || 0} domains`,
        data: domains,
      });
    } catch (error: any) {
      results.push({
        name: 'Domain Extraction',
        passed: false,
        message: error.message,
      });
    }
  }
  
  // Test 5: Check Views
  try {
    const views = [
      'v_domains_all',
      'v_domains_new_today',
      'v_domains_trending',
      'v_videos_promoted',
    ];
    
    for (const viewName of views) {
      try {
        const { error } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);
        
        results.push({
          name: `View: ${viewName}`,
          passed: !error,
          message: error ? error.message : 'View accessible',
        });
      } catch (error: any) {
        results.push({
          name: `View: ${viewName}`,
          passed: false,
          message: error.message,
        });
      }
    }
  } catch (error: any) {
    results.push({
      name: 'View Tests',
      passed: false,
      message: error.message,
    });
  }
  
  // Test 6: Worker Health Check
  try {
    const workerUrl = process.env.WORKER_WEBHOOK_URL || 
                      'https://harvester-production.up.railway.app';
    
    const response = await fetch(`${workerUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    const healthData = await response.json();
    
    results.push({
      name: 'Worker Health Check',
      passed: response.ok,
      message: response.ok 
        ? `Worker healthy: ${healthData.status}` 
        : `Worker unhealthy: ${response.status}`,
      data: healthData,
    });
  } catch (error: any) {
    results.push({
      name: 'Worker Health Check',
      passed: false,
      message: error.message || 'Worker unreachable',
    });
  }
  
  // Cleanup test data
  if (testVideoId) {
    try {
      // Delete test comments
      await supabase
        .from('comment')
        .delete()
        .eq('video_id', testVideoId);
      
      // Delete test video
      await supabase
        .from('video')
        .delete()
        .eq('video_id', testVideoId);
      
      results.push({
        name: 'Cleanup',
        passed: true,
        message: 'Test data cleaned up',
      });
    } catch (error: any) {
      results.push({
        name: 'Cleanup',
        passed: false,
        message: error.message,
      });
    }
  }
  
  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    passRate: Math.round((results.filter(r => r.passed).length / results.length) * 100),
  };
  
  return NextResponse.json({
    success: summary.failed === 0,
    summary,
    results,
    timestamp: new Date().toISOString(),
  });
}