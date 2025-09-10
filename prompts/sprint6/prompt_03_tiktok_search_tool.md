# Implement tiktok.ccl.search Tool

## Objective

Implement the `tiktok.ccl.search` custom tool that translates TikTok promoted video discovery requests to BrightData's standard tools.

## Context

- Sprint: 6
- Dependencies: prompt_05_health_checks.md
- Related files: `/mcp-gateway/src/tools/tiktok-search.ts`

## Task

Create the first custom tool that our discovery job relies on for finding TikTok promoted videos. This tool should handle the translation from our custom API to BrightData's available tools.

### Requirements

1. Create `src/tools/tiktok-search.ts` implementing the tool
2. Tool specification:
   - **Name**: `tiktok.ccl.search`
   - **Purpose**: Find TikTok promoted videos for U.S. market
   - **Input**: Search parameters (keywords, filters, limit)
   - **Output**: Array of video metadata objects
3. Implementation approach:
   - Map our custom parameters to BrightData's TikTok tools
   - Handle U.S. geo-targeting requirements
   - Filter for promoted/sponsored content only
   - Return standardized video metadata format
4. Tool interface:

   ```typescript
   interface SearchParams {
     keywords?: string;
     limit?: number;
     country?: string;
     content_type?: 'promoted' | 'all';
   }

   interface VideoResult {
     id: string;
     url: string;
     title: string;
     author: string;
     view_count: number;
     is_promoted: boolean;
   }
   ```

5. Error handling:
   - BrightData API failures
   - Rate limiting responses
   - Invalid parameter validation
   - Empty result handling

## Agent to Use

Invoke the **@brightdata** agent to:

- Identify which BrightData tools can be used for TikTok search
- Review parameter mapping strategy
- Suggest filtering approaches for promoted content
- Validate tool implementation patterns

## Success Criteria

- [ ] Tool successfully finds TikTok promoted videos
- [ ] Parameters are properly validated and mapped
- [ ] Returns consistent video metadata format
- [ ] Handles BrightData API errors gracefully
- [ ] Respects rate limits and quota constraints
- [ ] Tool is registered in the MCP gateway

## Notes

- Focus on U.S. market promoted videos only
- Keep result limit reasonable (10-50 videos max)
- Log all BrightData API calls for debugging
- Consider caching results for duplicate requests
