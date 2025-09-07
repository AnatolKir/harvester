import { z } from "zod";

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const SearchSchema = z.object({
  search: z.string().min(1).max(255).optional(),
});

export const DateFilterSchema = z.object({
  dateFilter: z.enum(["all", "today", "week", "month"]).default("all"),
});

export const SortSchema = z.object({
  sortBy: z
    .enum([
      "domain",
      "first_seen",
      "last_seen",
      "total_mentions",
      "unique_videos",
    ])
    .default("last_seen"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Combined schemas for endpoints
export const DomainsQuerySchema = PaginationSchema.merge(SearchSchema)
  .merge(DateFilterSchema)
  .merge(SortSchema);

export const VideosQuerySchema = CursorPaginationSchema.merge(
  SearchSchema
).merge(
  z.object({
    status: z
      .enum(["all", "pending", "processing", "completed", "failed"])
      .default("all"),
    hasComments: z.coerce.boolean().optional(),
  })
);

export const DomainIdSchema = z.object({
  id: z.string().uuid(),
});

// Worker webhook schemas
export const WorkerWebhookSchema = z.object({
  jobId: z.string(),
  jobType: z.enum(["discovery", "comment_harvesting", "domain_extraction"]),
  status: z.enum(["started", "completed", "failed"]),
  metadata: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  results: z
    .object({
      videosProcessed: z.number().optional(),
      commentsHarvested: z.number().optional(),
      domainsExtracted: z.number().optional(),
    })
    .optional(),
});

// Response schemas
export const DomainResponseSchema = z.object({
  id: z.string(),
  domain: z.string(),
  first_seen: z.string(),
  last_seen: z.string(),
  total_mentions: z.number(),
  unique_videos: z.number(),
  unique_author_count: z.number(),
  is_suspicious: z.boolean(),
  is_active: z.boolean(),
});

export const VideoResponseSchema = z.object({
  id: z.string(),
  video_id: z.string(),
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  view_count: z.number(),
  share_count: z.number(),
  comment_count: z.number(),
  is_promoted: z.boolean(),
  scrape_status: z.enum(["pending", "processing", "completed", "failed"]),
  last_scraped_at: z.string().nullable(),
  domain_count: z.number().optional(),
});

// Type exports
export type DomainsQuery = z.infer<typeof DomainsQuerySchema>;
export type VideosQuery = z.infer<typeof VideosQuerySchema>;
export type DomainId = z.infer<typeof DomainIdSchema>;
export type WorkerWebhook = z.infer<typeof WorkerWebhookSchema>;
export type DomainResponse = z.infer<typeof DomainResponseSchema>;
export type VideoResponse = z.infer<typeof VideoResponseSchema>;
