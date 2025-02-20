// Environment variables for browser (client-side) and Node.js (server-side)
function getEnvVar(key: string): string | undefined {
  // In browser (client-side)
  if (typeof window !== 'undefined') {
    return (import.meta.env as any)[`VITE_${key}`];
  }
  // In Node.js (server-side)
  return process.env[key];
}

export const env = {
  REDIS_URL: getEnvVar('REDIS_URL'),
  NEWS_API_KEY: getEnvVar('NEWS_API_KEY'),
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  UNSPLASH_ACCESS_KEY: getEnvVar('UNSPLASH_ACCESS_KEY'),
  CRON_SECRET: getEnvVar('CRON_SECRET')
}; 