import { TimeBlock, TimeSlot, NewsItem } from './types';
import fs from 'fs';
import path from 'path';

const TTL = 24 * 60 * 60; // 24 hours in seconds

// Helper to check if we're in Node.js environment
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Helper to check if we're in development
const isDev = isNode || (typeof import.meta !== 'undefined' && import.meta.env?.DEV);

// Helper to check if we have KV config
const hasKVConfig = !isNode && import.meta.env?.VITE_KV_REST_API_URL && import.meta.env?.VITE_KV_REST_API_TOKEN;

// Mock storage directory for Node.js environment
const MOCK_STORAGE_DIR = '.mock-storage';

// Ensure mock storage directory exists in Node.js environment
if (isNode && isDev) {
  try {
    if (!fs.existsSync(MOCK_STORAGE_DIR)) {
      fs.mkdirSync(MOCK_STORAGE_DIR);
    }
  } catch (error) {
    console.error('Failed to create mock storage directory:', error);
  }
}

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

  // Use file system for Node.js development
  if (isNode && isDev) {
    console.log('Using file system for Node.js development');
    await fs.promises.writeFile(
      `.mock-storage/${getMockStorageKey(timeSlot)}`,
      JSON.stringify(timeBlock, null, 2)
    );
    return;
  }

  // Use localStorage for browser development
  if (isDev && !hasKVConfig) {
    console.log('Using localStorage for browser development');
    try {
      localStorage.setItem(getMockStorageKey(timeSlot), JSON.stringify(timeBlock));
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
      throw error;
    }
    return;
  }

  // Use Vercel KV in production
  console.log('Using Vercel KV for storage');
  const { kv } = await import('@vercel/kv');
  await kv.set(`news:${timeSlot}`, JSON.stringify(timeBlock), { ex: TTL });
}

export async function getTimeBlock(timeSlot: TimeSlot): Promise<TimeBlock | null> {
  // Use file system for Node.js development
  if (isNode && isDev) {
    console.log('Using file system for Node.js development');
    try {
      const data = await fs.promises.readFile(
        `.mock-storage/${getMockStorageKey(timeSlot)}`,
        'utf-8'
      );
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  // Use localStorage for browser development
  if (isDev && !hasKVConfig) {
    console.log('Using localStorage for browser development');
    try {
      // In browser development, fetch from .mock-storage directory
      const response = await fetch(`/.mock-storage/${getMockStorageKey(timeSlot)}`);
      if (!response.ok) {
        console.error(`Failed to fetch from .mock-storage: ${response.status} ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      console.log('Fetched data:', data);
      return data;
    } catch (error) {
      console.error('Failed to read from .mock-storage:', error);
      return null;
    }
  }

  // Use Vercel KV in production
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