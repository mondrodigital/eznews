import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const initialPort = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('Server environment check:', {
  hasNewsApiKey: !!NEWS_API_KEY,
  hasOpenAiKey: !!OPENAI_API_KEY,
  port: initialPort
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const CATEGORIES = ['tech', 'finance', 'science', 'health'] as const;

// Health check endpoint
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

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

app.get('/api/news', async (req, res) => {
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
    res.json(timeBlock);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Try to start the server on the initial port, if busy try next available port
function startServer(port: number) {
  try {
    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      // Update the client's API URL
      process.env.VITE_API_URL = `http://localhost:${port}`;
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer(initialPort); 