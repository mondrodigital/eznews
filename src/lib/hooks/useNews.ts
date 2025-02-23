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
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('API Response text:', text);
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse API response:', e);
          throw new Error('Invalid response from server');
        }
        
        console.log('API Response data:', data);
        
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