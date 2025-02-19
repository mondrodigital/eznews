import { processTimeSlot } from '../lib/process';
import { TimeSlot } from '../lib/types';

export async function handleCronUpdate(req: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${import.meta.env.VITE_CRON_SECRET}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Process all time slots
    const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
    const results = await Promise.all(
      timeSlots.map(async (timeSlot) => {
        try {
          await processTimeSlot(timeSlot);
          return { timeSlot, success: true };
        } catch (error) {
          console.error(`Failed to process ${timeSlot}:`, error);
          return { 
            timeSlot, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Automated update failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process update' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 