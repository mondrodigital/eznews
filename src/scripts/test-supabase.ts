import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testSupabase() {
  console.log('Testing Supabase storage...');

  try {
    // Check Supabase environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const key = `daily_news_${today}`;

    console.log('\nChecking news cache in Supabase...');
    const { data: cacheData, error: cacheError } = await supabase
      .from('news_cache')
      .select('*')
      .eq('key', key)
      .single();

    if (cacheError) {
      console.log('❌ No cached news found:', cacheError.message);
    } else {
      console.log('✅ Found cached news data:');
      console.log(`Key: ${cacheData.key}`);
      console.log(`Created at: ${cacheData.created_at}`);
      console.log(`Stories count: ${cacheData.data.stories?.length || 0}`);

      if (cacheData.data.stories?.length > 0) {
        console.log('\nFirst story preview:');
        const firstStory = cacheData.data.stories[0];
        console.log(`- Category: ${firstStory.category}`);
        console.log(`- Headline: ${firstStory.headline}`);
        console.log(`- Source: ${firstStory.source}`);
      }
    }

    // Test writing to Supabase
    console.log('\nTesting write operation...');
    const testKey = `test_${Date.now()}`;
    const testData = {
      message: 'Test data',
      timestamp: new Date().toISOString()
    };

    const { error: writeError } = await supabase
      .from('news_cache')
      .upsert({
        key: testKey,
        data: testData,
        created_at: new Date().toISOString()
      });

    if (writeError) {
      console.log('❌ Write test failed:', writeError.message);
    } else {
      console.log('✅ Write test successful');

      // Clean up test data
      const { error: deleteError } = await supabase
        .from('news_cache')
        .delete()
        .eq('key', testKey);

      if (deleteError) {
        console.log('⚠️ Failed to clean up test data:', deleteError.message);
      } else {
        console.log('✅ Test data cleaned up successfully');
      }
    }

  } catch (error) {
    console.error('❌ Error testing Supabase:', error);
    process.exit(1);
  }
}

testSupabase(); 