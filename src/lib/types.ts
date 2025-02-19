export interface NewsItem {
  id: string;
  timestamp: Date;
  category: string;
  headline: string;
  content: string;
  source: string;
  image: string;
  originalUrl: string;
}

export interface TimeBlock {
  time: string;
  date: string;
  stories: NewsItem[];
}

export type NewsCategory = 'tech' | 'finance' | 'science' | 'health';

export const CATEGORIES: NewsCategory[] = ['tech', 'finance', 'science', 'health'];

export const TIME_SLOTS = ['10AM', '3PM', '8PM'] as const;
export type TimeSlot = typeof TIME_SLOTS[number];

// Mapping categories to NewsAPI topics
export const CATEGORY_MAPPING = {
  tech: 'technology',
  finance: 'business',
  science: 'science',
  health: 'health'
} as const; 