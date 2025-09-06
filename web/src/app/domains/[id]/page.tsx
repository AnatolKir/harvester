"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Activity,
  Calendar,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

// Mock data - in real app this would come from API
const mockDomainDetails = {
  id: "1",
  domain: "shopify.com",
  first_seen: "2024-01-15T08:00:00Z",
  last_seen: "2024-01-15T14:30:00Z",
  total_mentions: 24,
  unique_videos: 8,
  unique_authors: 12,
  is_suspicious: false,
  created_at: "2024-01-15T08:00:00Z",
  updated_at: "2024-01-15T14:30:00Z",
};

const mockComments = [
  {
    id: "c1",
    author_username: "user123",
    author_display_name: "Shopping Enthusiast",
    content: "Check out my store at shopify.com/mystore for amazing deals!",
    like_count: 45,
    reply_count: 3,
    posted_at: "2024-01-15T14:00:00Z",
    video_title: "Best Products 2024",
    video_id: "v1",
  },
  {
    id: "c2",
    author_username: "seller456",
    author_display_name: "Fashion Seller",
    content:
      "We just launched our new collection on shopify.com! Use code TIKTOK20 for discount",
    like_count: 128,
    reply_count: 15,
    posted_at: "2024-01-15T12:30:00Z",
    video_title: "Fashion Trends",
    video_id: "v2",
  },
  {
    id: "c3",
    author_username: "reviewer789",
    author_display_name: "Product Reviewer",
    content:
      "I bought from their shopify.com store and the quality is amazing!",
    like_count: 67,
    reply_count: 8,
    posted_at: "2024-01-15T10:15:00Z",
    video_title: "Honest Review",
    video_id: "v3",
  },
];

const mockVideos = [
  {
    id: "v1",
    title: "Best Products 2024",
    url: "https://tiktok.com/@user/video/123",
    view_count: 125000,
    comment_count: 342,
    share_count: 89,
    is_promoted: true,
  },
  {
    id: "v2",
    title: "Fashion Trends",
    url: "https://tiktok.com/@seller/video/456",
    view_count: 89000,
    comment_count: 234,
    share_count: 56,
    is_promoted: true,
  },
  {
    id: "v3",
    title: "Honest Review",
    url: "https://tiktok.com/@reviewer/video/789",
    view_count: 45000,
    comment_count: 123,
    share_count: 34,
    is_promoted: false,
  },
];

export default function DomainDetailPage() {
  const params = useParams();
  const domainId = params.id as string;

  // In real app, fetch domain details based on domainId
  const domain = mockDomainDetails;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/domains">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Domains
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <Globe className="text-muted-foreground h-5 w-5" />
              <h1 className="text-3xl font-bold tracking-tight">
                {domain.domain}
              </h1>
              {domain.is_suspicious && (
                <Badge variant="destructive">Suspicious</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              First seen {formatDate(domain.first_seen)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://${domain.domain}`, "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Visit Domain
        </Button>
      </div>

      {/* Alert if suspicious */}
      {domain.is_suspicious && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Activity Detected</AlertTitle>
          <AlertDescription>
            This domain has been mentioned {domain.total_mentions} times across
            multiple videos, which is higher than typical organic mentions.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Mentions
            </CardTitle>
            <MessageSquare className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domain.total_mentions}</div>
            <p className="text-muted-foreground text-xs">
              Across all videos and comments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Videos</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domain.unique_videos}</div>
            <p className="text-muted-foreground text-xs">
              Videos containing this domain
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Authors
            </CardTitle>
            <Hash className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domain.unique_authors}</div>
            <p className="text-muted-foreground text-xs">
              Different users mentioning
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Seen</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(domain.last_seen).toLocaleDateString()}
            </div>
            <p className="text-muted-foreground text-xs">
              {new Date(domain.last_seen).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Comments and Videos */}
      <Tabs defaultValue="comments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comments">
            Comments ({mockComments.length})
          </TabsTrigger>
          <TabsTrigger value="videos">Videos ({mockVideos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Comments</CardTitle>
              <CardDescription>
                Comments from TikTok videos mentioning {domain.domain}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockComments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-muted space-y-2 border-l-2 pl-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">
                          @{comment.author_username}
                        </span>
                        {comment.author_display_name && (
                          <span className="text-muted-foreground text-sm">
                            ({comment.author_display_name})
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      <div className="text-muted-foreground flex items-center space-x-4 text-xs">
                        <span>{comment.like_count} likes</span>
                        <span>{comment.reply_count} replies</span>
                        <span>{formatDate(comment.posted_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    From video:{" "}
                    <span className="font-medium">{comment.video_title}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Videos</CardTitle>
              <CardDescription>
                TikTok videos where {domain.domain} was mentioned
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{video.title}</span>
                      {video.is_promoted && (
                        <Badge variant="secondary">Promoted</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                      <span>{video.view_count.toLocaleString()} views</span>
                      <span>{video.comment_count} comments</span>
                      <span>{video.share_count} shares</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(video.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
