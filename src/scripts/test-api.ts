import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testNewsAPI() {
  console.log('Testing News API endpoint...');
  
  try {
    // Test environment variables
    console.log('\nChecking environment variables:');
    const requiredVars = ['NEWS_API_KEY', 'OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    requiredVars.forEach(varName => {
      console.log(`${varName}: ${process.env[varName] ? '✅ Set' : '❌ Missing'}`);
    });

    // Test API endpoint for each time slot
    const timeSlots = ['10AM', '3PM', '8PM'];
    
    for (const timeSlot of timeSlots) {
      console.log(`\n📊 Testing ${timeSlot} time slot:`);
      
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
      
      console.log(`Status: ${data.status}`);
      console.log(`Time Slot: ${data.timeSlot}`);
      console.log(`Date: ${data.date}`);
      console.log(`Stories fetched: ${data.stories?.length || 0}`);
      
      if (data.stories?.length > 0) {
        console.log('\nFirst story preview:');
        const firstStory = data.stories[0];
        console.log(`- Category: ${firstStory.category}`);
        console.log(`- Headline: ${firstStory.headline}`);
        console.log(`- Source: ${firstStory.source}`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing News API:', error);
    process.exit(1);
  }
}

testNewsAPI(); 