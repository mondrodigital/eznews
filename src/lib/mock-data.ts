import { TimeBlock, NewsItem, TimeSlot } from './types';

const createMockStories = (timeSlot: TimeSlot): NewsItem[] => [
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
    headline: 'Quantum Teleportation Breakthrough Paves Way for Quantum Internet',
    content: 'Researchers have achieved stable quantum teleportation over a distance of 100 kilometers, marking a major milestone in quantum computing.\n\nThe achievement uses a new type of quantum entanglement that remains stable at room temperature, solving one of the field\'s biggest challenges.\n\nThis breakthrough could enable the creation of a quantum internet, offering unprecedented security and computing capabilities.\n\nExperts suggest the first practical applications could be implemented within the next decade.',
    source: 'Nature',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb',
    originalUrl: 'https://www.nature.com/subjects/quantum-physics'
  },
  {
    id: '4',
    timestamp: new Date(),
    category: 'health',
    headline: 'New Treatment Shows Promise in Reversing Aging Process',
    content: 'A groundbreaking study has demonstrated the first successful treatment for reversing cellular aging in human trials.\n\nThe treatment, which combines gene therapy with targeted protein modification, showed significant results in restoring cellular function in elderly participants.\n\nWhile not a "fountain of youth," researchers say the treatment could help prevent age-related diseases and maintain health longer.\n\nClinical trials are expanding, with potential widespread availability within five years pending regulatory approval.',
    source: 'Science Magazine',
    image: 'https://images.unsplash.com/photo-1579165466741-7f35e4755182',
    originalUrl: 'https://www.science.org/topic/medicine'
  }
];

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
      stories: createMockStories(timeSlot)
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