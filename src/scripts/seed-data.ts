import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { Story } from '../lib/types';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const testStories: Story[] = [
  {
    id: '1',
    timestamp: new Date(),
    category: 'tech',
    headline: 'New AI Breakthrough in Quantum Computing',
    content: 'Scientists have achieved a major breakthrough in quantum computing using AI algorithms.',
    source: 'TechNews',
    image: 'https://placehold.co/600x400?text=Tech+News',
    originalUrl: 'https://example.com/tech-news'
  },
  {
    id: '2',
    timestamp: new Date(),
    category: 'finance',
    headline: 'Global Markets React to Economic Policy Changes',
    content: 'Markets worldwide show positive trends following new economic policies.',
    source: 'FinanceDaily',
    image: 'https://placehold.co/600x400?text=Finance+News',
    originalUrl: 'https://example.com/finance-news'
  },
  {
    id: '3',
    timestamp: new Date(),
    category: 'science',
    headline: 'Mars Mission Reveals Groundbreaking Discovery',
    content: 'NASA announces significant findings from the latest Mars rover mission.',
    source: 'ScienceToday',
    image: 'https://placehold.co/600x400?text=Science+News',
    originalUrl: 'https://example.com/science-news'
  },
  {
    id: '4',
    timestamp: new Date(),
    category: 'health',
    headline: 'New Research Shows Promise in Cancer Treatment',
    content: 'Clinical trials reveal promising results in targeted cancer therapy.',
    source: 'HealthNews',
    image: 'https://placehold.co/600x400?text=Health+News',
    originalUrl: 'https://example.com/health-news'
  },
  {
    id: '5',
    timestamp: new Date(),
    category: 'ai',
    headline: 'AI Models Show Human-like Understanding',
    content: 'Latest AI models demonstrate unprecedented capabilities in natural language processing.',
    source: 'AIWeekly',
    image: 'https://placehold.co/600x400?text=AI+News',
    originalUrl: 'https://example.com/ai-news'
  }
];

async function seedTestData() {
  console.log('Seeding test data to Supabase...');

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const key = `daily_news_${today}`;

    console.log('Writing test stories to Supabase...');
    const { error: writeError } = await supabase
      .from('news_cache')
      .upsert({
        key,
        data: { stories: testStories },
        created_at: new Date().toISOString()
      });

    if (writeError) {
      throw writeError;
    }

    console.log('✅ Test data seeded successfully');
    
    // Verify the data was written
    const { data: verifyData, error: verifyError } = await supabase
      .from('news_cache')
      .select('*')
      .eq('key', key)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log('\nVerified data in Supabase:');
    console.log(`Key: ${verifyData.key}`);
    console.log(`Stories count: ${verifyData.data.stories.length}`);
    console.log('First story:', verifyData.data.stories[0].headline);

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

seedTestData(); 