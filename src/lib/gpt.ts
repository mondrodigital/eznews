import OpenAI from 'openai';
import { NewsAPIArticle } from './news';
import { NewsItem, NewsCategory } from './types';

// Initialize OpenAI client lazily
let openai: OpenAI;

// Helper to get environment variables in both Node.js and browser
function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[`VITE_${key}`];
  }
  return undefined;
}

function getOpenAIClient() {
  if (!openai) {
    const apiKey = getEnvVar('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey
    });
  }
  return openai;
}

const ARTICLE_SELECTION_PROMPT = `You are an expert news editor for a modern, minimalist news platform. 
Your task is to analyze the provided articles and select the most intriguing and impactful story.

Consider these factors:
1. Novelty and uniqueness of the story
2. Potential impact on readers' lives or society
3. Scientific or technological advancement
4. Cultural or social significance

From the articles provided, select the one that would most make someone want to learn more.
Your response must be valid JSON with this format:
{
  "selectedIndex": number,
  "reason": "Brief explanation of why this story is most intriguing"
}

IMPORTANT: Your response must be ONLY the JSON object, with no additional text before or after.`;

const ARTICLE_REWRITE_PROMPT = `You are a skilled news writer for a modern, minimalist news platform.
Rewrite the provided article with these guidelines:

1. Create a concise, intriguing headline that makes readers want to learn more
2. Summarize the key points in 4 short paragraphs
3. Maintain a clear, engaging style
4. Focus on facts and impact
5. Use simple language but don't oversimplify complex topics

Your response must be valid JSON with this format, where paragraphs are separated by "\\n\\n":
{
  "headline": "Your rewritten headline",
  "content": "First paragraph\\n\\nSecond paragraph\\n\\nThird paragraph\\n\\nFourth paragraph"
}

IMPORTANT: 
1. Your response must be ONLY the JSON object, with no additional text before or after
2. Use "\\n\\n" (double backslash) for paragraph breaks in the content
3. Do not use actual newlines in the JSON, keep it all on one line`;

function tryParseJSON(text: string): any {
  try {
    // Remove any potential markdown code block markers
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    // Remove any potential whitespace at the start and end
    text = text.trim();
    // Replace any actual newlines with spaces to ensure valid JSON
    text = text.replace(/\n/g, ' ');
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response:', text);
    throw error;
  }
}

export async function selectMostIntriguingArticle(articles: NewsAPIArticle[]): Promise<{
  article: NewsAPIArticle;
  reason: string;
}> {
  const articlesContext = articles.map((article, index) => (
    `Article ${index}:\nTitle: ${article.title}\nDescription: ${article.description}\nContent: ${article.content}`
  )).join('\n\n');

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: ARTICLE_SELECTION_PROMPT },
      { role: 'user', content: articlesContext }
    ],
    temperature: 0.7, // Add some creativity but not too much
    max_tokens: 500 // Limit response length
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from GPT-4');
  }

  const result = tryParseJSON(content);
  if (typeof result.selectedIndex !== 'number' || typeof result.reason !== 'string') {
    throw new Error('Invalid response format from GPT-4');
  }

  return {
    article: articles[result.selectedIndex],
    reason: result.reason
  };
}

export async function rewriteArticle(
  article: NewsAPIArticle,
  category: NewsCategory
): Promise<Pick<NewsItem, 'headline' | 'content'>> {
  const articleContext = `
Title: ${article.title}
Description: ${article.description}
Content: ${article.content}
Category: ${category}
Source: ${article.source.name}
`;

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: ARTICLE_REWRITE_PROMPT },
      { role: 'user', content: articleContext }
    ],
    temperature: 0.7, // Add some creativity but not too much
    max_tokens: 1000 // Limit response length
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from GPT-4');
  }

  const result = tryParseJSON(content);
  if (typeof result.headline !== 'string' || typeof result.content !== 'string') {
    throw new Error('Invalid response format from GPT-4');
  }

  // Convert escaped newlines back to actual newlines
  result.content = result.content.replace(/\\n/g, '\n');
  return result;
} 