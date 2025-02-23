export * from '../../api/types';
import { Category, TimeSlot } from '../../api/types';

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

export const CATEGORIES = ['tech', 'finance', 'science', 'health', 'ai'] as const; 