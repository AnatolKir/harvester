#!/usr/bin/env ts-node

/**
 * Test script for Inngest job scheduling system
 * Run with: npx ts-node inngest/test-jobs.ts
 */

import { inngest } from './client';
import { InngestAdmin } from '../web/src/lib/inngest-admin';

async function testInngestIntegration() {
  console.log('🧪 Testing Inngest Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    await inngest.send({
      name: "tiktok/system.health_check",
      data: {}
    });
    console.log('✅ Health check triggered successfully\n');

    // Test 2: System Configuration
    console.log('2️⃣ Testing System Configuration...');
    const config = await InngestAdmin.getSystemConfig();
    console.log(`✅ Retrieved ${config.length} configuration items\n`);

    // Test 3: Kill Switch Status
    console.log('3️⃣ Testing Kill Switch Status...');
    const killSwitchActive = await InngestAdmin.isKillSwitchActive();
    console.log(`✅ Kill switch status: ${killSwitchActive ? 'ACTIVE' : 'INACTIVE'}\n`);

    // Test 4: Job Metrics
    console.log('4️⃣ Testing Job Metrics...');
    const metrics = await InngestAdmin.getJobMetrics();
    console.log(`✅ Retrieved job metrics for ${metrics.length} job types\n`);

    // Test 5: Manual Discovery (if kill switch is inactive)
    if (!killSwitchActive) {
      console.log('5️⃣ Testing Manual Discovery Job...');
      await inngest.send({
        name: "tiktok/video.discovery.manual",
        data: {
          limit: 1,
          forceRefresh: false
        }
      });
      console.log('✅ Manual discovery job triggered successfully\n');
    } else {
      console.log('5️⃣ ⚠️  Skipping manual discovery - kill switch is active\n');
    }

    // Test 6: Job Status Update
    console.log('6️⃣ Testing Job Status Update...');
    await inngest.send({
      name: "tiktok/job.status.update",
      data: {
        jobId: `test-job-${Date.now()}`,
        status: 'completed',
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      }
    });
    console.log('✅ Job status update sent successfully\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up Inngest Cloud account and configure webhook');
    console.log('2. Apply database migrations for system tables');
    console.log('3. Configure environment variables');
    console.log('4. Test with real TikTok data');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function displaySystemStatus() {
  console.log('\n📊 Current System Status:');
  console.log('=' .repeat(50));

  try {
    const systemHealth = await InngestAdmin.getSystemHealth();
    const recentLogs = await InngestAdmin.getRecentLogs(5);

    console.log(`Kill Switch: ${systemHealth.killSwitchActive ? '🔴 ACTIVE' : '🟢 INACTIVE'}`);
    console.log(`Jobs (24h): ${systemHealth.total_jobs_24h} total, ${systemHealth.completed_jobs_24h} completed, ${systemHealth.failed_jobs_24h} failed`);
    console.log(`Running Jobs: ${systemHealth.running_jobs}`);
    console.log(`DLQ Items: ${systemHealth.pending_dlq_items}`);
    
    if (systemHealth.last_discovery_job) {
      console.log(`Last Discovery: ${new Date(systemHealth.last_discovery_job).toLocaleString()}`);
    }
    
    if (systemHealth.last_harvesting_job) {
      console.log(`Last Harvesting: ${new Date(systemHealth.last_harvesting_job).toLocaleString()}`);
    }

    console.log('\n📝 Recent Logs:');
    recentLogs.slice(0, 3).forEach(log => {
      const time = new Date(log.created_at).toLocaleTimeString();
      console.log(`  [${time}] ${log.level.toUpperCase()}: ${log.message}`);
    });

  } catch (error) {
    console.log('⚠️  Could not retrieve system status:', error.message);
  }
}

// Run tests
if (require.main === module) {
  testInngestIntegration()
    .then(() => displaySystemStatus())
    .catch(console.error);
}

export { testInngestIntegration, displaySystemStatus };