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

  try {
    // For POST requests, forward the entire request
    if (request.method === 'POST') {
      const result = await handleCronUpdate(new Request(request.url || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      }));
      
      const { status, headers, body } = await parseResponse(result);
      
      Object.entries(headers).forEach(([key, value]) => {
        response.setHeader(key, value);
      });
      
      response.status(status).send(body);
      return;
    }

    // For GET requests (automated cron), add authorization header
    const headers = new Headers();
    headers.set('authorization', `Bearer ${process.env.CRON_SECRET}`);
    
    const result = await handleCronUpdate(new Request(request.url || '', {
      method: 'GET',
      headers
    }));

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