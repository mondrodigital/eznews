import { processTimeSlot } from '../lib/process';
import { TimeSlot } from '../lib/types';

export async function handleCronUpdate(req: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Process all time slots for the day
    const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
    const results = await Promise.all(
      timeSlots.map(async (timeSlot) => {
        try {
          console.log(`Processing ${timeSlot} time slot...`);
          await processTimeSlot(timeSlot);
          console.log(`Successfully processed ${timeSlot} time slot`);
          return { 
            timeSlot, 
            success: true,
            message: `Successfully processed ${timeSlot} time slot`
          };
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

    const allSuccessful = results.every(result => result.success);
    
    return new Response(
      JSON.stringify({ 
        success: allSuccessful,
        message: 'Completed daily news processing',
        results 
      }),
      { 
        status: allSuccessful ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Automated update failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process daily updates',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 