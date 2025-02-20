import { TimeBlock, TimeSlot, NewsItem } from './types';

const TTL = 24 * 60 * 60; // 24 hours in seconds

// Helper to check if we're in development
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

// Helper to check if we have KV config
const hasKVConfig = import.meta.env?.VITE_KV_REST_API_URL && import.meta.env?.VITE_KV_REST_API_TOKEN;

function getMockStorageKey(timeSlot: TimeSlot): string {
  return `news_${timeSlot}.json`;
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

  if (!hasKVConfig) {
    console.log('Using localStorage for storage (no KV config)');
    try {
      localStorage.setItem(getMockStorageKey(timeSlot), JSON.stringify(timeBlock));
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
      throw error;
    }
    return;
  }

  // Use Vercel KV
  console.log('Using Vercel KV for storage');
  const { kv } = await import('@vercel/kv');
  await kv.set(`news:${timeSlot}`, JSON.stringify(timeBlock), { ex: TTL });
}

export async function getTimeBlock(timeSlot: TimeSlot): Promise<TimeBlock | null> {
  if (!hasKVConfig) {
    console.log('Using localStorage for retrieval (no KV config)');
    try {
      const data = localStorage.getItem(getMockStorageKey(timeSlot));
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }

  // Use Vercel KV
  console.log('Using Vercel KV for retrieval');
  const { kv } = await import('@vercel/kv');
  const data = await kv.get(`news:${timeSlot}`);
  if (!data) return null;
  
  return typeof data === 'string' ? JSON.parse(data) : data;
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