# News Aggregator

A modern news aggregator that fetches and curates news stories throughout the day.

## Features

- Automated news updates at 10AM, 3PM, and 8PM
- AI-powered story selection and rewriting
- Category filtering
- Responsive design
- Clean, minimal interface

## Environment Variables

Required environment variables for deployment:

```env
# API Keys
VITE_NEWS_API_KEY=your_newsapi_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_CRON_SECRET=your_cron_secret

# Vercel KV (if using)
VITE_KV_REST_API_URL=your_kv_url
VITE_KV_REST_API_TOKEN=your_kv_token
```

## Deployment

1. Create a new project on Vercel
2. Connect your repository
3. Set the environment variables in Vercel dashboard
4. Deploy!

The cron job will automatically run at:
- 9:55 AM (for 10 AM update)
- 2:55 PM (for 3 PM update)
- 7:55 PM (for 8 PM update)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Test news updates
npm run test-update
```

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- OpenAI GPT-4
- NewsAPI
- Vercel KV (optional) 