import { Category, CATEGORIES, Story } from '../types';
import { CATEGORY_QUERIES } from './constants';

// Fetch news for a specific category
async function fetchCategoryNews(category: Category): Promise<Story[]> {
  const queries = CATEGORY_QUERIES[category];
  if (!queries || !queries.length) {
    console.warn(`No search queries defined for category: ${category}`);
    return [];
  }

  // Randomly select a query for this category
  const query = queries[Math.floor(Math.random() * queries.length)];
  
  try {
    if (!process.env.NEWS_API_KEY) {
      throw new Error('NEWS_API_KEY is not set');
    }

    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5`,
      {
        headers: {
          'X-Api-Key': process.env.NEWS_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`News API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data.articles)) {
      console.error('Invalid response from News API:', data);
      return [];
    }

    return data.articles.map((article: any, index: number) => ({
      id: `${category}-${index}-${Date.now()}`,
      timestamp: new Date(article.publishedAt),
      category,
      headline: article.title || 'No headline available',
      content: article.description || 'No content available',
      source: article.source?.name || 'Unknown source',
      image: article.urlToImage || `https://placehold.co/600x400?text=${category}+News`,
      originalUrl: article.url || '#'
    }));
  } catch (error) {
    console.error(`Error fetching news for category ${category}:`, error);
    return [];
  }
}

// Fetch all daily news
export async function fetchDailyNews(): Promise<Story[]> {
  const allStories: Story[] = [];
  
  for (const category of CATEGORIES) {
    try {
      const stories = await fetchCategoryNews(category);
      allStories.push(...stories);
    } catch (error) {
      console.error(`Error fetching ${category} news:`, error);
    }
  }
  
  return allStories;
} 