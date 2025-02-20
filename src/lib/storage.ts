import { TimeBlock, TimeSlot, NewsItem } from './types';
import Redis from 'ioredis';

const TTL = 24 * 60 * 60; // 24 hours in seconds

// Initialize Redis client
let redisClient: Redis | null = null;

// Helper to get environment variables in both Node.js and browser
function getEnvVar(key: string): string | undefined {
  try {
    // In browser (client-side)
    if (typeof window !== 'undefined') {
      return (import.meta.env as any)[`VITE_${key}`];
    }
    // In Node.js (server-side)
    return process?.env?.[key];
  } catch {
    return undefined;
  }
}

function getRedisClient() {
  if (!redisClient) {
    const redisUrl = getEnvVar('REDIS_URL');
    if (!redisUrl) {
      throw new Error('Redis URL not found in environment variables');
    }
    redisClient = new Redis(redisUrl);
  }
  return redisClient;
}

function getMockStorageKey(timeSlot: TimeSlot): string {
  return `news:${timeSlot}`;
}

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

  try {
    const redis = getRedisClient();
    const key = getMockStorageKey(timeSlot);
    await redis.set(key, JSON.stringify(timeBlock), 'EX', TTL);
    console.log(`Successfully stored data for ${timeSlot}`);
  } catch (error) {
    console.error('Failed to store in Redis:', error);
    throw error;
  }
}

export async function getTimeBlock(timeSlot: TimeSlot): Promise<TimeBlock | null> {
  try {
    const redis = getRedisClient();
    const key = getMockStorageKey(timeSlot);
    const data = await redis.get(key);
    
    if (!data) {
      console.log(`No data found for ${timeSlot}`);
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read from Redis:', error);
    return null;
  }
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