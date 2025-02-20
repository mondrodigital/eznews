import dotenv from 'dotenv';
import { TimeSlot } from '@/lib/types';
import path from 'path';

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testRetrieve() {
  try {
    console.log('Retrieving news for all time slots...');
    
    // Import KV dynamically
    const { kv } = await import('@vercel/kv');
    
    // Check all time slots
    const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
    
    for (const timeSlot of timeSlots) {
      console.log(`\nChecking ${timeSlot} time slot...`);
      const data = await kv.get(`news:${timeSlot}`);
      
      if (!data) {
        console.log(`No data found for ${timeSlot} time slot`);
        continue;
      }

      const timeBlock = typeof data === 'string' ? JSON.parse(data) : data;

      console.log('\nTime Block:', {
        time: timeBlock.time,
        date: timeBlock.date,
        storyCount: timeBlock.stories.length
      });

      console.log('\nComplete Story Data:');
      timeBlock.stories.forEach((story: any, index: number) => {
        console.log(`\n=== [Story ${index + 1}] ${story.category.toUpperCase()} ===`);
        console.log('ID:', story.id);
        console.log('Timestamp:', story.timestamp);
        console.log('Category:', story.category);
        console.log('Headline:', story.headline);
        console.log('Source:', story.source);
        console.log('Original URL:', story.originalUrl);
        console.log('Image URL:', story.image);
        console.log('\nFull Content:');
        console.log('------------');
        console.log(story.content);
        console.log('------------\n');
      });
    }
  } catch (error) {
    console.error('Error retrieving data:', error);
    process.exit(1);
  }
}

testRetrieve(); 