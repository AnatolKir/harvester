import { Router } from 'express';
import { logger } from '../utils/logger';

export const toolsRouter = Router();

toolsRouter.get('/', (_req, res) => {
  res.json({
    message: 'MCP Gateway Tools API',
    version: '1.0.0',
    available_tools: [],
  });
});

toolsRouter.post('/execute', async (req, res) => {
  const { tool, params } = req.body;

  if (!tool) {
    res.status(400).json({
      error: {
        message: 'Tool name is required',
      },
    });
    return;
  }

  logger.info(`Executing tool: ${tool}`, { params });

  res.json({
    tool,
    params,
    result: 'Tool execution placeholder',
    timestamp: Date.now(),
  });
});