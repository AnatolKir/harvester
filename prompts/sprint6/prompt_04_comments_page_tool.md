# Implement tiktok.comments.page Tool

## Objective

Implement the `tiktok.comments.page` custom tool that retrieves paginated comments from TikTok videos using BrightData's service.

## Context

- Sprint: 6
- Dependencies: prompt_06_tiktok_search_tool.md
- Related files: `/mcp-gateway/src/tools/comments-page.ts`

## Task

Create the second critical custom tool for harvesting comments from TikTok videos. This tool handles the heavy lifting of comment extraction that feeds our domain discovery pipeline.

### Requirements

1. Create `src/tools/comments-page.ts` implementing the tool
2. Tool specification:
   - **Name**: `tiktok.comments.page`
   - **Purpose**: Get paginated comments from a TikTok video
   - **Input**: Video URL/ID, page parameters
   - **Output**: Comments with pagination metadata
3. Implementation approach:
   - Map video URLs to BrightData's comment extraction tools
   - Handle pagination (1-2 pages max per MVP constraints)
   - Extract comment text, author, timestamps
   - Return structured comment data
4. Tool interface:

   ```typescript
   interface CommentsParams {
     video_url: string;
     page?: number;
     limit?: number;
     sort?: 'newest' | 'popular';
   }

   interface CommentResult {
     id: string;
     text: string;
     author: string;
     created_at: string;
     likes_count: number;
     replies_count: number;
   }

   interface CommentsResponse {
     comments: CommentResult[];
     pagination: {
       page: number;
       has_more: boolean;
       total_count?: number;
     };
   }
   ```

5. MVP constraints:
   - Limit to 1-2 pages per video maximum
   - Focus on top-level comments (no reply threads)
   - Handle rate limiting from TikTok/BrightData

## Agent to Use

Invoke the **@brightdata** agent to:

- Identify BrightData tools for TikTok comment extraction
- Review pagination handling strategies
- Suggest rate limiting and error handling approaches
- Validate comment data extraction patterns

## Success Criteria

- [ ] Tool successfully extracts comments from TikTok videos
- [ ] Pagination works correctly (1-2 pages max)
- [ ] Comment data includes all required fields
- [ ] Handles videos with no comments gracefully
- [ ] Respects rate limits and prevents blocking
- [ ] Error handling for private/deleted videos

## Notes

- This tool is critical for the domain harvesting pipeline
- Focus on comment text quality over quantity
- Log video processing for debugging
- Consider implementing comment filtering for relevance
