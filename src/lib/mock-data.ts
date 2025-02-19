import { TimeBlock, NewsItem, TimeSlot } from './types';

const createMockStories = (timeSlot: TimeSlot): NewsItem[] => [
  {
    id: '1',
    timestamp: new Date(),
    category: 'tech',
    headline: 'Revolutionary AI Model Achieves Human-Level Understanding',
    content: 'Scientists at a leading research institute have developed a new AI model that demonstrates unprecedented levels of language comprehension and reasoning.\n\nThe breakthrough comes from a novel architecture that combines multiple types of neural networks in a way that mimics human cognitive processes.\n\nEarly tests show the AI performing at or above human level on a wide range of tasks, from complex problem-solving to nuanced language understanding.\n\nThe implications for fields like healthcare, scientific research, and education are significant, though researchers emphasize the importance of ethical deployment.',
    source: 'MIT Technology Review',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    originalUrl: 'https://www.technologyreview.com/artificial-intelligence'
  },
  {
    id: '2',
    timestamp: new Date(),
    category: 'finance',
    headline: 'Global Markets Rally on Breakthrough Clean Energy Investment',
    content: 'Stock markets worldwide surged today as a consortium of major companies announced a $500 billion investment in clean energy technologies.\n\nThe initiative, backed by leading tech and energy companies, aims to accelerate the transition to sustainable energy sources through innovative storage solutions and smart grid technology.\n\nAnalysts predict this could mark a turning point in the fight against climate change while creating millions of new jobs in the green energy sector.\n\nThe investment is expected to significantly reduce the cost of renewable energy technologies within the next five years.',
    source: 'Financial Times',
    image: 'https://images.unsplash.com/photo-1642543492481-44e81e3ab2f4',
    originalUrl: 'https://www.ft.com/energy'
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
    const existingData = localStorage.getItem(`news:${timeSlot}`);
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
      localStorage.setItem(`news:${timeSlot}`, JSON.stringify(timeBlock));
      console.log(`Successfully initialized mock data for ${timeSlot}`);
      
      // Verify the data was stored
      const storedData = localStorage.getItem(`news:${timeSlot}`);
      console.log(`Verified stored data for ${timeSlot}:`, JSON.parse(storedData || '{}'));
    } catch (error) {
      console.error(`Failed to initialize mock data for ${timeSlot}:`, error);
    }
  });
} 