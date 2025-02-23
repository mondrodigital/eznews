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

// Define search queries for each category
const CATEGORY_QUERIES: Record<Category, string[]> = {
  ai: [
    'artificial intelligence',
    'machine learning',
    'GPT AI',
    'OpenAI',
    'DeepMind',
    'Anthropic'
  ],
  robotics: [
    'robotics technology',
    'automation systems',
    'Boston Dynamics',
    'industrial robots',
    'autonomous robots',
    'Tesla automation'
  ],
  biotech: [
    'biotechnology',
    'CRISPR technology',
    'gene editing',
    'synthetic biology',
    'biotech research',
    'Moderna technology'
  ]
};

export async function fetchNews(): Promise<NewsAPIArticle[]> {
  try {
    // Fetch news for each category in parallel
    const categoryPromises = Object.entries(CATEGORY_QUERIES).map(async ([category, queries]) => {
      // Use the first query as main search term, others as optional
      const mainQuery = queries[0];
      const optionalQueries = queries.slice(1).join(' OR ');
      
      const url = new URL('https://newsapi.org/v2/everything');
      url.searchParams.append('apiKey', import.meta.env.VITE_NEWS_API_KEY);
      url.searchParams.append('q', `"${mainQuery}" ${optionalQueries}`);
      url.searchParams.append('language', 'en');
      url.searchParams.append('sortBy', 'relevancy');
      url.searchParams.append('pageSize', '10');
      
      console.log(`Fetching ${category} news with query:`, url.searchParams.get('q'));
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.status === 'error') {
        console.error(`Error fetching ${category} news:`, data.message);
        return [];
      }

      // Add category to each article
      return (data.articles || []).map((article: NewsAPIArticle) => ({
        ...article,
        category: category as Category
      }));
    });

    // Combine all results
    const allArticles = await Promise.all(categoryPromises);
    const articles = allArticles.flat();
    
    console.log('Fetched articles by category:', {
      total: articles.length,
      ai: articles.filter(a => a.category === 'ai').length,
      robotics: articles.filter(a => a.category === 'robotics').length,
      biotech: articles.filter(a => a.category === 'biotech').length
    });

    return articles;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
} 