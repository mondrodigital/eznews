import { v4 as uuidv4 } from 'uuid';
import { NewsItem, NewsCategory, TimeSlot, CATEGORIES } from './types';
import { fetchNewsForCategory, NewsAPIArticle } from './news';
import { selectMostIntriguingArticle, rewriteArticle } from './gpt';
import { storeTimeBlock } from './storage';

async function processCategory(category: NewsCategory): Promise<NewsItem> {
  console.log(`\nProcessing ${category} category...`);
  
  // Fetch articles for category
  console.log(`Fetching articles for ${category}...`);
  const articles = await fetchNewsForCategory(category);
  console.log(`Found ${articles.length} articles for ${category}`);
  
  // Select the most intriguing article
  console.log('Selecting most intriguing article...');
  const { article, reason } = await selectMostIntriguingArticle(articles);
  console.log('Selected article:', article.title);
  console.log('Selection reason:', reason);
  
  // Rewrite the article
  console.log('Rewriting article...');
  const { headline, content } = await rewriteArticle(article, category);
  
  // Use the article's image or a default placeholder
  const image = article.urlToImage || 'https://placehold.co/600x400?text=News';
  
  console.log('Processed article:', headline);
  
  return {
    id: uuidv4(),
    timestamp: new Date(),
    category,
    headline,
    content,
    source: article.source.name,
    image,
    originalUrl: article.url
  };
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
    
    const stories = await Promise.all(storiesPromises);
    console.log(`\nSuccessfully processed ${stories.length} stories`);
    
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