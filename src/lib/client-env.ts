// Environment variables for browser (client-side)
export const isBrowser = typeof window !== 'undefined';

// Helper to safely get environment variables in the browser
function getEnvVar(key: string): string {
  const value = (import.meta.env as Record<string, string>)[`VITE_${key}`];
  if (!value) {
    console.warn(`Environment variable VITE_${key} is not set`);
    return '';
  }
  return value;
}

export const clientEnv = {
  REDIS_URL: getEnvVar('REDIS_URL'),
  NEWS_API_KEY: getEnvVar('NEWS_API_KEY'),
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  UNSPLASH_ACCESS_KEY: getEnvVar('UNSPLASH_ACCESS_KEY'),
  CRON_SECRET: getEnvVar('CRON_SECRET')
} as const;

// Validate required environment variables
export function validateEnv() {
  const required = ['REDIS_URL', 'NEWS_API_KEY', 'OPENAI_API_KEY', 'UNSPLASH_ACCESS_KEY', 'CRON_SECRET'];
  const missing = required.filter(key => !clientEnv[key as keyof typeof clientEnv]);
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
    return false;
  }
  return true;
} 