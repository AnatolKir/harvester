import { Router } from 'express';
import { logger } from '../utils/logger';

export const inngestRouter = Router();

// Inngest endpoint for function registration
inngestRouter.get('/', (_req, res) => {
  logger.info('Inngest function registration requested');
  
  // Return empty functions array for now
  // In a full implementation, this would return actual job definitions
  res.json({
    functions: [],
    framework: {
      type: 'express',
      version: '4.x'
    },
    sdk: {
      name: '@inngest/sdk',
      version: '3.x'
    },
    appId: 'mcp-gateway',
    apiOrigin: process.env.INNGEST_API_ORIGIN || 'https://api.inngest.com',
  });
});

// Inngest webhook endpoint for receiving events
inngestRouter.post('/', (req, res) => {
  logger.info('Inngest webhook received', { 
    event: req.body?.name,
    data: req.body?.data 
  });
  
  // Acknowledge receipt
  res.status(200).json({ 
    success: true,
    message: 'Event received' 
  });
});

// Health check for Inngest
inngestRouter.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'inngest-integration'
  });
});