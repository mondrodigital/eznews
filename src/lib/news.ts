import { NewsItem, NewsCategory, CATEGORY_MAPPING } from './types';
import { clientEnv } from './client-env';

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

export async function fetchNewsForCategory(category: NewsCategory): Promise<NewsAPIArticle[]> {
  if (!clientEnv.NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY is not set');
  }

  const apiUrl = new URL('https://newsapi.org/v2/top-headlines');
  apiUrl.searchParams.append('apiKey', clientEnv.NEWS_API_KEY);
  apiUrl.searchParams.append('category', CATEGORY_MAPPING[category]);
  apiUrl.searchParams.append('language', 'en');
  apiUrl.searchParams.append('pageSize', '10');

  const response = await fetch(apiUrl.toString());
  const data: NewsAPIResponse = await response.json();

  if (data.status !== 'ok') {
    throw new Error(`NewsAPI error: ${data.status}`);
  }

  return data.articles;
} 