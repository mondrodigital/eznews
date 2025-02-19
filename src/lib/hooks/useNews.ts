import { useState, useEffect } from 'react';
import { TimeBlock, TimeSlot } from '../types';
import { getTimeBlock, isTimeSlotAvailable } from '../storage';

export function useNews(activeTime: TimeSlot) {
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        console.log('Fetching news for time slot:', activeTime);
        setLoading(true);
        setError(null);

        // Check if this time slot should be available
        if (!isTimeSlotAvailable(activeTime)) {
          console.log('Time slot not yet available:', activeTime);
          setTimeBlock(null);
          setError('This time slot is not yet available');
          return;
        }

        const block = await getTimeBlock(activeTime);
        console.log('Fetched time block:', block);
        
        if (!block) {
          setError('No news available for this time slot');
          return;
        }

        setTimeBlock(block);
      } catch (err) {
        console.error('Error in useNews hook:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch news');
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, [activeTime]);

  return { timeBlock, loading, error };
} 