import { handleCronUpdate } from '../src/api/cron';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  return handleCronUpdate(req);
} 