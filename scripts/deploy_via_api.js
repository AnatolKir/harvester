#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get environment variables
const supabaseUrl = 'https://nnkoqjwguzoyfcvbdrqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ua29xandndXpveWZjdmJkcnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE5MDg0MCwiZXhwIjoyMDcyNzY2ODQwfQ.1leaMwWGatsxIHkFHil_-3Ee4-_chI46uRIg8KPWN8E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Try to run a simple query
    const { data, error } = await supabase
      .from('video')
      .select('count')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('✓ Connected to Supabase, but tables don\'t exist yet (expected)');
      return true;
    } else if (error) {
      console.error('Connection error:', error);
      return false;
    } else {
      console.log('✓ Connected to Supabase, tables already exist');
      return true;
    }
  } catch (err) {
    console.error('Failed to connect:', err);
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  
  if (connected) {
    console.log('\n===========================================');
    console.log('CONNECTION SUCCESSFUL!');
    console.log('===========================================');
    console.log('\nTo deploy the migrations, please:');
    console.log('1. Go to: https://supabase.com/dashboard/project/nnkoqjwguzoyfcvbdrqi/sql/new');
    console.log('2. Copy the contents of: supabase_migrations_combined.sql');
    console.log('3. Paste and click "Run"');
    console.log('\nThe file contains all tables, indexes, views, and functions needed.');
  }
}

main().catch(console.error);