import { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';
import OpenAI from 'openai';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// In-memory cache
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

console.log('Server environment check:', {
  hasNewsApiKey: !!NEWS_API_KEY,
  hasOpenAiKey: !!OPENAI_API_KEY,
  newsApiKeyLength: NEWS_API_KEY?.length,
  openaiKeyLength: OPENAI_API_KEY?.length
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const CATEGORIES = ['tech', 'finance', 'science', 'health'] as const;

function getCacheKey(timeSlot: string): string {
  const date = new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'numeric', 
    year: '2-digit'
  }).replace(/\//g, '-');
  return `news:${date}:${timeSlot}`;
}

function shouldRefreshCache(timeSlot: string): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  switch(timeSlot) {
    case '10AM':
      return (hour === 10 && minutes <= 5);
    case '3PM':
      return (hour === 15 && minutes <= 5);
    case '8PM':
      return (hour === 20 && minutes <= 5);
    default:
      return false;
  }
}

function getCachedData(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData(key: string, data: any) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

async function fetchNewsForCategory(category: string) {
  console.log(`Fetching news for category: ${category}`);
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=1&apiKey=${NEWS_API_KEY}`;
    console.log('Fetching from URL:', url);
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mews/1.0'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NewsAPI error for ${category}:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Received response for ${category}:`, data);
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI error: ${data.message}`);
    }
    
    return data.articles || [];
  } catch (error) {
    console.error(`Error fetching ${category}:`, error);
    return [];
  }
}

async function expandArticleWithGPT(article: any): Promise<string> {
  try {
    console.log('Expanding article with GPT:', article.title);
    const prompt = `
      Write a short, impactful news article about this topic in 3-4 brief paragraphs (about 150 words total).
      Focus on the key facts and maintain a clear, direct journalistic style.
      Keep each paragraph to 2-3 sentences maximum.

      Headline: ${article.title}
      Initial Content: ${article.description || ''} ${article.content || ''}
    `.trim();

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo-preview",
      temperature: 0.7,
      max_tokens: 200
    });

    console.log('GPT response received');
    return completion.choices[0]?.message?.content || article.description || '';
  } catch (error) {
    console.error('Error expanding with GPT:', error);
    return article.description || article.content?.split('[+')[0] || '';
  }
}

async function fetchAndProcessNews(timeSlot: string) {
  // Fetch all categories in parallel
  const categoryPromises = CATEGORIES.map(async (category) => {
    try {
      const articles = await fetchNewsForCategory(category);
      if (articles.length === 0) return null;

      const article = articles[0];
      const expandedContent = await expandArticleWithGPT(article);
      
      return {
        id: article.url,
        timestamp: new Date(article.publishedAt),
        category,
        headline: article.title,
        content: expandedContent,
        source: article.source?.name || 'Unknown',
        image: article.urlToImage || `https://placehold.co/400x267?text=${category}+News`,
        originalUrl: article.url
      };
    } catch (error) {
      console.error(`Failed to process ${category}:`, error);
      return null;
    }
  });

  // Wait for all categories with a timeout
  const results = await Promise.race([
    Promise.all(categoryPromises),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), 9000))
  ]);

  const newsItems = (results as any[]).filter(Boolean);

  if (newsItems.length === 0) {
    throw new Error('No news items found');
  }

  const timeBlock = {
    time: timeSlot,
    date: new Date().toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'numeric', 
      year: '2-digit'
    }).replace(/\//g, ' '),
    stories: newsItems
  };

  // Cache the results
  const cacheKey = getCacheKey(timeSlot);
  setCachedData(cacheKey, timeBlock);

  return timeBlock;
}

// Export the API handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('API handler started', {
    method: req.method,
    query: req.query,
    headers: req.headers
  });

  // Enable CORS
  await new Promise((resolve, reject) => {
    cors()(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received news request:', req.query);
    const { timeSlot } = req.query;
    if (!timeSlot) {
      console.log('No time slot provided');
      return res.status(400).json({ error: 'Time slot is required' });
    }

    // Try to get cached data
    const cacheKey = getCacheKey(timeSlot as string);
    let timeBlock = getCachedData(cacheKey);

    // If no cached data or it's time to refresh, fetch new data
    if (!timeBlock || shouldRefreshCache(timeSlot as string)) {
      console.log('Cache miss or refresh needed, fetching new data');
      try {
        timeBlock = await fetchAndProcessNews(timeSlot as string);
      } catch (fetchError) {
        console.error('Error in fetchAndProcessNews:', fetchError);
        return res.status(500).json({ 
          error: 'Failed to fetch news',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error in fetchAndProcessNews'
        });
      }
    } else {
      console.log('Returning cached data');
    }

    if (!timeBlock) {
      return res.status(404).json({ error: 'No news available for this time slot' });
    }

    return res.json(timeBlock);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch news',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 