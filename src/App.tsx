import { useState, useEffect } from 'react';
import { ChevronDown, Menu, Loader2 } from 'lucide-react';
import { useNews } from './lib/hooks/useNews';
import { TimeSlot } from './lib/types';

// Remove mock data initialization
console.log('App initializing...');

const categories = [
  { id: 'all', name: 'All', emoji: '🗞️' },
  { id: 'tech', name: 'Tech', emoji: '⚡' },
  { id: 'finance', name: 'Finance', emoji: '📈' },
  { id: 'science', name: 'Science', emoji: '🔭' },
  { id: 'health', name: 'Health', emoji: '⚕️' }
];

function App() {
  console.log('App component rendering');
  
  const [activeTime, setActiveTime] = useState<TimeSlot>("10AM");
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isNavOpen, setIsNavOpen] = useState(false);
  
  const { timeBlock, loading, error } = useNews(activeTime);
  
  console.log('Current state:', {
    activeTime,
    timeBlock,
    loading,
    error,
    activeCategory
  });
  
  const filteredStories = timeBlock?.stories.filter(story => 
    activeCategory === 'all' || story.category === activeCategory
  ) ?? [];

  console.log('Filtered stories:', filteredStories);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrolled / maxScroll) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTimeSelect = (time: TimeSlot) => {
    console.log('Time selected:', time);
    setActiveTime(time);
    setIsNavOpen(false);
  };

  if (error) {
    console.error('Error state:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error loading news: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white font-[system-ui] custom-scrollbar">
      {/* Progress bar */}
      <div 
        className="fixed top-0 left-0 h-[1px] bg-black/20 w-full z-50"
        style={{ transform: `scaleX(${scrollProgress / 100})`, transformOrigin: 'left' }}
      />

      {/* Mobile Nav Toggle */}
      <button 
        onClick={() => setIsNavOpen(!isNavOpen)}
        className="fixed top-4 left-4 z-50 p-2 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="flex">
        {/* Vertical Navigation - Mobile Slide-out */}
        <div className={`
          fixed top-0 left-0 w-64 h-screen bg-white border-r border-black/5 z-30 
          transform transition-transform duration-300 lg:translate-x-0 lg:relative lg:w-28 lg:h-auto
          ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="text-sm font-medium mb-8 px-6 pt-16 lg:pt-4">{timeBlock?.date}</div>
          <div className="flex flex-col space-y-1 px-6">
            {(['10AM', '3PM', '8PM'] as TimeSlot[]).map((time) => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={`relative py-4 text-sm tracking-wide text-left group ${
                  activeTime === time 
                    ? 'text-black font-medium bg-black/[0.03] rounded-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                } transition-all duration-200`}
              >
                <div className="px-2">
                  <span>{time}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {/* Categories Bar */}
          <div className="sticky top-0 w-full bg-white border-b border-black/5 z-40">
            <div className="flex items-center space-x-1 px-4 lg:px-6 py-3 overflow-x-auto custom-scrollbar">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center space-x-2 px-3 lg:px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                    activeCategory === category.id 
                      ? 'bg-black text-white scale-105' 
                      : 'hover:bg-black/5'
                  }`}
                >
                  <span className="text-base grayscale">{category.emoji}</span>
                  <span className="font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 lg:px-12">
            <div className="w-full max-w-[800px] mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredStories.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  No stories available for this time slot and category
                </div>
              ) : (
                /* Stories List */
                <div className="space-y-6 py-6">
                  {filteredStories.map((story) => (
                    <div key={story.id} className="group">
                      <button 
                        onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                        className="block text-left w-full group relative py-4"
                      >
                        <div className="flex items-start justify-between pr-2">
                          <h2 className="text-base font-medium pr-12 group-hover:text-gray-600 transition-colors duration-200">
                            {story.headline}
                          </h2>
                          <ChevronDown 
                            size={14} 
                            className={`mt-1 flex-shrink-0 transition-transform duration-200 ${
                              expandedStory === story.id ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>
                      
                      {/* Expanded Content */}
                      {expandedStory === story.id && (
                        <div className="pt-2 space-y-6">
                          <div className="aspect-[4/3] bg-gray-100 overflow-hidden image-noise rounded-sm">
                            <img 
                              src={story.image} 
                              alt={story.headline}
                              className="w-full h-full object-cover grayscale opacity-90 transition-transform duration-500 hover:scale-105"
                            />
                          </div>

                          <div className="space-y-4 text-sm leading-relaxed">
                            {story.content.split('\n\n').map((paragraph, index) => (
                              <p key={index} className="text-gray-800">{paragraph}</p>
                            ))}
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500 font-medium">Source: {story.source}</p>
                            <a 
                              href={story.originalUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline mt-1 block"
                            >
                              Read original article
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile nav */}
      {isNavOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsNavOpen(false)}
        />
      )}
    </div>
  );
}

export default App;