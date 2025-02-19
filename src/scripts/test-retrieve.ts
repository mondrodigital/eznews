import dotenv from 'dotenv';
import { getTimeBlock } from '@/lib/storage';
import path from 'path';

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testRetrieve() {
  try {
    console.log('Retrieving news for 10AM time slot...');
    const timeBlock = await getTimeBlock('10AM');
    
    if (!timeBlock) {
      console.log('No data found for 10AM time slot');
      return;
    }

    console.log('\nTime Block:', {
      time: timeBlock.time,
      date: timeBlock.date,
      storyCount: timeBlock.stories.length
    });

    console.log('\nComplete Story Data:');
    timeBlock.stories.forEach((story, index) => {
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
  } catch (error) {
    console.error('Error retrieving data:', error);
    process.exit(1);
  }
}

testRetrieve(); 