import dotenv from 'dotenv';
import path from 'path';
import { TimeSlot } from '../lib/types';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Mock window.__ENV
(global as any).window = {
  __ENV: {
    VITE_NEWS_API_KEY: process.env.NEWS_API_KEY,
    VITE_OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    VITE_UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    VITE_SUPABASE_URL: process.env.SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  }
};

async function testFrontend() {
  console.log('Testing frontend data retrieval...');

  try {
    // Check client environment variables
    console.log('\nChecking client environment variables:');
    const clientVars = [
      'VITE_NEWS_API_KEY',
      'VITE_OPENAI_API_KEY',
      'VITE_UNSPLASH_ACCESS_KEY',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    clientVars.forEach(varName => {
      console.log(`${varName}: ${(global as any).window.__ENV[varName] ? '✅ Set' : '❌ Missing'}`);
    });

    // Test data retrieval for each time slot
    const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];

    for (const timeSlot of timeSlots) {
      console.log(`\n📱 Testing frontend retrieval for ${timeSlot}:`);
      
      const response = await fetch(
        `http://localhost:3000/api/news?timeSlot=${timeSlot}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ Data retrieved successfully:');
      console.log(`Time: ${data.timeSlot}`);
      console.log(`Date: ${data.date}`);
      console.log(`Stories count: ${data.stories?.length || 0}`);

      if (data.stories?.length > 0) {
        console.log('\nFirst story preview:');
        const firstStory = data.stories[0];
        console.log(`- Category: ${firstStory.category}`);
        console.log(`- Headline: ${firstStory.headline}`);
        console.log(`- Source: ${firstStory.source}`);
        
        // Verify story structure
        const requiredFields = ['id', 'timestamp', 'category', 'headline', 'content', 'source', 'image', 'originalUrl'];
        const missingFields = requiredFields.filter(field => !firstStory[field]);
        
        if (missingFields.length > 0) {
          console.log(`⚠️ Missing required fields: ${missingFields.join(', ')}`);
        } else {
          console.log('✅ Story structure is complete');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error testing frontend:', error);
    process.exit(1);
  }
}

testFrontend(); 