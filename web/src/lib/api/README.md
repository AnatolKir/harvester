# TikTok Domain Harvester API

This document describes the REST API endpoints for the TikTok Domain Harvester application.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.vercel.app/api`

## Response Format

All API responses follow this standard format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    count?: number;
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}
```

## Rate Limiting

All endpoints are rate-limited:

- Authenticated users: Higher limits
- Anonymous users: Standard limits
- Rate limit headers are included in responses

## Endpoints

### 1. List Domains

```
GET /api/domains
```

Get paginated list of domains with optional filtering.

**Query Parameters:**

- `search` (string): Search domains by name
- `dateFilter` (string): Filter by date - "today", "week", "month", or "all"
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Response:**

```typescript
{
  success: true,
  data: DomainWithStats[],
  meta: {
    count: number,
    page: number,
    pageSize: number,
    total: number,
    totalPages: number
  }
}
```

### 2. Get Domain Details

```
GET /api/domains/{id}
```

Get detailed information about a specific domain.

**Response:**

```typescript
{
  success: true,
  data: DomainWithStats
}
```

### 3. Get Domain Comments

```
GET /api/domains/{id}/comments
```

Get paginated comments mentioning the domain.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Response:**

```typescript
{
  success: true,
  data: CommentWithVideo[],
  meta: PaginationMeta
}
```

### 4. Get Domain Videos

```
GET /api/domains/{id}/videos
```

Get paginated videos where the domain was mentioned.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Response:**

```typescript
{
  success: true,
  data: VideoWithStats[],
  meta: PaginationMeta
}
```

### 5. Dashboard Statistics

```
GET /api/stats
```

Get dashboard overview statistics.

**Response:**

```typescript
{
  success: true,
  data: {
    total_domains: number,
    new_domains_today: number,
    new_domains_week: number,
    trending_domains: number,
    total_videos: number,
    total_comments: number,
    total_mentions: number,
    active_jobs: number,
    failed_jobs: number
  }
}
```

### 6. Job Status

```
GET /api/jobs
```

Get job processing status and logs.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)
- `status` (string): Filter by job status
- `job_type` (string): Filter by job type

**Response:**

```typescript
{
  success: true,
  data: JobStatus[],
  meta: PaginationMeta
}
```

## Error Responses

Error responses follow this format:

```typescript
{
  success: false,
  error: string
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

## Usage Examples

### Using the API Client

```typescript
import { api } from "@/lib/api";

// Get domains
const domains = await api.domains.list({
  search: "shopify",
  dateFilter: "week",
  page: 1,
  limit: 20,
});

// Get domain details
const domain = await api.domains.get("domain-id");

// Get domain comments
const comments = await api.domains.comments("domain-id", { page: 1 });

// Get stats
const stats = await api.stats.get();

// Get jobs
const jobs = await api.jobs.list({ page: 1 }, { status: "failed" });
```

### Direct Fetch

```typescript
// Get domains with search
const response = await fetch("/api/domains?search=example&page=1");
const data = await response.json();

if (data.success) {
  console.log(data.data); // Domain array
  console.log(data.meta); // Pagination info
}
```

## Data Types

### DomainWithStats

```typescript
interface DomainWithStats {
  id: string;
  domain: string;
  first_seen_at: string;
  last_seen_at: string;
  mention_count: number;
  unique_video_count: number;
  unique_author_count: number;
  is_suspicious: boolean;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  comment_count: number;
  video_count: number;
  author_count: number;
}
```

### CommentWithVideo

```typescript
interface CommentWithVideo {
  // Comment fields
  id: string;
  video_id: string;
  tiktok_comment_id: string;
  author_username: string;
  author_display_name: string | null;
  content: string;
  like_count: number;
  reply_count: number;
  is_author_reply: boolean;
  created_at: string;
  posted_at: string | null;
  metadata: any;

  // Associated video
  video: VideoRow;
}
```

### VideoWithStats

```typescript
interface VideoWithStats {
  // All video fields from database
  id: string;
  tiktok_id: string;
  url: string;
  title: string | null;
  description: string | null;
  view_count: number;
  share_count: number;
  comment_count: number;
  is_promoted: boolean;
  created_at: string;
  updated_at: string;
  last_scraped_at: string | null;
  scrape_status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  metadata: any;

  // Additional stats
  domain_mention_count: number;
}
```

### JobStatus

```typescript
interface JobStatus {
  id: string;
  job_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
  duration_ms?: number; // Calculated field
}
```
