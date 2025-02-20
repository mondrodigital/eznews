import { TimeBlock, TimeSlot, NewsItem } from './types';
import { isBrowser } from './client-env';
import Redis from 'ioredis';
import { serverEnv } from './server-env';

const TTL = 24 * 60 * 60; // 24 hours in seconds

// Storage key helper
function getStorageKey(timeSlot: TimeSlot): string {
  return `news:${timeSlot}`;
}

// Redis client management
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (isBrowser) return null;
  
  if (!redisClient && serverEnv.REDIS_URL) {
    redisClient = new Redis(serverEnv.REDIS_URL);
  }
  return redisClient;
}

// Storage implementation
const storage = {
  async set(key: string, value: any, ttl?: number) {
    if (isBrowser) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        
        // Implement TTL for localStorage
        if (ttl) {
          const expiryTime = Date.now() + (ttl * 1000);
          localStorage.setItem(`${key}:expiry`, expiryTime.toString());
        }
      } catch (error) {
        console.error('Failed to store in localStorage:', error);
      }
      return;
    }
    
    const redis = getRedisClient();
    if (redis) {
      try {
        if (ttl) {
          await redis.set(key, JSON.stringify(value), 'EX', ttl);
        } else {
          await redis.set(key, JSON.stringify(value));
        }
      } catch (error) {
        console.error('Failed to store in Redis:', error);
      }
    }
  },

  async get(key: string): Promise<any> {
    if (isBrowser) {
      try {
        // Check TTL for localStorage
        const expiryTime = localStorage.getItem(`${key}:expiry`);
        if (expiryTime) {
          if (Date.now() > parseInt(expiryTime)) {
            localStorage.removeItem(key);
            localStorage.removeItem(`${key}:expiry`);
            return null;
          }
        }
        
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Failed to read from localStorage:', error);
        return null;
      }
    }
    
    const redis = getRedisClient();
    if (redis) {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Failed to read from Redis:', error);
        return null;
      }
    }
    
    return null;
  },

  async cleanup() {
    if (isBrowser) {
      // Cleanup expired localStorage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(':expiry')) {
          const expiryTime = parseInt(localStorage.getItem(key) || '0');
          if (Date.now() > expiryTime) {
            const actualKey = key.replace(':expiry', '');
            localStorage.removeItem(actualKey);
            localStorage.removeItem(key);
          }
        }
      }
    }
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
  await storage.set(key, timeBlock, TTL);
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
    },
    {
      id: '3',
      timestamp: new Date(),
      category: 'science',
      headline: 'Breakthrough in Quantum Computing Research',
      content: 'Scientists achieve major milestone in quantum computing stability.\n\nNew technique allows qubits to maintain coherence for unprecedented durations.\n\nThis development could accelerate practical quantum computer development.\n\nResearchers predict significant implications for cryptography and drug discovery.',
      source: 'Science Today',
      image: 'https://placehold.co/600x400?text=Science+News',
      originalUrl: 'https://example.com/science-news'
    },
    {
      id: '4',
      timestamp: new Date(),
      category: 'health',
      headline: 'New Research in Preventive Medicine',
      content: 'Medical researchers identify promising preventive treatment approach.\n\nStudy shows significant reduction in common chronic condition risk factors.\n\nClinical trials demonstrate positive results with minimal side effects.\n\nExperts suggest potential for widespread public health impact.',
      source: 'Health Weekly',
      image: 'https://placehold.co/600x400?text=Health+News',
      originalUrl: 'https://example.com/health-news'
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