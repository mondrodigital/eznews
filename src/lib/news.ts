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
  tech: [
    'technology',
    'tech startup',
    'software development',
    'digital technology',
    'tech industry',
    'emerging technology'
  ],
  finance: [
    'business finance',
    'stock market',
    'financial technology',
    'investment news',
    'venture capital',
    'startup funding'
  ],
  science: [
    'scientific discovery',
    'research breakthrough',
    'space exploration',
    'quantum computing',
    'scientific innovation',
    'research development'
  ],
  health: [
    'healthcare innovation',
    'medical technology',
    'health research',
    'digital health',
    'medical breakthrough',
    'healthcare startup'
  ],
  ai: [
    'artificial intelligence',
    'machine learning',
    'GPT AI',
    'OpenAI',
    'DeepMind',
    'AI innovation'
  ]
};

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 2); // Get news from the last 2 days
  
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0]
  };
}

export async function fetchNews(): Promise<NewsAPIArticle[]> {
  try {
    const dates = getDateRange();
    
    // Fetch news for each category in parallel
    const categoryPromises = Object.entries(CATEGORY_QUERIES).map(async ([category, queries]) => {
      // Use the first query as main search term, others as optional
      const mainQuery = queries[0];
      const optionalQueries = queries.slice(1).join(' OR ');
      
      const url = new URL('https://newsapi.org/v2/everything');
      url.searchParams.append('apiKey', import.meta.env.VITE_NEWS_API_KEY);
      url.searchParams.append('q', `"${mainQuery}" ${optionalQueries}`);
      url.searchParams.append('language', 'en');
      url.searchParams.append('sortBy', 'publishedAt');
      url.searchParams.append('pageSize', '5'); // Get 5 stories per category
      url.searchParams.append('from', dates.from);
      url.searchParams.append('to', dates.to);
      
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
      tech: articles.filter(a => a.category === 'tech').length,
      finance: articles.filter(a => a.category === 'finance').length,
      science: articles.filter(a => a.category === 'science').length,
      health: articles.filter(a => a.category === 'health').length,
      ai: articles.filter(a => a.category === 'ai').length,
      dateRange: dates
    });

    return articles;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
} 