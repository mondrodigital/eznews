import { NewsItem, Category } from './types';

export interface NewsAPIArticle {
  title: string;
  description?: string;
  content?: string;
  publishedAt: string;
  source: {
    name: string;
  };
  urlToImage?: string;
  url: string;
  category?: Category;
}

export async function fetchNews(): Promise<NewsAPIArticle[]> {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=30&apiKey=${import.meta.env.VITE_NEWS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message);
    }

    return data.articles || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
} 