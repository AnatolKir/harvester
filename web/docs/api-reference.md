# TikTok Domain Harvester API Reference

This document provides comprehensive documentation for the TikTok Domain Harvester REST API endpoints.

## Base URL

```
http://localhost:3000/api  # Development
https://your-domain.com/api  # Production
```

## Authentication

All API endpoints require authentication via Supabase Auth. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

- **Limit**: 1000 requests per hour
- **Headers**: Rate limit information is returned in response headers:
  - `X-RateLimit-Limit`: Maximum requests per hour
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": <response_data>
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "field_name": ["Specific validation error"]
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [<array_of_items>],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Cursor Paginated Response

```json
{
  "success": true,
  "data": [<array_of_items>],
  "pagination": {
    "cursor": "current_cursor",
    "nextCursor": "next_cursor",
    "hasMore": true,
    "limit": 10
  }
}
```

## Endpoints

## Database Views

These read-optimized views power the UI and API.

- v_domains_overview
  - Columns: `domain` (text), `total_mentions` (bigint), `first_seen` (timestamptz), `last_seen` (timestamptz)
  - Purpose: Lightweight domain listing with core stats.

- v_domains_new_today
  - Columns: `domain` (text), `mentions_today` (bigint)
  - Purpose: Domains with mentions discovered today.

- v_domain_mentions_recent
  - Columns: `domain` (text), `comment_id` (uuid), `video_id` (uuid), `created_at` (timestamptz)
  - Purpose: Flat stream of domain mentions for recent activity feeds. Filter by time in queries.

- v_pipeline_stats
  - Columns: `domains_day` (bigint), `comments_day` (bigint), `errors_day` (bigint)
  - Purpose: Daily pipeline counters for dashboards.

## UI Pages

### /videos (SSR)

- Server-rendered list of videos with domain and comment aggregates.
- Query params (server-side):
  - `search` (string): filter by title/description/TikTok ID/URL
  - `status` (enum): all | pending | processing | completed | failed
  - `cursor` (string): base64 timestamp for cursor pagination
  - `limit` (int): 1-100 (default 25)
  - `sort` (enum): created_at | last_scraped_at (default created_at)
  - `dir` (enum): asc | desc (default desc)

### 1. GET /api/domains

List domains with pagination and filtering options.

#### Query Parameters

| Parameter    | Type    | Default        | Description                                                                                  |
| ------------ | ------- | -------------- | -------------------------------------------------------------------------------------------- |
| `search`     | string  | -              | Search domains by name (case-insensitive)                                                    |
| `dateFilter` | enum    | "all"          | Filter by discovery date: "all", "today", "week", "month"                                    |
| `page`       | integer | 1              | Page number (min: 1)                                                                         |
| `limit`      | integer | 10             | Items per page (min: 1, max: 100)                                                            |
| `sortBy`     | enum    | "last_seen_at" | Sort field: "domain", "first_seen_at", "last_seen_at", "mention_count", "unique_video_count" |
| `sortOrder`  | enum    | "desc"         | Sort order: "asc", "desc"                                                                    |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/domains?search=example&dateFilter=week&page=1&limit=20&sortBy=mention_count&sortOrder=desc" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "domain": "example.com",
      "first_seen_at": "2024-01-15T10:30:00.000Z",
      "last_seen_at": "2024-01-20T15:45:00.000Z",
      "mention_count": 25,
      "unique_video_count": 8,
      "unique_author_count": 12,
      "is_suspicious": false,
      "is_active": true,
      "metadata": null,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-20T15:45:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. GET /api/domains/[id]

Get detailed information about a specific domain, including recent mentions and time series data.

