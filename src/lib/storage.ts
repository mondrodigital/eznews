import { TimeBlock, TimeSlot, NewsItem } from './types';
import Redis from 'ioredis';
import { env } from './env';

const TTL = 24 * 60 * 60; // 24 hours in seconds

// Helper to determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Storage key helper
function getStorageKey(timeSlot: TimeSlot): string {
  return `news:${timeSlot}`;
}

// Browser storage implementation
const browserStorage = {
  async set(key: string, value: any, ttl?: number) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
      throw error;
    }
  },

  async get(key: string) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }
};

// Redis storage implementation
let redisClient: Redis | null = null;

function getRedisClient() {
  if (!redisClient && !isBrowser) {
    if (!env.REDIS_URL) {
      throw new Error('Redis URL not found in environment variables');
    }
    redisClient = new Redis(env.REDIS_URL);
  }
  return redisClient;
}

const redisStorage = {
  async set(key: string, value: any, ttl?: number) {
    const redis = getRedisClient();
    if (!redis) return browserStorage.set(key, value);
    
    try {
      if (ttl) {
        await redis.set(key, JSON.stringify(value), 'EX', ttl);
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Failed to store in Redis:', error);
      throw error;
    }
  },

  async get(key: string) {
    const redis = getRedisClient();
    if (!redis) return browserStorage.get(key);
    
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to read from Redis:', error);
      return null;
    }
  }
};

// Use browser storage in browser environment, Redis storage on server
const storage = isBrowser ? browserStorage : redisStorage;

export async function storeTimeBlock(timeSlot: TimeSlot, stories: NewsItem[]): Promise<void> {
  const date = new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'numeric', 
    year: '2-digit'
  }).replace(/\//g, ' ');

  const timeBlock: TimeBlock = {
    time: timeSlot,
    date,
    stories
  };

  const key = getStorageKey(timeSlot);
  await storage.set(key, timeBlock, TTL);
  console.log(`Successfully stored data for ${timeSlot}`);
}

export async function getTimeBlock(timeSlot: TimeSlot): Promise<TimeBlock | null> {
  const key = getStorageKey(timeSlot);
  const data = await storage.get(key);
  
  if (!data) {
    console.log(`No data found for ${timeSlot}`);
    return null;
  }

  return data;
}

export async function getAllAvailableTimeBlocks(): Promise<TimeBlock[]> {
  const timeBlocks: TimeBlock[] = [];
  
  for (const timeSlot of ['10AM', '3PM', '8PM'] as TimeSlot[]) {
    const block = await getTimeBlock(timeSlot);
    if (block) {
      timeBlocks.push(block);
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