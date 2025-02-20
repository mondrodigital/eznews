import { processTimeSlot } from '../lib/process';
import { TimeSlot } from '../lib/types';

export async function handleCronUpdate(req: Request) {
  try {
    // Verify the request is authorized
    const authHeader = req.headers.get('authorization');
    const isManualTrigger = req.method === 'POST';
    
    // For manual triggers, check the secret in the body
    if (isManualTrigger) {
      const body = await req.json();
      if (body.secret !== process.env.CRON_SECRET) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid secret' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // For automated cron, check the bearer token
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Process all time slots for the day
    const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
    console.log(`Starting ${isManualTrigger ? 'manual' : 'automated'} update for all time slots...`);
    
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
        message: `Completed ${isManualTrigger ? 'manual' : 'automated'} news processing`,
        results 
      }),
      { 
        status: allSuccessful ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Update failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process updates',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 