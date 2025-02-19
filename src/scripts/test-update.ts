import dotenv from 'dotenv';
import { processTimeSlot } from '@/lib/process';
import path from 'path';

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Debug environment variables
console.log('Environment variables loaded:', {
  NEWS_API_KEY: process.env.NEWS_API_KEY ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY ? 'Set' : 'Not set',
  CRON_SECRET: process.env.CRON_SECRET ? 'Set' : 'Not set'
});

async function testUpdate() {
  try {
    console.log('Starting test update for 10AM time slot...');
    const result = await processTimeSlot('10AM');
    console.log('Update completed successfully:', result);
  } catch (error) {
    console.error('Error during test update:', error);
    process.exit(1);
  }
}

testUpdate(); 