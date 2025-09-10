const DOMAIN_REGEX =
  /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})/gi;
const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "t.co",
  "buff.ly",
  "short.link",
  "surl.li",
  "is.gd",
  "cli.gs",
]);

const BLACKLISTED_DOMAINS = new Set([
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "youtube.com",
  "google.com",
  "amazon.com",
  "apple.com",
]);

export function extractDomainsFromText(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const matches = text.matchAll(DOMAIN_REGEX);
  const domains = new Set<string>();

  for (const match of matches) {
    const domain = normalizeDomain(match[1]);
    if (domain && isValidDomain(domain)) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
}

export function normalizeDomain(domain: string): string {
  if (!domain) return "";

  // Remove protocol and www
  let normalized = domain.toLowerCase().trim();
  normalized = normalized.replace(/^(?:https?:\/\/)?(?:www\.)?/, "");
  normalized = normalized.replace(/\/$/, ""); // Remove trailing slash

  // Remove path, query params, and hash
  normalized = normalized.split("/")[0];
  normalized = normalized.split("?")[0];
  normalized = normalized.split("#")[0];

  return normalized;
}

export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length < 4) return false;

  // Check if it's blacklisted
  if (BLACKLISTED_DOMAINS.has(domain)) return false;

  // Basic validation
  const parts = domain.split(".");
  if (parts.length < 2) return false;

  // Check TLD is at least 2 chars
  const tld = parts[parts.length - 1];
  if (tld.length < 2) return false;

  // Check for valid characters
  const validDomainRegex = /^[a-z0-9.-]+$/;
  if (!validDomainRegex.test(domain)) return false;

  return true;
}

export function isUrlShortener(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  return URL_SHORTENERS.has(normalized);
}

export function categorizeDomain(
  domain: string
): "standard" | "shortener" | "suspicious" {
  const normalized = normalizeDomain(domain);

  if (isUrlShortener(normalized)) {
    return "shortener";
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^\d+\.\d+\.\d+\.\d+$/, // IP addresses
    /[0-9]{5,}/, // Too many numbers
    /^[^.]+$/, // No TLD
    /\.(tk|ml|ga|cf)$/, // Suspicious TLDs
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(normalized)) {
      return "suspicious";
    }
  }

  return "standard";
}

export function batchExtractDomains(texts: string[]): Map<string, Set<string>> {
  const domainMap = new Map<string, Set<string>>();

  for (const text of texts) {
    const domains = extractDomainsFromText(text);
    for (const domain of domains) {
      if (!domainMap.has(domain)) {
        domainMap.set(domain, new Set());
      }
      domainMap.get(domain)!.add(text);
    }
  }

  return domainMap;
}
