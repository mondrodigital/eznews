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
  hasOpenAiKey: !!OPENAI_API_KEY
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const CATEGORIES = ['tech', 'finance', 'science', 'health'] as const;

async function fetchAndProcessNews(category: string) {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not configured');
  }

  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=5&apiKey=${NEWS_API_KEY}`,
    { signal: AbortSignal.timeout(9000) }
  );

  if (!response.ok) {
    throw new Error(`News API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.articles?.length) {
    console.log(`No articles found for category: ${category}`);
    return [];
  }

  // Process each article with OpenAI
  const processedArticles = await Promise.all(
    data.articles.map(async (article: any) => {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that processes news articles. Take the article and rewrite it in a clear, engaging style while preserving all key information. Format with paragraphs separated by newlines."
            },
            {
              role: "user",
              content: article.content || article.description || ""
            }
          ],
          max_tokens: 250,
          temperature: 0.7,
        });

        return {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(article.publishedAt),
          category,
          headline: article.title,
          content: completion.choices[0]?.message?.content || article.content || article.description,
          source: article.source.name,
          image: article.urlToImage || `https://placehold.co/600x400/2563eb/ffffff?text=${category}+News`,
          originalUrl: article.url
        };
      } catch (error) {
        console.error('Error processing article with OpenAI:', error);
        return null;
      }
    })
  );

  return processedArticles.filter(article => article !== null);
}

function getCacheKey(timeSlot: string): string {
  const date = new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'numeric', 
    year: '2-digit'
  }).replace(/\//g, '-');
  return `news:${date}:${timeSlot}`;
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

// Export the API handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    if (!timeBlock) {
      console.log('No cached data found, fetching fresh news');
      // Fetch news for each category
      const allStories = await Promise.all(
        CATEGORIES.map(category => fetchAndProcessNews(category))
      );

      // Combine all stories
      const stories = allStories.flat();

      timeBlock = {
        time: timeSlot,
        date: new Date().toLocaleDateString('en-US', { 
          day: 'numeric', 
          month: 'numeric', 
          year: '2-digit'
        }).replace(/\//g, ' '),
        stories
      };
      
      // Cache the data
      setCachedData(cacheKey, timeBlock);
    } else {
      console.log('Returning cached data');
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