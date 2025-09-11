import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { inngestRouter } from './routes/inngest';
import toolRegistry from './tools/registry';

export class Server {
  private app: Application;
  private port: number;
  private server: any;

  constructor(port: number = 3333) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/mcp', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
  }

  private setupRoutes(): void {
    // Health check routes
    this.app.use('/health', healthRouter);
    
    // Inngest integration routes
    this.app.use('/api/inngest', inngestRouter);

    // Main MCP tool execution endpoint
    this.app.post('/mcp', async (req: Request, res: Response, next) => {
      try {
        const { tool, params } = req.body;

        if (!tool) {
          res.status(400).json({
            error: {
              message: 'Tool name is required',
              statusCode: 400,
            },
          });
          return;
        }

        // Check if tool exists
        if (!toolRegistry.has(tool)) {
          res.status(404).json({
            error: {
              message: `Tool not found: ${tool}`,
              statusCode: 404,
              availableTools: toolRegistry.getToolNames(),
            },
          });
          return;
        }

        // Execute the tool
        const startTime = Date.now();
        const result = await toolRegistry.execute(tool, params || {});
        const executionTime = Date.now() - startTime;

        res.status(200).json({
          success: true,
          tool,
          result,
          executionTime,
          timestamp: Date.now(),
        });
      } catch (error) {
        next(error);
      }
    });
    
    // Tool discovery endpoint
    this.app.get('/mcp/tools', (_req: Request, res: Response) => {
      const tools = toolRegistry.getToolMetadata();
      res.json({
        tools,
        count: tools.length,
      });
    });

    // Metrics endpoint (placeholder)
    this.app.get('/metrics', (_req: Request, res: Response) => {
      // TODO: Implement proper metrics collection
      res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now(),
        requests: {
          total: 0, // Placeholder
          success: 0, // Placeholder
          error: 0, // Placeholder
        },
      });
    });

    // Root endpoint
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        service: 'MCP Gateway',
        version: '1.0.1',
        status: 'running',
        endpoints: {
          health: '/health',
          mcp: '/mcp',
          metrics: '/metrics',
          inngest: '/api/inngest',
        },
      });
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: {
          message: 'Endpoint not found',
          statusCode: 404,
        },
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 MCP Gateway server started on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Build revision: ${process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown'}`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
        resolve();
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();
    });
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });

        // Force close after 30 seconds
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 30000);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  public getApp(): Application {
    return this.app;
  }
}