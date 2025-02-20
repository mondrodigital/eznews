import { useState, useEffect } from 'react';
import { TimeSlot, TimeBlock } from '../types';
import { getNewsForTimeSlot } from '../news-service';

export function useNews(timeSlot: TimeSlot) {
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchNews() {
      try {
        setLoading(true);
        setError(null);
        console.log('useNews: Fetching news for time slot:', timeSlot);
        
        const block = await getNewsForTimeSlot(timeSlot);
        
        if (!mounted) return;

        if (!block) {
          setError('No news available at this time');
          setTimeBlock(null);
        } else {
          setTimeBlock(block);
          setError(null);
        }
      } catch (err) {
        console.error('useNews: Error fetching news:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load news');
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
  }, [timeSlot]);

  return { timeBlock, loading, error };
} 