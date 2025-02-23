import { v4 as uuidv4 } from 'uuid';
import { NewsItem, TimeSlot, Category } from './types';
import { NewsAPIArticle, fetchNews } from './news';
import { selectMostIntriguingArticle, rewriteArticle } from './gpt';
import { storeTimeBlock } from './storage';

const CATEGORIES: Category[] = ['tech', 'health', 'science', 'ai'];

async function processCategory(category: Category): Promise<NewsItem[]> {
  console.log(`\nProcessing ${category} category...`);
  
  // Fetch all articles
  console.log(`Fetching articles for ${category}...`);
  const articles = await fetchNews();
  const categoryArticles = articles.filter(article => article.category === category);
  console.log(`Found ${categoryArticles.length} articles for ${category}`);
  
  if (categoryArticles.length === 0) {
    throw new Error(`No articles found for category: ${category}`);
  }
  
  // Process each article in parallel
  const processedArticles = await Promise.all(
    categoryArticles.map(async (article) => {
      console.log('Processing article:', article.title);
      
      // Rewrite the article
      const { headline, content } = await rewriteArticle(article, category);
      
      // Use the article's image or a default placeholder
      const image = article.urlToImage || `https://placehold.co/600x400?text=${category}+News`;
      
      return {
        id: uuidv4(),
        timestamp: new Date(article.publishedAt),
        category,
        headline,
        content,
        source: article.source.name,
        image,
        originalUrl: article.url
      };
    })
  );
  
  console.log(`Processed ${processedArticles.length} articles for ${category}`);
  return processedArticles;
}

export async function processTimeSlot(timeSlot: TimeSlot): Promise<void> {
  try {
    console.log(`\nStarting processing for ${timeSlot}...`);
    
    // Process all categories in parallel
    const storiesPromises = CATEGORIES.map(category => 
      processCategory(category).catch(error => {
        console.error(`Error processing ${category}:`, error);
        throw error;
      })
    );
    
    const categoryStories = await Promise.all(storiesPromises);
    const stories = categoryStories.flat();
    console.log(`\nSuccessfully processed ${stories.length} stories total`);
    
    // Store the processed stories
    console.log('Storing time block...');
    await storeTimeBlock(timeSlot, stories);
    
    console.log(`Completed processing for ${timeSlot}`);
  } catch (error) {
    console.error(`Failed to process time slot ${timeSlot}:`, error);
    throw error;
  }
}

// Helper to determine the next time slot
export function getNextTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  
  if (hour < 10) return '10AM';
  if (hour < 15) return '3PM';
  if (hour < 20) return '8PM';
  return '10AM'; // Next day
}

// Helper to check if we should process for a given time
export function shouldProcess(timeSlot: TimeSlot): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  switch (timeSlot) {
    case '10AM':
      return hour === 9 && minute >= 55;
    case '3PM':
      return hour === 14 && minute >= 55;
    case '8PM':
      return hour === 19 && minute >= 55;
    default:
      return false;
  }
}

export function determineCategory(article: NewsAPIArticle): Category | null {
  const categoryKeywords: Record<Category, string[]> = {
    tech: [
      'technology',
      'software',
      'digital',
      'computing',
      'startup',
      'innovation',
      'tech industry',
      'cybersecurity',
      'internet',
      'mobile',
      'cloud computing',
      'hardware'
    ],
    science: [
      'scientific',
      'research',
      'discovery',
      'quantum',
      'space',
      'physics',
      'chemistry',
      'biology',
      'astronomy',
      'climate',
      'laboratory',
      'experiment'
    ],
    health: [
      'healthcare',
      'medical',
      'health',
      'medicine',
      'clinical',
      'patient',
      'hospital',
      'treatment',
      'disease',
      'wellness',
      'therapy',
      'diagnosis'
    ],
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
    ]
  };

  const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords) as [Category, string[]][]) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  return null;
} 