#### Path Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `id`      | UUID | Domain ID   |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/domains/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "domain": "example.com",
    "first_seen_at": "2024-01-15T10:30:00.000Z",
    "last_seen_at": "2024-01-20T15:45:00.000Z",
    "mention_count": 25,
    "unique_video_count": 8,
    "unique_author_count": 12,
    "is_suspicious": false,
    "is_active": true,
    "metadata": null,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-20T15:45:00.000Z",
    "recent_mentions": [
      {
        "id": "mention-id-1",
        "source_type": "comment",
        "context": "Check out this website: example.com",
        "created_at": "2024-01-20T15:45:00.000Z",
        "comment": {
          "id": "comment-id-1",
          "content": "Check out this website: example.com",
          "author_username": "user123",
          "video": {
            "id": "video-id-1",
            "tiktok_id": "7123456789",
            "title": "Amazing product review",
            "url": "https://tiktok.com/@user/video/7123456789"
          }
        }
      }
    ],
    "time_series": [
      {
        "date": "2024-01-14",
        "mention_count": 3
      },
      {
        "date": "2024-01-15",
        "mention_count": 7
      },
      {
        "date": "2024-01-16",
        "mention_count": 12
      }
    ]
  }
}
```

### 3. GET /api/videos

List videos with domain information using cursor-based pagination.

#### Query Parameters

| Parameter     | Type    | Default | Description                                                                    |
| ------------- | ------- | ------- | ------------------------------------------------------------------------------ |
| `cursor`      | string  | -       | Cursor for pagination (base64 encoded timestamp)                               |
| `limit`       | integer | 10      | Items per page (min: 1, max: 100)                                              |
| `search`      | string  | -       | Search in title, description, or TikTok ID                                     |
| `status`      | enum    | "all"   | Filter by scrape status: "all", "pending", "processing", "completed", "failed" |
| `hasComments` | boolean | -       | Filter videos with/without comments                                            |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/videos?limit=10&status=completed&hasComments=true" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "video-id-1",
      "tiktok_id": "7123456789",
      "url": "https://tiktok.com/@user/video/7123456789",
      "title": "Amazing product review",
      "description": "Check out this amazing product!",
      "view_count": 150000,
      "share_count": 2500,
      "comment_count": 1200,
      "is_promoted": true,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "last_scraped_at": "2024-01-15T12:00:00.000Z",
      "scrape_status": "completed",
      "error_message": null,
      "metadata": null,
      "domain_count": 3,
      "domains": [
        {
          "id": "domain-id-1",
          "domain": "example.com",
          "mention_count": 5
        },
        {
          "id": "domain-id-2",
          "domain": "shop.example.org",
          "mention_count": 2
        }
      ],
      "comment_count_with_domains": 7
    }
  ],
  "pagination": {
    "cursor": null,
    "nextCursor": "MjAyNC0wMS0xNVQxMDozMDowMC4wMDBa",
    "hasMore": true,
    "limit": 10
  }
}
```

### 4. GET /api/stats

Get dashboard statistics including totals, trending data, and processing status.

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/stats" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "totalDomains": 1250,
    "newToday": 15,
    "totalMentions": 8500,
    "activeVideos": 450,
    "trending": [
      {
        "domain": "trending-site.com",
        "growth": 150,
        "mentions": 45,
        "domain_id": "domain-id-trending"
      }
    ],
    "processingStatus": {
      "lastRun": "2024-01-20T14:30:00.000Z",
      "status": "completed",
      "videosProcessed": 25,
      "commentsHarvested": 1200,
      "domainsExtracted": 15
    },
    "timeSeriesData": [
      {
        "date": "2024-01-14",
        "domains": 12,
        "mentions": 150
      },
      {
        "date": "2024-01-15",
        "domains": 18,
        "mentions": 220
      },
      {
        "date": "2024-01-16",
        "domains": 15,
        "mentions": 180
      }
    ]
  }
}
```

### 5. POST /api/worker/webhook

Webhook endpoint for worker job status updates. This endpoint is used by the Python worker to report job progress and results.

#### Headers

| Header          | Value                   | Description                   |
| --------------- | ----------------------- | ----------------------------- |
| `Authorization` | `Bearer <worker_token>` | Worker authentication token   |
| `Content-Type`  | `application/json`      | Request content type          |
| `User-Agent`    | Worker identification   | Used for logging and tracking |

#### Request Body

```json
{
  "jobId": "job-uuid",
  "jobType": "discovery" | "comment_harvesting" | "domain_extraction",
  "status": "started" | "completed" | "failed",
  "metadata": {
    "workerVersion": "1.0.0",
    "startTime": "2024-01-20T14:30:00.000Z"
  },
  "error": "Optional error message if status is failed",
  "results": {
    "videosProcessed": 25,
    "commentsHarvested": 1200,
    "domainsExtracted": 15
  }
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/worker/webhook" \
  -H "Authorization: Bearer <worker_token>" \
  -H "Content-Type: application/json" \
  -H "User-Agent: TikTok-Harvester-Worker/1.0.0" \
  -d '{
    "jobId": "550e8400-e29b-41d4-a716-446655440001",
    "jobType": "discovery",
    "status": "completed",
    "metadata": {
      "workerVersion": "1.0.0",
      "startTime": "2024-01-20T14:30:00.000Z"
    },
    "results": {
      "videosProcessed": 25,
      "commentsHarvested": 1200,
      "domainsExtracted": 15
    }
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "message": "Webhook processed successfully",
    "jobId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "completed"
  }
}
```

## Error Handling

### Common HTTP Status Codes

| Status Code | Description                                      |
| ----------- | ------------------------------------------------ |
| 200         | Success                                          |
| 400         | Bad Request - Invalid parameters                 |
| 401         | Unauthorized - Invalid or missing authentication |
| 403         | Forbidden - Insufficient permissions             |
| 404         | Not Found - Resource doesn't exist               |
| 422         | Unprocessable Entity - Validation errors         |
| 429         | Too Many Requests - Rate limit exceeded          |
| 500         | Internal Server Error                            |

### Error Response Examples

#### Validation Error (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "page": ["Must be a positive integer"],
    "limit": ["Must be between 1 and 100"]
  }
}
```

