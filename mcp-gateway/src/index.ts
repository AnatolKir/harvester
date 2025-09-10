import dotenv from 'dotenv';
import { Server } from './server';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Get port from environment or use default (3333 as per requirements)
const PORT = parseInt(process.env.PORT || '3333', 10);

// Create and start server
const server = new Server(PORT);

server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default server.getApp();