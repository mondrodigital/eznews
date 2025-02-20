import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'news-cache.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Initialize cache file if it doesn't exist
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({}));
}

export interface CacheData {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

export function getCachedData(key: string) {
  try {
    const cache: CacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    const entry = cache[key];
    
    if (!entry) return null;
    
    // Check if cache is older than 24 hours
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
      delete cache[key];
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export function setCachedData(key: string, data: any) {
  try {
    const cache: CacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export function shouldRefreshCache(timeSlot: string): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  // Refresh cache if it's within 5 minutes of the time slot
  switch(timeSlot) {
    case '10AM':
      return (hour === 10 && minutes <= 5);
    case '3PM':
      return (hour === 15 && minutes <= 5);
    case '8PM':
      return (hour === 20 && minutes <= 5);
    default:
      return false;
  }
}

export function getCacheKey(timeSlot: string) {
  const date = new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'numeric', 
    year: '2-digit'
  }).replace(/\//g, '-');
  return `news:${date}:${timeSlot}`;
} 