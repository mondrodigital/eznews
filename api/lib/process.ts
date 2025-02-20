import { v4 as uuidv4 } from 'uuid';
import { NewsItem, NewsCategory, TimeSlot, CATEGORIES } from './types';
import { fetchNewsForCategory } from './news';
import { selectMostIntriguingArticle, rewriteArticle } from './gpt';
import { storeTimeBlock } from './storage';

export async function processCategory(category: NewsCategory): Promise<NewsItem> {
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
  
  // Use the article's image directly
  const image = article.urlToImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80';
  
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