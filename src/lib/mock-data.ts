import { TimeBlock, NewsItem, TimeSlot, Category } from './types';

export function createMockStories(): NewsItem[] {
  return [
    {
      id: '1',
      timestamp: new Date(),
      category: 'ai',
      headline: 'Revolutionary AI Model Achieves Human-Level Understanding',
      content: 'A groundbreaking artificial intelligence model has demonstrated unprecedented capabilities in natural language understanding and generation.\n\nResearchers at leading tech institutions have developed a neural network that can process and respond to complex queries with human-like comprehension and nuance. The system shows remarkable ability to understand context and maintain coherent, multi-turn conversations.\n\nExperts suggest this advancement could revolutionize fields from healthcare to education, while emphasizing the importance of ethical deployment and careful consideration of societal impacts.',
      source: 'TechCrunch',
      image: 'https://placehold.co/600x400/2563eb/ffffff?text=AI+News',
      originalUrl: 'https://example.com/tech-news'
    },
    {
      id: '2',
      timestamp: new Date(),
      category: 'tech',
      headline: 'Next-Generation Computing Platform Unveiled',
      content: 'A major tech company has revealed their latest computing platform, combining advanced processing with unprecedented efficiency.\n\nThe new system demonstrates remarkable performance in complex computing tasks while maintaining energy efficiency. Early benchmarks show significant improvements over previous generations.\n\nIndustry experts predict this development could transform various computing applications across multiple sectors.',
      source: 'Wired',
      image: 'https://placehold.co/600x400/059669/ffffff?text=Tech+News',
      originalUrl: 'https://example.com/tech-news'
    },
    {
      id: '3',
      timestamp: new Date(),
      category: 'science',
      headline: 'Breakthrough in Quantum Computing Research',
      content: 'Scientists have achieved a major breakthrough in quantum computing technology, developing a more stable and efficient quantum bit system.\n\nThe new technique shows significantly improved coherence times while maintaining high processing efficiency. This advancement could accelerate the development of practical quantum computers.\n\nResearchers are already planning to scale up the system for more complex quantum computations.',
      source: 'Nature',
      image: 'https://placehold.co/600x400/dc2626/ffffff?text=Science+News',
      originalUrl: 'https://example.com/science-news'
    }
  ];
}

export function initializeMockData() {
  console.log('Initializing mock data...');
  
  // Initialize data for all time slots
  const timeSlots: TimeSlot[] = ['10AM', '3PM', '8PM'];
  
  timeSlots.forEach(timeSlot => {
    const existingData = localStorage.getItem(`news_${timeSlot}.json`);
    if (existingData) {
      console.log(`Mock data already exists for ${timeSlot}:`, JSON.parse(existingData));
      return;
    }

    const timeBlock: TimeBlock = {
      time: timeSlot,
      date: new Date().toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'numeric', 
        year: '2-digit'
      }).replace(/\//g, ' '),
      stories: createMockStories()
    };

    try {
      console.log(`Storing mock data for ${timeSlot}:`, timeBlock);
      localStorage.setItem(`news_${timeSlot}.json`, JSON.stringify(timeBlock));
      console.log(`Successfully initialized mock data for ${timeSlot}`);
    } catch (error) {
      console.error(`Failed to initialize mock data for ${timeSlot}:`, error);
    }
  });
} 