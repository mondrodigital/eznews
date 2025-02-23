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
      category: 'robotics',
      headline: 'Boston Dynamics Unveils Next-Generation Industrial Robot',
      content: 'Boston Dynamics has revealed their latest industrial automation solution, combining advanced mobility with precise manipulation capabilities.\n\nThe new robot demonstrates unprecedented agility in complex manufacturing environments, capable of navigating tight spaces while performing intricate assembly tasks. Early trials show significant improvements in production efficiency.\n\nIndustry experts predict this development could transform manufacturing processes across multiple sectors.',
      source: 'Wired',
      image: 'https://placehold.co/600x400/059669/ffffff?text=Robotics+News',
      originalUrl: 'https://example.com/robotics-news'
    },
    {
      id: '3',
      timestamp: new Date(),
      category: 'biotech',
      headline: 'Breakthrough in CRISPR Gene Editing Technology',
      content: 'Scientists have achieved a major breakthrough in CRISPR gene editing technology, developing a more precise and efficient method for genetic modifications.\n\nThe new technique shows significantly reduced off-target effects while maintaining high editing efficiency. This advancement could accelerate the development of genetic therapies for various diseases.\n\nResearchers are already planning clinical trials to test applications in treating genetic disorders.',
      source: 'Nature',
      image: 'https://placehold.co/600x400/dc2626/ffffff?text=Biotech+News',
      originalUrl: 'https://example.com/biotech-news'
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