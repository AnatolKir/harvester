import { NextRequest } from "next/server";

export interface SecurityHeaderConfig {
  isDevelopment: boolean;
  allowTikTok: boolean;
  supabaseUrl?: string;
}

function getHostnameFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return null;
  }
}

export function buildCSP(config: SecurityHeaderConfig): string {
  const { isDevelopment, allowTikTok, supabaseUrl } = config;

  const supabaseOrigin = getHostnameFromUrl(supabaseUrl);

  const tiktokOrigins = allowTikTok
    ? [
        "https://www.tiktok.com",
        "https://*.tiktokcdn.com",
        "https://*.ttwstatic.com",
      ]
    : [];

  const scriptSrc = [
    "'self'",
    allowTikTok ? "https://www.tiktok.com" : null,
    isDevelopment ? "'unsafe-eval'" : null,
    "'unsafe-inline'", // keep non-breaking; can be tightened with nonces later
  ].filter(Boolean) as string[];

  const styleSrc = ["'self'", "'unsafe-inline'"]; // Next.js injects inline styles

  const connectSrc = [
    "'self'",
    "https://vitals.vercel-insights.com",
    supabaseOrigin,
    allowTikTok ? "https://www.tiktok.com" : null,
    allowTikTok ? "https://*.tiktokcdn.com" : null,
  ].filter(Boolean) as string[];

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    allowTikTok ? "https://*.tiktokcdn.com" : null,
  ].filter(Boolean) as string[];

  const frameSrc = [
    "'self'",
    allowTikTok ? "https://www.tiktok.com" : null,
  ].filter(Boolean) as string[];

  const fontSrc = ["'self'", "data:"];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "form-action": ["'self'"],
    "script-src": scriptSrc,
    "style-src": styleSrc,
    "img-src": imgSrc,
    "font-src": fontSrc,
    "connect-src": connectSrc,
    "frame-src": frameSrc,
  };

  // Build CSP string
  const csp = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Add upgrade-insecure-requests in production
  return isDevelopment ? csp : `${csp}; upgrade-insecure-requests`;
}

export function buildSecurityHeaders(req: NextRequest): Record<string, string> {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const allowTikTokEnv = process.env.ALLOW_TIKTOK_EMBEDS;
  const allowTikTok = allowTikTokEnv
    ? allowTikTokEnv.toLowerCase() === "true"
    : true;

  const csp = buildCSP({
    isDevelopment,
    allowTikTok,
    supabaseUrl,
  });

  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };

  // Only set HSTS on HTTPS in production (Vercel also sets this via vercel.json)
  if (!isDevelopment) {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload";
  }

  return headers;
}

export function applySecurityHeaders(
  response: Response,
  headers: Record<string, string>
): Response {
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}
