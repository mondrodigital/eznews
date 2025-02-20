import { TimeBlock, TimeSlot, NewsItem } from './types';
import { isBrowser } from './client-env';

const TTL = 24 * 60 * 60; // 24 hours in seconds

// Storage key helper
function getStorageKey(timeSlot: TimeSlot): string {
  return `news:${timeSlot}`;
}

// Storage implementation
const storage = {
  async set(key: string, value: any) {
    if (isBrowser) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Failed to store in localStorage:', error);
      }
      return;
    }
  },

  async get(key: string): Promise<any> {
    if (isBrowser) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Failed to read from localStorage:', error);
        return null;
      }
    }
    return null;
  }
};

export async function storeTimeBlock(timeSlot: TimeSlot, stories: NewsItem[]): Promise<void> {
  const timeBlock: TimeBlock = {
    time: timeSlot,
    date: new Date().toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'numeric', 
      year: '2-digit'
    }).replace(/\//g, ' '),
    stories
  };

  const key = getStorageKey(timeSlot);
  await storage.set(key, timeBlock);
}

export async function getTimeBlock(timeSlot: TimeSlot): Promise<TimeBlock | null> {
  const key = getStorageKey(timeSlot);
  const data = await storage.get(key);
  
  if (data) {
    return data;
  }

  if (isBrowser && isTimeSlotAvailable(timeSlot)) {
    // If in browser and time slot is available but no data found, return mock data
    const mockStories = createMockStories(timeSlot);
    const mockTimeBlock: TimeBlock = {
      time: timeSlot,
      date: new Date().toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'numeric', 
        year: '2-digit'
      }).replace(/\//g, ' '),
      stories: mockStories
    };

    // Store mock data for future use
    await storage.set(key, mockTimeBlock);
    return mockTimeBlock;
  }

  return null;
}

// Mock data generator
function createMockStories(timeSlot: TimeSlot): NewsItem[] {
  return [
    {
      id: '1',
      timestamp: new Date(),
      category: 'tech',
      headline: 'AI Breakthrough in Natural Language Processing',
      content: 'Scientists have developed a new AI model that demonstrates unprecedented language understanding capabilities.\n\nThe model shows remarkable ability to process and generate human-like text while requiring significantly less computational power.\n\nEarly tests indicate potential applications in education, healthcare, and scientific research.\n\nResearchers emphasize the importance of ethical considerations in deployment.',
      source: 'Tech Daily',
      image: 'https://placehold.co/600x400?text=Tech+News',
      originalUrl: 'https://example.com/tech-news'
    },
    {
      id: '2',
      timestamp: new Date(),
      category: 'finance',
      headline: 'Global Markets Show Strong Recovery',
      content: 'Stock markets worldwide have shown remarkable resilience with a strong recovery in major indices.\n\nInvestors are showing renewed confidence in technology and renewable energy sectors.\n\nAnalysts point to improving economic indicators and positive corporate earnings.\n\nExperts suggest maintaining a diversified portfolio approach.',
      source: 'Financial Times',
      image: 'https://placehold.co/600x400?text=Finance+News',
      originalUrl: 'https://example.com/finance-news'
    }
  ];
}

export async function getAllAvailableTimeBlocks(): Promise<TimeBlock[]> {
  const timeBlocks: TimeBlock[] = [];
  
  for (const timeSlot of ['10AM', '3PM', '8PM'] as TimeSlot[]) {
    if (isTimeSlotAvailable(timeSlot)) {
      const block = await getTimeBlock(timeSlot);
      if (block) {
        timeBlocks.push(block);
      }
    }
  }
  
  return timeBlocks;
}

// Helper to check if a time slot should be available
export function isTimeSlotAvailable(timeSlot: TimeSlot): boolean {
  const now = new Date();
  const hour = now.getHours();
  
  switch (timeSlot) {
    case '10AM':
      return hour >= 10;
    case '3PM':
      return hour >= 15;
    case '8PM':
      return hour >= 20;
    default:
      return false;
  }
} 