import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import OpenAI from 'openai';
import { Category, CATEGORIES } from '../src/lib/types';

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

type TimeSlot = '10AM' | '3PM' | '8PM';

// Add function to get the current time slot
function getCurrentTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 20) return '8PM';
  if (hour >= 15) return '3PM';
  return '10AM';
}

// Add function to check if we're in development
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development' || !!process.env.DEV;
}

// Update the time slot availability check
function isTimeSlotAvailable(timeSlot: TimeSlot): boolean {
  // In development, all time slots are available
  if (isDevelopment()) {
    return true;
  }

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

// Update the cache key function to be more reliable
function getCacheKey(timeSlot?: string): string {
  const date = new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'numeric', 
    year: '2-digit'
  }).replace(/\//g, '-');
  
  return timeSlot ? `news:${date}:${timeSlot}` : `news:${date}`;
}

// Add memory cache as fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();

// Update the determineCategory function
function determineCategory(article: NewsAPIArticle): Category | null {
  const categoryKeywords: Record<Category, string[]> = {
    tech: [
      'technology',
      'software',
      'digital',
      'tech',
      'computing',
      'internet'
    ],
    finance: [
      'finance',
      'business',
      'market',
      'investment',
      'venture capital',
      'startup funding'
    ],
    science: [
      'science',
      'research',
      'discovery',
      'quantum',
      'space',
      'physics'
    ],
    health: [
      'health',
      'medical',
      'healthcare',
      'medicine',
      'biomedical',
      'clinical'
    ],
    ai: [
      'artificial intelligence',
      'machine learning',
      'deep learning',
      'neural network',
      'ai model',
      'gpt'
    ]
  };

  const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();

  // First try exact category matches if the article has a category
  if (article.category) {
    const normalizedCategory = article.category.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => normalizedCategory.includes(keyword))) {
        return category as Category;
      }
    }
  }

  // Then try keyword matching in the full text
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category as Category;
    }
  }

  return null;
}

// Helper function to get search queries for each category
function getCategoryQueries(category: Category): string[] {
  switch (category) {
    case 'tech':
      return [
        'technology innovation',
        'tech startup',
        'software development',
        'digital technology',
        'tech industry',
        'emerging technology'
      ];
    case 'finance':
      return [
        'business finance',
        'stock market',
        'financial technology',
        'investment news',
        'venture capital',
        'startup funding'
      ];
    case 'science':
      return [
        'scientific discovery',
        'research breakthrough',
        'space exploration',
        'quantum computing',
        'scientific innovation',
        'research development'
      ];
    case 'health':
      return [
        'healthcare innovation',
        'medical technology',
        'health research',
        'digital health',
        'medical breakthrough',
        'healthcare startup'
      ];
    case 'ai':
      return [
        'artificial intelligence',
        'machine learning',
        'GPT AI',
        'OpenAI',
        'DeepMind',
        'AI innovation'
      ];
  }
}

