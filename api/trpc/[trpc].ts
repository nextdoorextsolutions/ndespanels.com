// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import { createContext } from '../../server/_core/context';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Convert Vercel request to standard Request for tRPC fetch adapter
  const url = new URL(req.url || '', `https://${req.headers.host}`);
  
  // Read body for POST requests
  let body: string | undefined;
  if (req.method === 'POST') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks).toString('utf-8');
  }

  const fetchRequest = new Request(url.toString(), {
    method: req.method,
    headers: Object.entries(req.headers).reduce((acc, [key, value]) => {
      if (value) acc[key] = Array.isArray(value) ? value.join(', ') : value;
      return acc;
    }, {} as Record<string, string>),
    body: body,
  });

  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: fetchRequest,
      router: appRouter,
      createContext: async () => {
        // Create a minimal context for serverless
        return createContext({ req: req as any, res: res as any });
      },
    });

    // Set response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Send response
    const responseBody = await response.text();
    return res.status(response.status).send(responseBody);
  } catch (error: any) {
    console.error('[tRPC] Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
