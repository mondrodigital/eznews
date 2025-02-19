import { handleCronUpdate } from '../src/api/cron';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const result = await handleCronUpdate(request);
    const { status, headers, body } = await parseResponse(result);
    
    Object.entries(headers).forEach(([key, value]) => {
      response.setHeader(key, value);
    });
    
    response.status(status).send(body);
  } catch (error) {
    console.error('Error in cron handler:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
}

async function parseResponse(response: Response) {
  const body = await response.text();
  const status = response.status;
  const headers = Object.fromEntries(response.headers.entries());
  
  return { status, headers, body };
} 