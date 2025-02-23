import { VercelRequest, VercelResponse } from '@vercel/node';
import { Category, CATEGORIES, TimeSlot, Story } from './types';
import { CATEGORY_QUERIES } from './lib/constants';

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
    if (!process.env.NEWS_API_KEY) {
      throw new Error('NEWS_API_KEY is not set');
    }

    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5`,
      {
        headers: {
          'X-Api-Key': process.env.NEWS_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`News API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data.articles)) {
      console.error('Invalid response from News API:', data);
      return [];
    }

    return data.articles.map((article: any, index: number) => ({
      id: `${category}-${index}-${Date.now()}`,
      timestamp: new Date(article.publishedAt),
      category,
      headline: article.title || 'No headline available',
      content: article.description || 'No content available',
      source: article.source?.name || 'Unknown source',
      image: article.urlToImage || `https://placehold.co/600x400?text=${category}+News`,
      originalUrl: article.url || '#'
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
    try {
      const stories = await fetchCategoryNews(category);
      allStories.push(...stories);
    } catch (error) {
      console.error(`Error fetching ${category} news:`, error);
      // Continue with other categories even if one fails
    }
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

  // Set content type to JSON
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed'
    });
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
      res.status(400).json({
        status: 'error',
        error: 'Invalid time slot'
      });
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

    // Ensure we have news to distribute
    if (!dailyNewsCache || dailyNewsCache.length === 0) {
      res.status(500).json({
        status: 'error',
        error: 'No news available'
      });
      return;
    }

    // Distribute stories for the requested time slot
    const stories = distributeStories(dailyNewsCache, timeSlot);

    // Format timestamps to ensure they're serializable
    const formattedStories = stories.map(story => ({
      ...story,
      timestamp: story.timestamp.toISOString()
    }));

    // Return the response
    res.status(200).json({
      status: 'success',
      timeSlot,
      date: new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: '2-digit'
      }).replace(/\//g, ' '),
      stories: formattedStories
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 