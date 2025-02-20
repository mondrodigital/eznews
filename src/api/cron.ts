import { TimeSlot } from '../lib/types';

export async function handleCronUpdate(req: Request) {
  try {
    // For now, just return a success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Mock data is being used, cron updates not needed',
        results: ['10AM', '3PM', '8PM'].map(timeSlot => ({
          timeSlot,
          success: true,
          message: `Mock data available for ${timeSlot}`
        }))
      }),
      { 
        status: 200,
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