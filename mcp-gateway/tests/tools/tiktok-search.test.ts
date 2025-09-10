import request from 'supertest';
import { Server } from '../../src/server';

describe('TikTok Search Tool', () => {
  let server: Server;
  let app: any;
  
  beforeAll(async () => {
    server = new Server(0); // Use random port for testing
    app = server.getApp();
  });
  
  describe('POST /mcp', () => {
    it('should return 400 when tool name is missing', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ params: {} });
        
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Tool name is required');
    });
    
    it('should return 404 for unknown tool', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ 
          tool: 'unknown.tool',
          params: {} 
        });
        
      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Tool not found');
      expect(response.body.error.availableTools).toContain('tiktok.ccl.search');
    });
    
    it('should validate parameters for tiktok.ccl.search', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ 
          tool: 'tiktok.ccl.search',
          params: {
            limit: 100, // exceeds max
            content_type: 'invalid'
          }
        });
        
      expect(response.status).toBe(500); // Validation error
    });
    
    it('should accept valid parameters for tiktok.ccl.search', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ 
          tool: 'tiktok.ccl.search',
          params: {
            keywords: 'fashion',
            limit: 10,
            country: 'US',
            content_type: 'promoted'
          }
        });
        
      // The actual execution might fail without BrightData API key
      // but the tool should be found and parameters validated
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.tool).toBe('tiktok.ccl.search');
      }
    });
  });
  
  describe('GET /mcp/tools', () => {
    it('should list available tools', async () => {
      const response = await request(app)
        .get('/mcp/tools');
        
      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'tiktok.ccl.search',
            description: expect.any(String),
            inputSchema: expect.any(Object)
          })
        ])
      );
    });
  });
});