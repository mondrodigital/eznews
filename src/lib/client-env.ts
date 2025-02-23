// Environment variables for browser (client-side)
export const isBrowser = typeof window !== 'undefined';

// Helper to safely get environment variables in the browser
function getEnvVar(key: string): string {
  if (!isBrowser) return '';
  
  // First try VITE_ prefixed variable
  let value = (import.meta.env as any)[`VITE_${key}`];
  
  // If not found, try without prefix
  if (!value) {
    value = (import.meta.env as any)[key];
  }
  
  // If still not found, try process.env (for SSR)
  if (!value && typeof process !== 'undefined' && process.env) {
    value = process.env[`VITE_${key}`] || process.env[key];
  }
  
  if (!value) {
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  
  return value;
}

export const clientEnv = {
  NEWS_API_KEY: getEnvVar('NEWS_API_KEY'),
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  UNSPLASH_ACCESS_KEY: getEnvVar('UNSPLASH_ACCESS_KEY'),
  CRON_SECRET: getEnvVar('CRON_SECRET'),
  SUPABASE_URL: getEnvVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY')
} as const;

// Validate required environment variables
export function validateEnv() {
  if (!isBrowser) return true;
  
  const required = [
    'NEWS_API_KEY',
    'OPENAI_API_KEY',
    'UNSPLASH_ACCESS_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  const missing = required.filter(key => !clientEnv[key as keyof typeof clientEnv]);
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
    return false;
  }
  
  return true;
} 