// Environment variables for browser (client-side)
export const clientEnv = {
  REDIS_URL: import.meta.env.VITE_REDIS_URL,
  NEWS_API_KEY: import.meta.env.VITE_NEWS_API_KEY,
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  CRON_SECRET: import.meta.env.VITE_CRON_SECRET
}; 