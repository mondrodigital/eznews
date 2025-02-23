export type Category = 'ai' | 'robotics' | 'biotech';

export type TimeSlot = '10AM' | '3PM' | '8PM';

export interface NewsItem {
  id: string;
  timestamp: Date;
  category: Category;
  headline: string;
  content: string;
  source: string;
  image: string;
  originalUrl: string;
}

export interface TimeBlock {
  time: TimeSlot;
  date: string;
  stories: NewsItem[];
}

export const TIME_SLOTS = ['10AM', '3PM', '8PM'] as const;

// Mapping categories to NewsAPI topics
export const CATEGORY_MAPPING = {
  tech: 'technology',
  finance: 'business',
  science: 'science',
  health: 'health'
} as const; 