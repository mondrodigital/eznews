import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import OpenAI from 'openai';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

console.log('Server environment check:', {
  hasNewsApiKey: !!NEWS_API_KEY,
  hasOpenAiKey: !!OPENAI_API_KEY,
  hasSupabaseConfig: !!SUPABASE_URL && !!SUPABASE_KEY
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

// Add memory cache as fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();

// Add time slot type
type TimeSlot = '10AM' | '3PM' | '8PM';

// Add function to get the current time slot
function getCurrentTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 20) return '8PM';
  if (hour >= 15) return '3PM';
  return '10AM';
}

// Add function to check if a time slot is available
function isTimeSlotAvailable(timeSlot: TimeSlot): boolean {
  const hour = new Date().getHours();
  
  switch (timeSlot) {
    case '10AM':
      return hour >= 10;
    case '3PM':
      return hour >= 15;
    case '8PM':
      return hour >= 20;
    default:
      return false;
  }
}

// Add function to get today's date key
function getTodayKey(): string {
  return new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'numeric', 
    year: '2-digit'
  }).replace(/\//g, '-');
}

// Add function to distribute articles across time slots
function distributeArticlesToTimeSlots(articles: NewsAPIArticle[]): Map<TimeSlot, NewsAPIArticle[]> {
  const distribution = new Map<TimeSlot, NewsAPIArticle[]>();
  const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
  timeSlots.forEach(slot => distribution.set(slot, []));

  // Sort articles by publishedAt
  const sortedArticles = [...articles].sort((a, b) => 
    new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  // Distribute articles evenly across time slots
  sortedArticles.forEach((article, index) => {
    const slot = timeSlots[index % timeSlots.length];
    distribution.get(slot)?.push(article);
  });

  return distribution;
}

async function fetchAndProcessDailyNews() {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    console.log('Fetching daily news');
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=30&apiKey=${NEWS_API_KEY}`;
    console.log('News API URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message);
    }

    if (!data.articles?.length) {
      return new Map();
    }

    // Group articles by category first
    const articlesByCategory = new Map();
    CATEGORIES.forEach(category => articlesByCategory.set(category, []));

    data.articles.forEach((article: NewsAPIArticle) => {
      const category = determineCategory(article);
      if (category) {
        articlesByCategory.get(category).push(article);
      }
    });

    // Process each category's articles and distribute them across time slots
    const processedArticles = await Promise.all(
      Array.from(articlesByCategory.entries()).map(async ([category, articles]) => {
        const processed = await Promise.all(
          articles.slice(0, 3).map(async (article: NewsAPIArticle) => {
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
        return processed;
      })
    );

    // Flatten and distribute across time slots
    const allProcessedArticles = processedArticles.flat();
    const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
    const articlesPerSlot = Math.ceil(allProcessedArticles.length / timeSlots.length);
    
    const distributedArticles = new Map<TimeSlot, any[]>();
    timeSlots.forEach((slot, index) => {
      const start = index * articlesPerSlot;
      const slotArticles = allProcessedArticles.slice(start, start + articlesPerSlot);
      distributedArticles.set(slot, slotArticles.map(article => ({
        ...article,
        timeSlot: slot
      })));
    });

    return distributedArticles;
  } catch (error) {
    console.error('Error fetching daily news:', error);
    throw error;
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

async function getCachedData(key: string) {
  try {
    // Try Supabase first
    if (supabase) {
      const { data, error } = await supabase
        .from('news_cache')
        .select('data, created_at')
        .eq('key', key)
        .single();

      if (error) {
        console.error('Error reading from Supabase:', error);
        // Fall back to memory cache
        return getMemoryCachedData(key);
      }

      if (!data) return null;

      // Check if cache is expired (24 hours)
      const created = new Date(data.created_at);
      const now = new Date();
      if ((now.getTime() - created.getTime()) > (CACHE_TTL * 1000)) {
        // Delete expired cache
        await supabase.from('news_cache').delete().eq('key', key);
        return null;
      }

      return data.data;
    }

    // If no Supabase, use memory cache
    return getMemoryCachedData(key);
  } catch (error) {
    console.error('Error reading from Supabase:', error);
    // Fall back to memory cache
    return getMemoryCachedData(key);
  }
}

function getMemoryCachedData(key: string) {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  // Check if cache is expired
  if (Date.now() - entry.timestamp > CACHE_TTL * 1000) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

async function setCachedData(key: string, data: any) {
  try {
    // Try to cache in Supabase
    if (supabase) {
      // Delete any existing cache for this key
      await supabase.from('news_cache').delete().eq('key', key);

      // Insert new cache data
      const { error } = await supabase.from('news_cache').insert({
        key,
        data,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error writing to Supabase:', error);
        // Fall back to memory cache
        setMemoryCachedData(key, data);
      }
    } else {
      // If no Supabase, use memory cache
      setMemoryCachedData(key, data);
    }
  } catch (error) {
    console.error('Error writing to Supabase:', error);
    // Fall back to memory cache
    setMemoryCachedData(key, data);
  }
}

function setMemoryCachedData(key: string, data: any) {
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Update the handler to use the new daily news system
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
    return res.status(405).json({ 
      error: 'Method not allowed',
      status: 'error',
      stories: [] 
    });
  }

  try {
    const { timeSlot } = req.query;
    if (!timeSlot || !['10AM', '3PM', '8PM'].includes(timeSlot as string)) {
      return res.status(400).json({ 
        error: 'Valid time slot is required (10AM, 3PM, or 8PM)',
        status: 'error',
        stories: [] 
      });
    }

    const todayKey = getTodayKey();
    const cacheKey = `news:${todayKey}`;
    
    // Try to get today's news from cache
    let dailyNews = await getCachedData(cacheKey);

    if (!dailyNews) {
      console.log('No cached news found for today, fetching fresh news');
      // Fetch and process all news for today
      const distributedArticles = await fetchAndProcessDailyNews();
      
      dailyNews = {
        date: todayKey,
        articles: Object.fromEntries(distributedArticles)
      };
      
      // Cache the daily news
      await setCachedData(cacheKey, dailyNews);
    }

    // Check if the requested time slot is available
    if (!isTimeSlotAvailable(timeSlot as TimeSlot)) {
      return res.json({
        time: timeSlot,
        date: todayKey.replace(/-/g, ' '),
        stories: [],
        status: 'success',
        message: `News for ${timeSlot} is not available yet`
      });
    }

    // Return the news for the requested time slot
    return res.json({
      time: timeSlot,
      date: todayKey.replace(/-/g, ' '),
      stories: dailyNews.articles[timeSlot as TimeSlot] || [],
      status: 'success'
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch news',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
      stories: [],
      time: req.query.timeSlot,
      date: getTodayKey().replace(/-/g, ' ')
    });
  }
} 