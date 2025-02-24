import { config } from 'dotenv';
import { resolve } from 'path';
import { TimeSlot } from '../lib/types';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

// Use Vercel URL in production, localhost in development
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://eznews-orcin.vercel.app'
  : 'http://localhost:3000';

async function fetchNewsForTimeSlot(timeSlot: TimeSlot) {
  console.log(`\nFetching news for ${timeSlot}...`);
  const response = await fetch(`${API_URL}/api/news?timeSlot=${timeSlot}&force=true`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${timeSlot} news: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

async function generateReport() {
  console.log('Generating full day news report from Vercel deployment...\n');
  console.log('API URL:', API_URL);
  
  const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
  
  for (const timeSlot of timeSlots) {
    try {
      const data = await fetchNewsForTimeSlot(timeSlot);
      
      console.log(`\n=== ${timeSlot} News ===`);
      console.log('Date:', data.date);
      console.log('Number of stories:', data.stories.length);
      
      // Group stories by category
      const storiesByCategory = data.stories.reduce((acc: any, story: any) => {
        acc[story.category] = acc[story.category] || [];
        acc[story.category].push(story);
        return acc;
      }, {});
      
      // Display stories by category
      Object.entries(storiesByCategory).forEach(([category, stories]: [string, any]) => {
        console.log(`\n[${category.toUpperCase()}]`);
        stories.forEach((story: any) => {
          console.log('\nHeadline:', story.headline);
          console.log('Source:', story.source);
          console.log('Content:', story.content.substring(0, 150) + '...');
          console.log('URL:', story.originalUrl);
        });
      });
      
      console.log('\n' + '='.repeat(50));
    } catch (error) {
      console.error(`Error fetching ${timeSlot} news:`, error);
    }
  }
}

// Run the report
generateReport(); 