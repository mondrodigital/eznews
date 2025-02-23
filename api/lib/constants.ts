import { Category } from '../types';

// Define search queries for each category
export const CATEGORY_QUERIES: Record<Category, string[]> = {
  tech: [
    'technology innovation',
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
    'AI technology',
    'neural networks',
    'AI research',
    'deep learning'
  ]
}; 