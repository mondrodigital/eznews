import { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';
import OpenAI from 'openai';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('Server environment check:', {
  hasNewsApiKey: !!NEWS_API_KEY,
  hasOpenAiKey: !!OPENAI_API_KEY
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const CATEGORIES = ['tech', 'finance', 'science', 'health'] as const;

async function fetchNewsForCategory(category: string) {
  console.log(`Fetching news for category: ${category}`);
  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=1&apiKey=${NEWS_API_KEY}`
  );
  const data = await response.json();
  console.log(`Received response for ${category}:`, data);
  return data.articles || [];
}

async function expandArticleWithGPT(article: any): Promise<string> {
  console.log('Expanding article with GPT:', article.title);
  const prompt = `
    Write a short, impactful news article about this topic in 3-4 brief paragraphs (about 150 words total).
    Focus on the key facts and maintain a clear, direct journalistic style.
    Keep each paragraph to 2-3 sentences maximum.

    Headline: ${article.title}
    Initial Content: ${article.description} ${article.content || ''}
  `;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4-turbo-preview",
    temperature: 0.7,
    max_tokens: 200,
  });

  console.log('GPT response received');
  return completion.choices[0]?.message?.content || article.description;
}

// Export the API handler for Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  await new Promise((resolve, reject) => {
    cors()(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received news request:', req.query);
    const { timeSlot } = req.query;
    if (!timeSlot) {
      console.log('No time slot provided');
      return res.status(400).json({ error: 'Time slot is required' });
    }

    const newsItems = [];

    for (const category of CATEGORIES) {
      try {
        console.log(`Processing category: ${category}`);
        const articles = await fetchNewsForCategory(category);
        if (articles.length > 0) {
          const article = articles[0];
          const expandedContent = await expandArticleWithGPT(article);
          
          newsItems.push({
            id: article.url,
            timestamp: new Date(article.publishedAt),
            category,
            headline: article.title,
            content: expandedContent,
            source: article.source.name,
            image: article.urlToImage || `https://placehold.co/400x267?text=${category}+News`,
            originalUrl: article.url
          });
          console.log(`Successfully processed ${category} article`);
        } else {
          console.log(`No articles found for ${category}`);
        }
      } catch (error) {
        console.error(`Failed to process ${category} news:`, error);
      }
    }

    if (newsItems.length === 0) {
      console.log('No news items found for any category');
      return res.status(404).json({ error: 'No news items found' });
    }

    const timeBlock = {
      time: timeSlot,
      date: new Date().toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'numeric', 
        year: '2-digit'
      }).replace(/\//g, ' '),
      stories: newsItems
    };

    console.log('Sending response:', timeBlock);
    return res.json(timeBlock);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch news' });
  }
} 