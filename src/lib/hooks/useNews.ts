import { useState, useEffect } from 'react';
import { TimeSlot, TimeBlock } from '../types';

function isTimeSlotAvailable(timeSlot: TimeSlot): boolean {
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

export function useNews(timeSlot: TimeSlot) {
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if this time slot should be available
    setIsAvailable(isTimeSlotAvailable(timeSlot));

    // Set up interval to check availability
    const interval = setInterval(() => {
      setIsAvailable(isTimeSlotAvailable(timeSlot));
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [timeSlot]);

  useEffect(() => {
    let mounted = true;

    async function fetchNews() {
      if (!isAvailable) {
        setTimeBlock(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('useNews: Fetching news for time slot:', timeSlot);
        
        // Force fresh fetch with cache busting
        const timestamp = Date.now();
        const apiUrl = `/api/news?timeSlot=${timeSlot}&_=${timestamp}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!mounted) return;

        if (data.status === 'error') {
          throw new Error(data.error || data.message || 'Unknown error');
        }

        if (!data.stories || !Array.isArray(data.stories)) {
          throw new Error('Invalid response format: missing or invalid stories array');
        }

        // Convert ISO strings back to Date objects
        const stories = data.stories.map((story: any) => ({
          ...story,
          timestamp: new Date(story.timestamp)
        }));

        setTimeBlock({
          time: timeSlot,
          date: data.date,
          stories
        });

        if (stories.length === 0) {
          setError('No news available for this time slot');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('useNews: Error fetching news:', err);
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load news';
          setError(errorMessage);
          setTimeBlock(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchNews();

    return () => {
      mounted = false;
    };
  }, [timeSlot, isAvailable]);

  return { timeBlock, loading, error, isAvailable };
} 