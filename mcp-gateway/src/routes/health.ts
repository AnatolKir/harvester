import { Router } from 'express';
import { logger } from '../utils/logger';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      message: 'Service Unavailable',
      timestamp: Date.now(),
    });
  }
});

healthRouter.get('/ready', (_req, res) => {
  res.status(200).json({
    ready: true,
    timestamp: Date.now(),
  });
});

healthRouter.get('/live', (_req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: Date.now(),
  });
});