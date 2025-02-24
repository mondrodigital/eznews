export type Category = 'tech' | 'finance' | 'science' | 'health' | 'ai';

export const CATEGORIES = ['tech', 'finance', 'science', 'health', 'ai'] as const;

export type TimeSlot = '8AM' | '12PM' | '4PM';

export const TIME_SLOTS = ['8AM', '12PM', '4PM'] as const;

export interface Story {
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
  stories: Story[];
} 