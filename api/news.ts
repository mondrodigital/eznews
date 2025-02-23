import { VercelRequest, VercelResponse } from '@vercel/node';
import { Category, CATEGORIES, TimeSlot, Story } from './types';
import { CATEGORY_QUERIES } from '../src/lib/news';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Cache for daily news
let dailyNewsCache: Story[] | null = null;
let lastFetchDate: string | null = null;

// Get today's date in YYYY-MM-DD format
function getTodayKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Check if we need to fetch fresh news
function shouldFetchFreshNews(): boolean {
  if (!lastFetchDate || lastFetchDate !== getTodayKey()) {
    return true;
  }
  return false;
}

// Fetch news for a specific category
async function fetchCategoryNews(category: Category): Promise<Story[]> {
  const queries = CATEGORY_QUERIES[category];
  if (!queries || !queries.length) {
    console.warn(`No search queries defined for category: ${category}`);
    return [];
  }

  // Randomly select a query for this category
  const query = queries[Math.floor(Math.random() * queries.length)];
  
  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEWS_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`News API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.articles.map((article: any, index: number) => ({
      id: `${category}-${index}-${Date.now()}`,
      timestamp: new Date(article.publishedAt).toISOString(),
      category,
      headline: article.title,
      content: article.description,
      source: article.source.name,
      image: article.urlToImage,
      originalUrl: article.url
    }));
  } catch (error) {
    console.error(`Error fetching news for category ${category}:`, error);
    return [];
  }
}

// Fetch all daily news
async function fetchDailyNews(): Promise<Story[]> {
  const allStories: Story[] = [];
  
  for (const category of CATEGORIES) {
    const stories = await fetchCategoryNews(category);
    allStories.push(...stories);
  }
  
  // Update cache
  dailyNewsCache = allStories;
  lastFetchDate = getTodayKey();
  
  return allStories;
}

// Distribute stories across time slots
function distributeStories(stories: Story[], timeSlot: TimeSlot): Story[] {
  // Sort stories by timestamp
  const sortedStories = [...stories].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Get a subset of stories based on time slot
  const storiesPerSlot = Math.ceil(stories.length / 3);
  switch (timeSlot) {
    case '10AM':
      return sortedStories.slice(0, storiesPerSlot);
    case '3PM':
      return sortedStories.slice(storiesPerSlot, storiesPerSlot * 2);
    case '8PM':
      return sortedStories.slice(storiesPerSlot * 2);
    default:
      return [];
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Check for API key
    if (!process.env.NEWS_API_KEY) {
      throw new Error('NEWS_API_KEY environment variable is not set');
    }

    // Validate time slot
    const timeSlot = req.query.timeSlot as TimeSlot;
    if (!timeSlot || !['10AM', '3PM', '8PM'].includes(timeSlot)) {
      res.status(400).json({ error: 'Invalid time slot' });
      return;
    }

    // Check if we need to fetch fresh news
    if (shouldFetchFreshNews()) {
      console.log('Fetching fresh daily news...');
      await fetchDailyNews();
    }

    // If we don't have cached news, fetch it
    if (!dailyNewsCache) {
      console.log('No cached news found, fetching...');
      await fetchDailyNews();
    }

    // Distribute stories for the requested time slot
    const stories = distributeStories(dailyNewsCache || [], timeSlot);

    // Return the response
    res.status(200).json({
      timeSlot,
      date: new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: '2-digit'
      }).replace(/\//g, ' '),
      stories
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 