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

// Add type definition at the top of the file
interface NewsAPIArticle {
  title: string;
  description?: string;
  content?: string;
  publishedAt: string;
  source: {
    name: string;
  };
  urlToImage?: string;
  url: string;
  category?: string;
}

type Category = typeof CATEGORIES[number];

async function fetchAndProcessNews(timeSlot: string) {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    console.log('Fetching news for all categories');
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${NEWS_API_KEY}`;
    console.log('News API URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    console.log('News API response:', {
      status: data.status,
      totalResults: data.totalResults,
      articleCount: data.articles?.length
    });

    if (data.status === 'error') {
      console.error('News API Error:', data.message);
      if (data.message?.includes('too many requests')) {
        // Return cached data if available, even if expired
        const cacheKey = getCacheKey(timeSlot as string);
        const cachedData = cache.get(cacheKey)?.data;
        if (cachedData) {
          console.log('Rate limited - returning cached data regardless of TTL');
          return cachedData;
        }
      }
      throw new Error(data.message);
    }
    
    if (!data.articles?.length) {
      console.log('No articles found');
      return [];
    }

    // Group articles by category
    const articlesByCategory = new Map();
    CATEGORIES.forEach(category => articlesByCategory.set(category, []));

    // Update the forEach callback
    data.articles.forEach((article: NewsAPIArticle) => {
      // Try to determine the article's category
      const category = determineCategory(article);
      if (category && articlesByCategory.has(category)) {
        articlesByCategory.get(category).push(article);
      }
    });

    // Process articles for each category
    const processedArticlesByCategory = await Promise.all(
      Array.from(articlesByCategory.entries()).map(async ([category, articles]) => {
        // Take up to 3 articles per category
        const selectedArticles = articles.slice(0, 3);
        console.log(`Processing ${selectedArticles.length} articles for ${category}`);

        const processedArticles = await Promise.all(
          selectedArticles.map(async (article: any) => {
            try {
              console.log(`Processing article: ${article.title}`);
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

              const processedArticle = {
                id: Math.random().toString(36).substring(7),
                timestamp: new Date(article.publishedAt),
                category,
                headline: article.title,
                content: completion.choices[0]?.message?.content || article.content || article.description,
                source: article.source.name,
                image: article.urlToImage || `https://placehold.co/600x400/2563eb/ffffff?text=${category}+News`,
                originalUrl: article.url
              };
              console.log(`Successfully processed article: ${processedArticle.headline}`);
              return processedArticle;
            } catch (error) {
              console.error('Error processing article with OpenAI:', error);
              return {
                id: Math.random().toString(36).substring(7),
                timestamp: new Date(article.publishedAt),
                category,
                headline: article.title,
                content: article.description || article.content || '',
                source: article.source.name,
                image: article.urlToImage || `https://placehold.co/600x400/2563eb/ffffff?text=${category}+News`,
                originalUrl: article.url
              };
            }
          })
        );

        return processedArticles;
      })
    );

    // Flatten the array of arrays
    return processedArticlesByCategory.flat();
  } catch (error) {
    console.error('Error in fetchAndProcessNews:', error);
    return [];
  }
}

// Update the determineCategory function
function determineCategory(article: NewsAPIArticle): Category | null {
  const categoryKeywords: Record<Category, string[]> = {
    tech: ['technology', 'tech', 'software', 'ai', 'digital', 'cyber', 'computing'],
    finance: ['finance', 'business', 'economy', 'market', 'stock', 'banking'],
    science: ['science', 'research', 'study', 'discovery', 'space', 'physics'],
    health: ['health', 'medical', 'medicine', 'healthcare', 'disease', 'treatment']
  };

  const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords) as [Category, string[]][]) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  // If no category is found, try to use the article's category if available
  if (article.category && CATEGORIES.includes(article.category as Category)) {
    return article.category as Category;
  }

  return null;
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
      // Fetch and process news
      const stories = await fetchAndProcessNews(timeSlot as string);

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