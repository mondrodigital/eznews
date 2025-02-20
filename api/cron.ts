import { handleCronUpdate } from '../src/api/cron';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // For testing, allow POST requests with the correct secret
  if (request.method === 'POST') {
    const { secret } = request.body;
    if (secret !== process.env.CRON_SECRET) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    // Add authorization header for cron requests
    const headers = new Headers();
    headers.set('authorization', `Bearer ${process.env.CRON_SECRET}`);
    
    const mockRequest = new Request(request.url || '', {
      method: 'GET',
      headers
    });

    const result = await handleCronUpdate(mockRequest);
    const { status, headers: responseHeaders, body } = await parseResponse(result);
    
    Object.entries(responseHeaders).forEach(([key, value]) => {
      response.setHeader(key, value);
    });
    
    response.status(status).send(body);
  } catch (error) {
    console.error('Error in cron handler:', error);
    response.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function parseResponse(response: Response) {
  const body = await response.text();
  const status = response.status;
  const headers = Object.fromEntries(response.headers.entries());
  
  return { status, headers, body };
} 