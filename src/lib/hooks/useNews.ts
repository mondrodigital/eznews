import { useState, useEffect } from 'react';
import { TimeSlot, TimeBlock } from '../types';

export function useNews(timeSlot: TimeSlot) {
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchNews() {
      try {
        setLoading(true);
        setError(null);
        setMessage(null);
        console.log('useNews: Fetching news for time slot:', timeSlot);
        
        const response = await fetch(`/api/news?timeSlot=${timeSlot}`);
        console.log('API Response status:', response.status);
        
        const data = await response.json();
        console.log('API Response data:', data);
        
        if (!mounted) return;

        if (data.status === 'error') {
          console.error('API returned error:', data.error, data.details);
          setError(data.error || 'Failed to load news');
          setTimeBlock({
            time: timeSlot,
            date: data.date,
            stories: []
          });
          return;
        }

        // Handle the case where news is not available yet
        if (data.message) {
          setMessage(data.message);
        }

        setTimeBlock({
          time: timeSlot,
          date: data.date,
          stories: data.stories || []
        });

        if (!data.stories?.length) {
          setError(data.message || 'No news available at this time');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('useNews: Error fetching news:', err);
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load news';
          setError(errorMessage);
          setTimeBlock({
            time: timeSlot,
            date: new Date().toLocaleDateString('en-US', { 
              day: 'numeric', 
              month: 'numeric', 
              year: '2-digit'
            }).replace(/\//g, ' '),
            stories: []
          });
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
  }, [timeSlot]);

  return { timeBlock, loading, error, message };
} 