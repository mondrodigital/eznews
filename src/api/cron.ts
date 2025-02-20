import { processTimeSlot } from '../lib/process';
import { TimeSlot } from '../lib/types';

function getTimeSlotForHour(hour: number): TimeSlot | null {
  // Check if we're at the right time (55 minutes past the hour)
  const minutes = new Date().getMinutes();
  if (minutes !== 55) return null;

  // Map hours to time slots
  if (hour === 9) return '10AM';
  if (hour === 14) return '3PM';
  if (hour === 19) return '8PM';
  
  return null;
}

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

    // Get the current hour and determine if we should process a time slot
    const currentHour = new Date().getHours();
    const timeSlot = getTimeSlotForHour(currentHour);

    if (!timeSlot) {
      return new Response(
        JSON.stringify({ message: 'No time slot to process at this hour' }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Process the time slot
    try {
      await processTimeSlot(timeSlot);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully processed ${timeSlot} time slot`
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error(`Failed to process ${timeSlot}:`, error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          timeSlot,
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Automated update failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process update',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 