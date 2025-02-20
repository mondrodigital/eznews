// Environment variables for browser (client-side)
export const clientEnv = {
  REDIS_URL: import.meta.env.VITE_REDIS_URL as string,
  NEWS_API_KEY: import.meta.env.VITE_NEWS_API_KEY as string,
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY as string,
  CRON_SECRET: import.meta.env.VITE_CRON_SECRET as string
} as const;

// Helper to check if we're in browser
export const isBrowser = typeof window !== 'undefined';

// Validate required environment variables
export function validateEnv() {
  const required = ['REDIS_URL', 'NEWS_API_KEY', 'OPENAI_API_KEY', 'CRON_SECRET'];
  const missing = required.filter(key => !clientEnv[key as keyof typeof clientEnv]);
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
    return false;
  }
  return true;
} 