import { TimeBlock, TimeSlot, NewsItem } from './types';
import { isBrowser } from './client-env';

const TTL = 24 * 60 * 60; // 24 hours in seconds
const CACHE_VERSION = Date.now(); // Use timestamp as cache version

// Storage key helper
function getStorageKey(timeSlot: TimeSlot): string {
  return `news:${CACHE_VERSION}:${timeSlot}`;
}

// Storage implementation
const storage = {
  async set(key: string, value: any, ttl?: number) {
    if (!isBrowser) return; // Only use localStorage in browser
    
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
  },

  async get(key: string): Promise<any> {
    if (!isBrowser) return null; // Only use localStorage in browser
    
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
  },

  async cleanup() {
    if (!isBrowser) return; // Only cleanup localStorage in browser
    
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
};

// Clear all news cache
export async function clearNewsCache() {
  if (!isBrowser) return;
  
  console.log('Clearing news cache...');
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('news:')) {
      keys.push(key);
    }
  }
  
  keys.forEach(key => {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}:expiry`);
  });
  
  console.log(`Cleared ${keys.length} cache entries`);
}

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
  return await storage.get(key);
}

// Helper to check if a time slot should be available
export function isTimeSlotAvailable(timeSlot: TimeSlot): boolean {
  // In development, all time slots are available
  if (import.meta.env.DEV) {
    return true;
  }
  
  const hour = new Date().getHours();
  
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