import { TimeBlock, TimeSlot, NewsItem } from './types';
import { isBrowser } from './client-env';

const TTL = 24 * 60 * 60; // 24 hours in seconds

// Storage key helper
function getStorageKey(timeSlot: TimeSlot): string {
  return `news:${timeSlot}`;
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

// Mock data generator
export function createMockStories(timeSlot: TimeSlot): NewsItem[] {
  return [
    {
      id: '1',
      timestamp: new Date(),
      category: 'tech',
      headline: 'Revolutionary AI Model Achieves Human-Level Understanding',
      content: 'A groundbreaking artificial intelligence model has demonstrated unprecedented capabilities in natural language understanding and generation.\n\nResearchers at leading tech institutions have developed a neural network that can process and respond to complex queries with human-like comprehension and nuance. The system shows remarkable ability to understand context and maintain coherent, multi-turn conversations.\n\nExperts suggest this advancement could revolutionize fields from healthcare to education, while emphasizing the importance of ethical deployment and careful consideration of societal impacts.',
      source: 'TechCrunch',
      image: 'https://placehold.co/600x400/2563eb/ffffff?text=Tech+News',
      originalUrl: 'https://example.com/tech-news'
    },
    {
      id: '2',
      category: 'finance',
      timestamp: new Date(),
      headline: 'Global Markets Rally as Tech Sector Leads Recovery',
      content: 'Stock markets worldwide have surged, with technology companies leading a remarkable recovery in global equities.\n\nInvestors are showing renewed confidence in growth stocks, particularly in artificial intelligence and semiconductor sectors. Major indices have reached new highs, supported by strong corporate earnings and positive economic indicators.\n\nAnalysts point to improving consumer sentiment and declining inflation pressures as key factors driving the market optimism.',
      source: 'Financial Times',
      image: 'https://placehold.co/600x400/059669/ffffff?text=Finance+News',
      originalUrl: 'https://example.com/finance-news'
    },
    {
      id: '3',
      category: 'science',
      timestamp: new Date(),
      headline: 'Scientists Achieve Breakthrough in Quantum Computing Stability',
      content: 'Researchers have made a significant breakthrough in quantum computing, developing a new method to maintain quantum coherence for extended periods.\n\nThe innovation involves a novel approach to quantum error correction, potentially solving one of the field\'s most challenging obstacles. This development could accelerate the path to practical quantum computers.\n\nExperts suggest this breakthrough could have far-reaching implications for cryptography, drug discovery, and complex system modeling.',
      source: 'Nature',
      image: 'https://placehold.co/600x400/dc2626/ffffff?text=Science+News',
      originalUrl: 'https://example.com/science-news'
    },
    {
      id: '4',
      category: 'health',
      timestamp: new Date(),
      headline: 'New Treatment Shows Promise in Clinical Trials',
      content: 'A novel therapeutic approach has demonstrated exceptional results in treating multiple chronic conditions.\n\nClinical trials show significant improvement in patient outcomes with minimal side effects. The treatment combines innovative drug delivery methods with personalized medicine approaches.\n\nMedical experts are optimistic about the potential impact on public health, particularly for conditions that have traditionally been difficult to treat.',
      source: 'Medical Journal',
      image: 'https://placehold.co/600x400/0891b2/ffffff?text=Health+News',
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
  // In development, all time slots are available
  if (import.meta.env.DEV) {
    return true;
  }
  
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