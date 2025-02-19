import dotenv from 'dotenv';
import { processTimeSlot } from '../src/lib/process';

// Load environment variables
dotenv.config();

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