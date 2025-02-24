import { VercelRequest, VercelResponse } from '@vercel/node';
import { TimeSlot } from './types';
import { fetchDailyNews } from './lib/news';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({
        status: 'error',
        error: 'Unauthorized'
      });
    }

    console.log('Starting daily news fetch...');
    
    // Fetch news for all time slots
    const stories = await fetchDailyNews();
    
    console.log(`Successfully fetched ${stories.length} stories`);

    return res.status(200).json({
      status: 'success',
      message: 'Daily news fetch completed',
      storiesCount: stories.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron Error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 