#### Not Found Error (404)

```json
{
  "success": false,
  "error": "Domain not found"
}
```

#### Rate Limit Error (429)

```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 3600 seconds."
}
```

#### Authentication Error (401)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## SDKs and Examples

### JavaScript/TypeScript Example

```typescript
import { HarvesterApiClient } from "@/lib/api";

const client = new HarvesterApiClient({
  baseUrl: "http://localhost:3000/api",
  authToken: "your-jwt-token",
});

// List domains
const domains = await client.domains.list({
  search: "example",
  dateFilter: "week",
  page: 1,
  limit: 20,
});

// Get domain details
const domain = await client.domains.get("550e8400-e29b-41d4-a716-446655440000");

// Get stats
const stats = await client.stats.get();
```

### Python Example

```python
import requests
import json

class HarvesterAPI:
    def __init__(self, base_url, auth_token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }

    def list_domains(self, **params):
        response = requests.get(
            f'{self.base_url}/domains',
            headers=self.headers,
            params=params
        )
        return response.json()

    def get_domain(self, domain_id):
        response = requests.get(
            f'{self.base_url}/domains/{domain_id}',
            headers=self.headers
        )
        return response.json()

# Usage
api = HarvesterAPI('http://localhost:3000/api', 'your-jwt-token')
domains = api.list_domains(search='example', dateFilter='week')
```

## Rate Limiting Details

The API implements a token bucket rate limiting strategy:

- **Default Limit**: 1000 requests per hour per user
- **Burst Allowance**: Up to 100 requests can be made in quick succession
- **Reset Period**: Hourly (3600 seconds)
- **Headers**: Rate limit status is always included in response headers

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

When rate limited, the API returns:

- **Status**: 429 Too Many Requests
- **Retry-After**: Seconds until next request allowed

## Webhook Security

The worker webhook endpoint (`POST /api/worker/webhook`) implements additional security measures:

1. **Bearer Token Authentication**: Requires `WORKER_WEBHOOK_TOKEN` environment variable
2. **User-Agent Validation**: Tracks and logs worker identification
3. **CORS Headers**: Properly configured for worker communication
4. **Request Validation**: All payloads are validated against Zod schemas

## Development and Testing

### Local Development

```bash
# Start the development server
npm run dev

# API will be available at http://localhost:3000/api
```

### Testing Endpoints

All endpoints can be tested using curl, Postman, or any HTTP client. Authentication tokens can be obtained through the Supabase Auth flow.

### Environment Variables

Required environment variables for API functionality:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker Authentication
WORKER_WEBHOOK_TOKEN=your-worker-token

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## API Versioning

Currently, the API is unversioned (v1 implicit). Future versions will be available at:

- `/api/v2/` for version 2
- `/api/v3/` for version 3

Version 1 will be maintained for backward compatibility.
