import { NewsItem, TimeSlot, TimeBlock } from './types';
import OpenAI from 'openai';

// In production, API requests will be made to the same domain
const API_URL = import.meta.env.PROD ? '' : import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('Environment check:', {
  hasNewsApiKey: !!import.meta.env.VITE_NEWS_API_KEY,
  hasOpenAiKey: !!import.meta.env.VITE_OPENAI_API_KEY,
  apiUrl: API_URL,
  isProd: import.meta.env.PROD
});

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const CATEGORIES = ['tech', 'finance', 'science', 'health'] as const;

// Function to get the API URL
function getApiUrl() {
  // Try to get the URL from environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Default to port 3001, but try subsequent ports if needed
  for (let port = 3001; port <= 3010; port++) {
    try {
      fetch(`http://localhost:${port}/api/health`).then(() => {
        return `http://localhost:${port}`;
      });
    } catch {}
  }
  
  // Fallback to default
  return 'http://localhost:3001';
}

// Cache to store fetched news by time slot
const newsCache = new Map<TimeSlot, TimeBlock>();

async function fetchNewsForCategory(category: string): Promise<any[]> {
  console.log(`Fetching news for category: ${category}`);
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=1&apiKey=${import.meta.env.VITE_NEWS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI Error: ${data.message}`);
    }
    
    console.log(`Received ${data.articles?.length || 0} articles for ${category}`);
    return data.articles || [];
  } catch (error) {
    console.error(`Error fetching ${category} news:`, error);
    throw error;
  }
}

async function expandArticleWithGPT(article: any): Promise<string> {
  console.log('Expanding article with GPT:', article.title);
  try {
    const prompt = `
      Write a short, impactful news article about this topic in 3-4 brief paragraphs (about 150 words total).
      Focus on the key facts and maintain a clear, direct journalistic style.
      Keep each paragraph to 2-3 sentences maximum.

      Headline: ${article.title}
      Initial Content: ${article.description} ${article.content || ''}
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo-preview",
      temperature: 0.7,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content || article.description;
    console.log('Successfully expanded article');
    return content;
  } catch (error) {
    console.error('Error expanding article with GPT:', error);
    // Fallback to original content if GPT fails
    return `${article.description}\n\n${article.content || ''}`.split('[+')[0];
  }
}

export async function getNewsForTimeSlot(timeSlot: TimeSlot): Promise<TimeBlock | null> {
  console.log(`Getting news for time slot: ${timeSlot}`);
  
  if (newsCache.has(timeSlot)) {
    console.log('Returning cached news');
    return newsCache.get(timeSlot)!;
  }

  try {
    const url = `${API_URL}/api/news?timeSlot=${timeSlot}`;
    console.log(`Fetching news from ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url
      });
      throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
    }
    
    const timeBlock = await response.json();
    console.log('Received time block:', timeBlock);
    newsCache.set(timeSlot, timeBlock);
    return timeBlock;
  } catch (error) {
    console.error('Error fetching news:', error);
    return null;
  }
} 