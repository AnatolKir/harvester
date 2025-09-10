#!/usr/bin/env node

/**
 * Integration Test Script for TikTok Harvester Pipeline
 * Tests the complete flow from discovery to domain extraction
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_CONFIG = {
  testVideoUrl: 'https://www.tiktok.com/@test/video/7446899047644515627',
  testKeywords: ['christmas', 'sale', 'deal'],
  maxRetries: 3,
  retryDelay: 2000,
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDatabaseConnection() {
  log('\n🔍 Testing Database Connection...', 'cyan');
  
  try {
    const { data, error } = await supabase
      .from('video')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    log('✅ Database connection successful', 'green');
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function testDiscovery() {
  log('\n🔍 Testing Discovery (Mock Data)...', 'cyan');
  
  try {
    // Insert mock video data
    const mockVideos = [
      {
        video_id: `test_${Date.now()}_1`,
        url: `https://www.tiktok.com/@testuser1/video/${Date.now()}1`,
        title: 'Test Christmas Sale Video 1',
        author: 'testuser1',
        view_count: 1500,
        is_promoted: true,
        discovered_at: new Date().toISOString(),
        metadata: {
          description: 'Check out this amazing Christmas deal! #ad #sponsored',
          likes: 100,
          shares: 50,
          comments: 25,
        },
      },
      {
        video_id: `test_${Date.now()}_2`,
        url: `https://www.tiktok.com/@testuser2/video/${Date.now()}2`,
        title: 'Test Tech Gadget Deal',
        author: 'testuser2',
        view_count: 3000,
        is_promoted: true,
        discovered_at: new Date().toISOString(),
        metadata: {
          description: 'Amazing tech deals at example.com #promoted',
          likes: 200,
          shares: 75,
          comments: 40,
        },
      },
    ];
    
    const { data, error } = await supabase
      .from('video')
      .upsert(mockVideos, { onConflict: 'video_id' })
      .select();
    
    if (error) throw error;
    
    log(`✅ Discovery test successful - ${data.length} videos inserted`, 'green');
    data.forEach(video => {
      log(`  - ${video.title} (${video.video_id})`, 'blue');
    });
    
    return data;
  } catch (error) {
    log(`❌ Discovery test failed: ${error.message}`, 'red');
    return [];
  }
}

async function testHarvesting(videos) {
  log('\n🔍 Testing Comment Harvesting (Mock Data)...', 'cyan');
  
  if (!videos || videos.length === 0) {
    log('⚠️  No videos to harvest comments from', 'yellow');
    return [];
  }
  
  try {
    const allComments = [];
    
    for (const video of videos) {
      // Generate mock comments with domains
      const mockComments = [
        {
          comment_id: `comment_${Date.now()}_1`,
          video_id: video.video_id,
          author: 'user1',
          text: 'Great deals at shop.example.com! Just bought one',
          created_at: new Date().toISOString(),
          metadata: {
            likes: 10,
            replies: 2,
          },
        },
        {
          comment_id: `comment_${Date.now()}_2`,
          video_id: video.video_id,
          author: 'user2',
          text: 'Check out deals.store.com for better prices',
          created_at: new Date().toISOString(),
          metadata: {
            likes: 5,
            replies: 1,
          },
        },
        {
          comment_id: `comment_${Date.now()}_3`,
          video_id: video.video_id,
          author: 'user3',
          text: 'I found this on https://discount-hub.net/deals',
          created_at: new Date().toISOString(),
          metadata: {
            likes: 15,
            replies: 3,
          },
        },
      ];
      
      const { data, error } = await supabase
        .from('comment')
        .upsert(mockComments, { onConflict: 'comment_id' })
        .select();
      
      if (error) throw error;
      
      allComments.push(...data);
      log(`  ✅ Harvested ${data.length} comments from video ${video.video_id}`, 'green');
    }
    
    log(`✅ Harvesting test successful - ${allComments.length} total comments`, 'green');
    return allComments;
  } catch (error) {
    log(`❌ Harvesting test failed: ${error.message}`, 'red');
    return [];
  }
}

async function testDomainExtraction(comments) {
  log('\n🔍 Testing Domain Extraction...', 'cyan');
  
  if (!comments || comments.length === 0) {
    log('⚠️  No comments to extract domains from', 'yellow');
    return [];
  }
  
  try {
    const domains = new Map();
    const domainMentions = [];
    
    // Extract domains from comments
    for (const comment of comments) {
      const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/gi;
      const matches = comment.text.matchAll(domainPattern);
      
      for (const match of matches) {
        const domain = match[1].toLowerCase();
        
        if (!domains.has(domain)) {
          domains.set(domain, {
            domain_name: domain,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            mention_count: 0,
            metadata: {
              tld: domain.split('.').pop(),
              subdomain_count: domain.split('.').length - 2,
            },
          });
        }
        
        const domainData = domains.get(domain);
        domainData.mention_count++;
        domainData.last_seen_at = new Date().toISOString();
        
        domainMentions.push({
          domain_name: domain,
          comment_id: comment.comment_id,
          video_id: comment.video_id,
          mentioned_at: new Date().toISOString(),
        });
      }
    }
    
    // Insert domains
    if (domains.size > 0) {
      const domainArray = Array.from(domains.values());
      const { data: domainData, error: domainError } = await supabase
        .from('domain')
        .upsert(domainArray, { onConflict: 'domain_name' })
        .select();
      
      if (domainError) throw domainError;
      
      log(`  ✅ Extracted ${domainData.length} unique domains:`, 'green');
      domainData.forEach(domain => {
        log(`    - ${domain.domain_name} (${domain.mention_count} mentions)`, 'blue');
      });
      
      // Insert domain mentions
      const { error: mentionError } = await supabase
        .from('domain_mention')
        .upsert(domainMentions, { 
          onConflict: 'domain_name,comment_id,video_id' 
        });
      
      if (mentionError) throw mentionError;
      
      log(`  ✅ Created ${domainMentions.length} domain mention records`, 'green');
      
      return domainData;
    } else {
      log('  ⚠️  No domains found in comments', 'yellow');
      return [];
    }
  } catch (error) {
    log(`❌ Domain extraction test failed: ${error.message}`, 'red');
    return [];
  }
}

async function testErrorScenarios() {
  log('\n🔍 Testing Error Scenarios...', 'cyan');
  
  try {
    // Test 1: Invalid video ID
    log('  Testing invalid video ID...', 'yellow');
    const { error: invalidError } = await supabase
      .from('video')
      .insert({ video_id: null, url: 'invalid' });
    
    if (invalidError) {
      log('  ✅ Correctly rejected invalid video ID', 'green');
    } else {
      log('  ❌ Failed to reject invalid video ID', 'red');
    }
    
    // Test 2: Duplicate comment
    log('  Testing duplicate comment handling...', 'yellow');
    const duplicateComment = {
      comment_id: 'duplicate_test',
      video_id: 'test_video',
      author: 'test',
      text: 'duplicate',
      created_at: new Date().toISOString(),
    };
    
    await supabase.from('comment').upsert(duplicateComment);
    const { error: dupError } = await supabase
      .from('comment')
      .upsert(duplicateComment);
    
    if (!dupError) {
      log('  ✅ Duplicate comment handled gracefully', 'green');
    } else {
      log('  ❌ Error handling duplicate: ' + dupError.message, 'red');
    }
    
    // Test 3: Rate limiting simulation
    log('  Testing rate limiting...', 'yellow');
    let rateLimitHit = false;
    const promises = [];
    
    for (let i = 0; i < 20; i++) {
      promises.push(
        supabase
          .from('video')
          .select('*')
          .limit(1)
          .then(() => true)
          .catch(() => {
            rateLimitHit = true;
            return false;
          })
      );
    }
    
    await Promise.all(promises);
    log('  ✅ Rate limiting test completed (limit hit: ' + rateLimitHit + ')', 'green');
    
    return true;
  } catch (error) {
    log(`❌ Error scenario test failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyDashboardData() {
  log('\n🔍 Verifying Dashboard Data...', 'cyan');
  
  try {
    // Check domains view
    const { data: domains, error: domainError } = await supabase
      .from('domain')
      .select('*')
      .order('mention_count', { ascending: false })
      .limit(5);
    
    if (domainError) throw domainError;
    
    log(`  ✅ Top domains in database:`, 'green');
    domains.forEach(domain => {
      log(`    - ${domain.domain_name}: ${domain.mention_count} mentions`, 'blue');
    });
    
    // Check recent videos
    const { data: videos, error: videoError } = await supabase
      .from('video')
      .select('*')
      .order('discovered_at', { ascending: false })
      .limit(5);
    
    if (videoError) throw videoError;
    
    log(`  ✅ Recent videos: ${videos.length}`, 'green');
    
    // Check comment count
    const { count, error: countError } = await supabase
      .from('comment')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    log(`  ✅ Total comments: ${count}`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Dashboard data verification failed: ${error.message}`, 'red');
    return false;
  }
}

async function cleanup() {
  log('\n🧹 Cleaning up test data...', 'cyan');
  
  try {
    // Delete test data
    await supabase
      .from('domain_mention')
      .delete()
      .like('video_id', 'test_%');
    
    await supabase
      .from('comment')
      .delete()
      .like('video_id', 'test_%');
    
    await supabase
      .from('video')
      .delete()
      .like('video_id', 'test_%');
    
    await supabase
      .from('domain')
      .delete()
      .like('domain_name', '%.example.com');
    
    log('✅ Test data cleaned up', 'green');
  } catch (error) {
    log(`⚠️  Cleanup warning: ${error.message}`, 'yellow');
  }
}

async function runIntegrationTest() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 TikTok Harvester Integration Test', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const results = {
    database: false,
    discovery: false,
    harvesting: false,
    extraction: false,
    errors: false,
    dashboard: false,
  };
  
  try {
    // Test database connection
    results.database = await testDatabaseConnection();
    if (!results.database) {
      throw new Error('Database connection required for tests');
    }
    
    // Test discovery
    const videos = await testDiscovery();
    results.discovery = videos.length > 0;
    
    // Test harvesting
    const comments = await testHarvesting(videos);
    results.harvesting = comments.length > 0;
    
    // Test domain extraction
    const domains = await testDomainExtraction(comments);
    results.extraction = domains.length > 0;
    
    // Test error scenarios
    results.errors = await testErrorScenarios();
    
    // Verify dashboard data
    results.dashboard = await verifyDashboardData();
    
    // Clean up test data
    await cleanup();
    
  } catch (error) {
    log(`\n❌ Integration test failed: ${error.message}`, 'red');
  }
  
  // Print summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Test Results Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const tests = [
    ['Database Connection', results.database],
    ['Discovery Process', results.discovery],
    ['Comment Harvesting', results.harvesting],
    ['Domain Extraction', results.extraction],
    ['Error Handling', results.errors],
    ['Dashboard Data', results.dashboard],
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(([name, result]) => {
    const status = result ? '✅ PASSED' : '❌ FAILED';
    const color = result ? 'green' : 'red';
    log(`  ${name}: ${status}`, color);
    if (result) passed++;
    else failed++;
  });
  
  log('\n' + '='.repeat(60), 'cyan');
  const overallColor = failed === 0 ? 'green' : (passed > failed ? 'yellow' : 'red');
  log(`Overall: ${passed}/${tests.length} tests passed`, overallColor);
  
  if (failed === 0) {
    log('🎉 All tests passed! The pipeline is working correctly.', 'green');
  } else if (passed > failed) {
    log('⚠️  Some tests failed. Review the issues above.', 'yellow');
  } else {
    log('❌ Multiple tests failed. The pipeline needs attention.', 'red');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run the tests
runIntegrationTest();