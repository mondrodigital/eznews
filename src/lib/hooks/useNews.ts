import { useState, useEffect } from 'react';
import { TimeSlot, TimeBlock } from '../types';
import { clearNewsCache } from '../storage';

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
        
        // Clear client-side cache
        await clearNewsCache();
        
        // Force fresh fetch with cache busting
        const timestamp = Date.now();
        
        // Use relative URL in production, full URL in development
        const apiUrl = `/api/news?timeSlot=${timeSlot}&force=true&_=${timestamp}`;
        console.log('Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('API Response status:', response.status);
        
        const text = await response.text();
        console.log('API Response text:', text);
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse API response:', e);
          throw new Error(`Invalid response from server: ${text}`);
        }
        
        console.log('API Response data:', data);
        
        if (!mounted) return;

        if (data.status === 'error' || response.status !== 200) {
          console.error('API returned error:', data.error, data.details);
          throw new Error(data.details || data.error || 'Failed to load news');
        }

        // Verify we have fresh stories
        if (data.stories?.length) {
          const now = new Date();
          const storyDates = data.stories.map((s: any) => new Date(s.timestamp));
          const oldestStory = Math.min(...storyDates.map((d: Date) => d.getTime()));
          const hoursSinceOldest = (now.getTime() - oldestStory) / (1000 * 60 * 60);
          
          console.log('Story freshness check:', {
            now: now.toISOString(),
            oldestStory: new Date(oldestStory).toISOString(),
            hoursSinceOldest
          });
          
          if (hoursSinceOldest > 48) {
            console.warn('Stories are older than 48 hours, retrying fetch...');
            throw new Error('Stories are too old');
          }
        }

        setTimeBlock({
          time: timeSlot,
          date: data.date,
          stories: data.stories || []
        });

        if (!data.stories?.length) {
          setError('No news available for this time slot');
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

  return { timeBlock, loading, error };
} 