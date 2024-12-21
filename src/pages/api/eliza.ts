import type { NextApiRequest, NextApiResponse } from 'next';
import { Eliza } from '../../utils/eliza';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    res.status(400).json({ 
      error: 'Invalid message parameter',
      message: 'Message must be a non-empty string'
    });
    return;
  }

  try {
    const eliza = new Eliza();
    const response = await eliza.respond(message);
    res.status(200).json({ response });
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 