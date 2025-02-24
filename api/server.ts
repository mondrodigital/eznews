import express from 'express';
import cors from 'cors';
import { Category, CATEGORIES, TimeSlot, Story } from './types';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Verify required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    env: {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_ANON_KEY
    }
  });
});

// News endpoint
app.get('/api/news', async (req, res) => {
  try {
    const timeSlot = req.query.timeSlot as TimeSlot;
    
    if (!timeSlot || !['10AM', '3PM', '8PM'].includes(timeSlot)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid time slot'
      });
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const key = `daily_news_${today}`;

    // Try to get from Supabase first
    const { data: cacheData, error: cacheError } = await supabase
      .from('news_cache')
      .select('data')
      .eq('key', key)
      .single();

    if (cacheError) {
      console.log('No cached news found:', cacheError.message);
      return res.status(404).json({
        status: 'error',
        error: 'No news available'
      });
    }

    const stories = cacheData.data.stories || [];
    
    // Get a subset of stories based on time slot
    const storiesPerSlot = Math.ceil(stories.length / 3);
    let timeSlotStories: Story[] = [];
    
    switch (timeSlot) {
      case '10AM':
        timeSlotStories = stories.slice(0, storiesPerSlot);
        break;
      case '3PM':
        timeSlotStories = stories.slice(storiesPerSlot, storiesPerSlot * 2);
        break;
      case '8PM':
        timeSlotStories = stories.slice(storiesPerSlot * 2);
        break;
    }

    res.json({
      status: 'success',
      timeSlot,
      date: new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: '2-digit'
      }).replace(/\//g, ' '),
      stories: timeSlotStories
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
  console.log('Environment check:', {
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_ANON_KEY
  });
}); 