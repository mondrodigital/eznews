import { useState, useEffect } from 'react';
import { ChevronDown, Menu, Loader2 } from 'lucide-react';
import { useNews } from './lib/hooks/useNews';
import { TimeSlot } from './lib/types';
import { isTimeSlotAvailable } from './lib/storage';

console.log('App initializing...');

const categories = [
  { id: 'all', name: 'All', emoji: '🗞️' },
  { id: 'ai', name: 'AI', emoji: '🤖' },
  { id: 'robotics', name: 'Robotics', emoji: '🦾' },
  { id: 'biotech', name: 'Biotech', emoji: '🧬' }
];

function getDefaultTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 20) return '8PM';
  if (hour >= 15) return '3PM';
  if (hour >= 10) return '10AM';
  return '10AM';
}

function App() {
  console.log('App component rendering');
  
  const [activeTime, setActiveTime] = useState<TimeSlot>(getDefaultTimeSlot());
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  
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
    if (!isTimeSlotAvailable(time)) {
      return; // Don't allow selection of unavailable time slots
    }
    console.log('Time selected:', time);
    setActiveTime(time);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="bg-white font-[system-ui] custom-scrollbar min-h-screen">
      {/* Progress bar */}
      <div 
        className="fixed top-0 left-0 h-[1px] bg-black/20 w-full z-50"
        style={{ transform: `scaleX(${scrollProgress / 100})`, transformOrigin: 'left' }}
      />

      {/* Mobile Time Selector */}
      <div className="lg:hidden sticky top-0 bg-white border-b border-black/5 z-40">
        <div className="text-sm font-medium px-4 pt-4 pb-2">{timeBlock?.date}</div>
        <div className="flex space-x-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
          {(['10AM', '3PM', '8PM'] as TimeSlot[]).map((time) => {
            const available = isTimeSlotAvailable(time);
            return (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                disabled={!available}
                className={`py-1.5 px-3 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
                  activeTime === time 
                    ? 'bg-black text-white' 
                    : available
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex">
        {/* Desktop Time Selector */}
        <div className="hidden lg:block sticky top-0 w-28 h-screen border-r border-black/5">
          <div className="text-sm font-medium mb-8 px-6 pt-4">{timeBlock?.date}</div>
          <div className="flex flex-col space-y-1 px-6">
            {(['10AM', '3PM', '8PM'] as TimeSlot[]).map((time) => {
              const available = isTimeSlotAvailable(time);
              return (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  disabled={!available}
                  className={`relative py-4 text-sm tracking-wide text-left group ${
                    activeTime === time 
                      ? 'text-black font-medium bg-black/[0.03] rounded-sm' 
                      : available
                        ? 'text-gray-400 hover:text-gray-600'
                        : 'text-gray-300 cursor-not-allowed'
                  } transition-all duration-200`}
                >
                  <div className="px-2">
                    <span>{time}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Categories Bar */}
          <div className="sticky top-0 lg:top-0 w-full bg-white border-b border-black/5 z-40">
            <div className="flex items-center space-x-1 px-4 py-3 overflow-x-auto hide-scrollbar">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
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
          <div className="px-4 lg:px-12 w-full max-w-full">
            <div className="w-full max-w-[400px] mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="text-center py-20 text-gray-500">
                  {error}
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
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-base font-medium flex-1 min-w-0">
                            <span className="line-clamp-3">
                              {story.headline.replace(` - ${story.source}`, '').replace(/\s*-\s*$/, '')}
                            </span>
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
                        <div className="pt-2 space-y-4">
                          <div className="aspect-[3/2] bg-gray-100 overflow-hidden rounded-sm">
                            <img 
                              src={story.image} 
                              alt={story.headline}
                              className="w-full h-full object-cover grayscale opacity-90 transition-transform duration-500 hover:scale-105"
                            />
                          </div>

                          <div className="space-y-3 text-sm leading-relaxed break-words">
                            {story.content.split('\n\n').map((paragraph, index) => (
                              <p key={index} className="text-gray-800">{paragraph}</p>
                            ))}
                          </div>

                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-500 font-medium">Source: {story.source}</p>
                            <a 
                              href={story.originalUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline mt-1 block break-all"
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

      {/* Add custom scrollbar styles */}
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar {
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;