async function fetchAndProcessDailyNews() {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    console.log('Fetching daily news');
    
    // Get date range for the last week to ensure we have enough articles
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    
    const dateRange = {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0]
    };
    
    console.log('Fetching news with date range:', dateRange);
    
    // Fetch news for each category in parallel
    const categoryPromises = CATEGORIES.map(async (category) => {
      const queries = getCategoryQueries(category);
      const queryString = queries.join(' OR ');
      
      const url = new URL('https://newsapi.org/v2/everything');
      url.searchParams.append('apiKey', NEWS_API_KEY);
      url.searchParams.append('q', queryString);
      url.searchParams.append('language', 'en');
      url.searchParams.append('sortBy', 'publishedAt');
      url.searchParams.append('pageSize', '20'); // Get enough articles for 4 per time slot
      url.searchParams.append('from', dateRange.from);
      url.searchParams.append('to', dateRange.to);
      
      console.log(`Fetching ${category} news with query:`, queryString);
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.status === 'error') {
        console.error(`Error fetching ${category} news:`, data.message);
        return [];
      }

      console.log(`Received ${data.articles?.length || 0} articles for ${category}`);
      return (data.articles || []).map((article: NewsAPIArticle) => ({
        ...article,
        category // Add category to each article
      }));
    });

    const categoryArticles = await Promise.all(categoryPromises);
    const allArticles = categoryArticles.flat();
    console.log('Total articles fetched:', allArticles.length);
    
    // Process articles for each category
    const processedArticles = await Promise.all(
      CATEGORIES.map(async (category) => {
        const articles = allArticles.filter(a => a.category === category);
        console.log(`Processing ${articles.length} articles for ${category}`);
        
        const processed = await Promise.all(
          articles.slice(0, 12).map(async (article: NewsAPIArticle) => { // Process 12 articles (4 per time slot)
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
    
    // Initialize distribution with empty arrays
    const distribution: Record<TimeSlot, any[]> = {
      '10AM': [],
      '3PM': [],
      '8PM': []
    };

    // Group articles by category
    const articlesByCategory = CATEGORIES.reduce((acc, category) => {
      acc[category] = allProcessedArticles.filter(a => a.category === category);
      return acc;
    }, {} as Record<Category, any[]>);

    // Distribute 4 articles per category to each time slot
    timeSlots.forEach((slot, slotIndex) => {
      CATEGORIES.forEach(category => {
        const categoryArticles = articlesByCategory[category];
        const start = slotIndex * 4; // 4 articles per time slot
        const end = start + 4;
        const slotArticles = categoryArticles.slice(start, end);
        distribution[slot].push(...slotArticles);
      });
    });

    // Log distribution details
    console.log('Distribution details:', {
      total: allProcessedArticles.length,
      byTimeSlot: {
        '10AM': {
          total: distribution['10AM'].length,
          byCategory: CATEGORIES.reduce((acc, cat) => {
            acc[cat] = distribution['10AM'].filter(a => a.category === cat).length;
            return acc;
          }, {} as Record<string, number>)
        },
        '3PM': {
          total: distribution['3PM'].length,
          byCategory: CATEGORIES.reduce((acc, cat) => {
            acc[cat] = distribution['3PM'].filter(a => a.category === cat).length;
            return acc;
          }, {} as Record<string, number>)
        },
        '8PM': {
          total: distribution['8PM'].length,
          byCategory: CATEGORIES.reduce((acc, cat) => {
            acc[cat] = distribution['8PM'].filter(a => a.category === cat).length;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });

    return distribution;
  } catch (error) {
    console.error('Error fetching daily news:', error);
    return {
      '10AM': [],
      '3PM': [],
      '8PM': []
    };
  }
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

// Update the handler to focus on filtering stored news
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    isDev: isDevelopment()
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
    return res.status(405).json({ 
      error: 'Method not allowed',
      status: 'error',
      stories: [] 
    });
  }

  try {
    const { timeSlot, force } = req.query;
    console.log('Request:', {
      timeSlot,
      force,
      currentHour: new Date().getHours()
    });

    if (!timeSlot || !['10AM', '3PM', '8PM'].includes(timeSlot as string)) {
      return res.status(400).json({ 
        error: 'Valid time slot is required (10AM, 3PM, or 8PM)',
        status: 'error',
        stories: [] 
      });
    }

    // Force fresh fetch of news
    console.log('Fetching fresh news...');
    const articles = await fetchAndProcessDailyNews();
    
    const dailyNews = {
      date: getTodayKey(),
      articles,
      lastUpdated: new Date().toISOString()
    };

    // Store in cache
    const cacheKey = getCacheKey();
    await setCachedData(cacheKey, dailyNews);
    console.log('Fresh news cached');

    // Return the articles for the requested time slot
    const response = {
      time: timeSlot,
      date: getTodayKey().replace(/-/g, ' '),
      stories: articles[timeSlot as TimeSlot] || [],
      status: 'success'
    };
    
    console.log('Response:', {
      time: response.time,
      date: response.date,
      storyCount: response.stories.length
    });
    
    return res.json(response);
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