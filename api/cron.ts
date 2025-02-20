import { processTimeSlot } from './lib/process';
import { TimeSlot } from './lib/types';
import { serverEnv } from './lib/server-env';

export async function handleCronUpdate(req: Request) {
  try {
    // Debug environment variables and request info
    console.log('Request info:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    console.log('Environment check:', {
      REDIS_URL: serverEnv.REDIS_URL ? 'Set' : 'Not set',
      NEWS_API_KEY: serverEnv.NEWS_API_KEY ? 'Set' : 'Not set',
      OPENAI_API_KEY: serverEnv.OPENAI_API_KEY ? 'Set' : 'Not set',
      CRON_SECRET: serverEnv.CRON_SECRET ? 'Set' : 'Not set'
    });

    // Validate required environment variables
    const requiredVars = [
      'REDIS_URL',
      'NEWS_API_KEY',
      'OPENAI_API_KEY',
      'CRON_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => !serverEnv[varName as keyof typeof serverEnv]);
    
    if (missingVars.length > 0) {
      const error = new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      console.error('Environment validation failed:', error);
      throw error;
    }

    // Verify the request is authorized
    const authHeader = req.headers.get('authorization');
    const isManualTrigger = req.method === 'POST';
    
    console.log('Auth check:', {
      isManualTrigger,
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? 'Present' : 'Missing'
    });

    // For manual triggers, check the secret in the body
    if (isManualTrigger) {
      const body = await req.json();
      console.log('Manual trigger body:', {
        hasSecret: !!body.secret,
        secretMatch: body.secret === serverEnv.CRON_SECRET
      });

      if (body.secret !== serverEnv.CRON_SECRET) {
        const error = new Error('Unauthorized - Invalid secret');
        console.error('Auth failed:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // For automated cron, check the bearer token
      if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
        const error = new Error('Unauthorized - Invalid token');
        console.error('Auth failed:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
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
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
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
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process updates',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 