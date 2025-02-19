import { NewsItem, NewsCategory, CATEGORY_MAPPING } from './types';

export interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  content: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

// Helper to get environment variables in both Node.js and browser
function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[`VITE_${key}`];
  }
  return undefined;
}

export async function fetchNewsForCategory(category: NewsCategory): Promise<NewsAPIArticle[]> {
  const apiKey = getEnvVar('NEWS_API_KEY');
  if (!apiKey) {
    throw new Error('NEWS_API_KEY is not set');
  }

  const apiUrl = new URL('https://newsapi.org/v2/top-headlines');
  apiUrl.searchParams.append('apiKey', apiKey);
  apiUrl.searchParams.append('category', CATEGORY_MAPPING[category]);
  apiUrl.searchParams.append('language', 'en');
  apiUrl.searchParams.append('pageSize', '10'); // Fetch 10 articles to give GPT-4 more options to choose from

  const response = await fetch(apiUrl.toString());
  const data: NewsAPIResponse = await response.json();

  if (data.status !== 'ok') {
    throw new Error(`NewsAPI error: ${data.status}`);
  }

  return data.articles;
}

// This will be used to get a relevant image from Unsplash if the article doesn't have one
export async function getUnsplashImage(query: string): Promise<string> {
  const apiKey = getEnvVar('UNSPLASH_ACCESS_KEY');
  if (!apiKey) {
    throw new Error('UNSPLASH_ACCESS_KEY is not set');
  }

  const apiUrl = new URL('https://api.unsplash.com/search/photos');
  apiUrl.searchParams.append('client_id', apiKey);
  apiUrl.searchParams.append('query', query);
  apiUrl.searchParams.append('per_page', '1');

  const response = await fetch(apiUrl.toString());
  const data = await response.json();

  if (!data.results?.[0]?.urls?.regular) {
    throw new Error('No image found on Unsplash');
  }

  return data.results[0].urls.regular;
} 