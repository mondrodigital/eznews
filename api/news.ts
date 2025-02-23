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

const CATEGORIES = ['ai', 'robotics', 'biotech'] as const;

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

async function fetchAndProcessDailyNews() {
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not configured');
  }

  try {
    console.log('Fetching daily news');
    
    // Fetch news for each category in parallel
    const categoryPromises = CATEGORIES.map(async (category) => {
      const queries = getCategoryQueries(category);
      const mainQuery = queries[0];
      const optionalQueries = queries.slice(1).join(' OR ');
      
      const url = new URL('https://newsapi.org/v2/everything');
      url.searchParams.append('apiKey', NEWS_API_KEY);
      url.searchParams.append('q', `"${mainQuery}" ${optionalQueries}`);
      url.searchParams.append('language', 'en');
      url.searchParams.append('sortBy', 'publishedAt');
      url.searchParams.append('pageSize', '15'); // Get more articles per category
      
      console.log(`Fetching ${category} news with query:`, url.searchParams.get('q'));
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.status === 'error') {
        console.error(`Error fetching ${category} news:`, data.message);
        return [];
      }

      return data.articles || [];
    });

    const categoryArticles = await Promise.all(categoryPromises);
    
    // Process articles for each category
    const processedArticles = await Promise.all(
      CATEGORIES.map(async (category, index) => {
        const articles = categoryArticles[index];
        console.log(`Processing ${articles.length} articles for ${category}`);
        
        const processed = await Promise.all(
          articles.map(async (article: NewsAPIArticle) => {
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
    
    // Ensure we have 5 stories per category per time slot
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

    // Distribute 5 articles per category to each time slot
    timeSlots.forEach((slot, slotIndex) => {
      CATEGORIES.forEach(category => {
        const categoryArticles = articlesByCategory[category];
        const start = slotIndex * 5;
        const slotArticles = categoryArticles.slice(start, start + 5);
        distribution[slot].push(...slotArticles);
      });
    });

    console.log('Distribution counts:', {
      total: allProcessedArticles.length,
      '10AM': distribution['10AM'].length,
      '3PM': distribution['3PM'].length,
      '8PM': distribution['8PM'].length
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

// Helper function to get search queries for each category
function getCategoryQueries(category: Category): string[] {
  switch (category) {
    case 'ai':
      return [
        'artificial intelligence',
        'machine learning',
        'GPT AI',
        'OpenAI',
        'DeepMind',
        'Anthropic'
      ];
    case 'robotics':
      return [
        'robotics',
        'robot technology',
        'Boston Dynamics',
        'industrial robotics',
        'autonomous robots',
        'automation'
      ];
    case 'biotech':
      return [
        'biotechnology',
        'CRISPR',
        'gene editing',
        'synthetic biology',
        'biotech innovation',
        'pharmaceutical research'
      ];
  }
}

// Update the determineCategory function
function determineCategory(article: NewsAPIArticle): Category | null {
  const categoryKeywords: Record<Category, string[]> = {
    ai: [
      'artificial intelligence',
      'machine learning',
      'llm',
      'gpt',
      'deep learning',
      'neural network',
      'ai model',
      'openai',
      'anthropic',
      'deepmind',
      'large language model',
      'computer vision'
    ],
    robotics: [
      'robotics',
      'automation',
      'autonomous',
      'robot',
      'self-driving',
      'industrial automation',
      'boston dynamics',
      'manufacturing',
      'warehouse automation',
      'tesla',
      'automated',
      'drone'
    ],
    biotech: [
      'biotech',
      'biotechnology',
      'crispr',
      'gene editing',
      'drug discovery',
      'synthetic biology',
      'genomics',
      'moderna',
      'ginkgo bioworks',
      'longevity',
      'clinical trial',
      'pharmaceutical',
      'vaccine'
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
  for (const [category, keywords] of Object.entries(categoryKeywords) as [Category, string[]][]) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  return null;
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