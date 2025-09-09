// Domain extraction and normalization utilities
// - Normalizes text, handles zero-widths and simple homoglyphs
// - Skips emails, strips protocol/www, trims trailing punctuation and paths
// - Exposes normalizeDomain(input) → { domainName, tld, subdomain }

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const TRAILING_PUNCT = /[\s\.,;:!?)\]]+$/;

function normalizeHomoglyphs(input: string): string {
  // Minimal mapping to catch common homoglyph tricks in domains
  // Note: Conservative to avoid false positives
  return input.replace(/(?<=\w)I(?=\w)/g, "l"); // exampIe.com -> example.com
}

function cleanToken(token: string): string {
  let t = token.trim();
  t = t.replace(/^https?:\/\//i, "");
  t = t.replace(/^www\./i, "");
  t = t.replace(TRAILING_PUNCT, "");
  // Remove path/query/fragment
  const cut = Math.min(
    ...["/", "?", "#"].map((ch) => {
      const idx = t.indexOf(ch);
      return idx === -1 ? Number.POSITIVE_INFINITY : idx;
    })
  );
  if (Number.isFinite(cut)) t = t.slice(0, cut as number);
  return t.toLowerCase();
}

// Common multi-label TLDs (non-exhaustive but covers many cases)
const MULTI_TLDS = new Set([
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
  "co.jp",
  "ne.jp",
  "or.jp",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "org.nz",
  "com.br",
  "com.mx",
  "com.tr",
  "com.cn",
  "co.cn",
  "co.in",
  "com.sg",
]);

export function normalizeDomain(input: string): {
  domainName: string; // registrable apex, e.g., example.com or example.co.uk
  tld: string; // tld part, e.g., com or co.uk
  subdomain: string | null; // sub part if present, e.g., sub or a.b
} | null {
  const token = cleanToken(input);
  if (!token) return null;
  const labels = token.split(".");
  if (labels.length < 2) return null;

  // Try multi-part tld first
  const lastTwo = labels.slice(-2).join(".");
  const lastThree = labels.slice(-3).join(".");
  let tld = labels[labels.length - 1];
  let registrableIndex = labels.length - 2; // default apex size 2

  if (MULTI_TLDS.has(lastTwo)) {
    tld = lastTwo;
    registrableIndex = labels.length - 3;
  } else if (MULTI_TLDS.has(lastThree)) {
    tld = lastThree;
    registrableIndex = labels.length - 4;
  }

  if (registrableIndex < 0) return null;
  const domainLabel = labels[registrableIndex];
  const domainName = `${domainLabel}.${tld}`;
  const subdomain =
    registrableIndex > 0 ? labels.slice(0, registrableIndex).join(".") : null;

  return { domainName, tld, subdomain };
}

export function extractDomains(text: string): string[] {
  if (!text) return [];

  // Normalize Unicode and remove zero-widths
  let input = text.normalize("NFKC").replace(ZERO_WIDTH, "");
  input = normalizeHomoglyphs(input);

  // Regex: domain labels (alnum + hyphen), dots, TLD 2+; allow punycode xn--
  const domainRegex =
    /\b(?:(?:https?:\/\/)?(?:www\.)?)((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9-]{2,}))\b[^\s]*/g;

  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = domainRegex.exec(input)) !== null) {
    // Skip emails: if an '@' directly precedes the token without whitespace
    const start = m.index;
    if (start > 0 && input[start - 1] === "@") {
      continue;
    }
    const raw = m[0];
    const cleaned = cleanToken(raw);
    if (!cleaned || cleaned === ".") continue;
    found.add(cleaned);
  }
  return Array.from(found);
}

export function dedupeNormalized(
  domains: string[]
): { domainName: string; tld: string; subdomain: string | null }[] {
  const out: { domainName: string; tld: string; subdomain: string | null }[] =
    [];
  const seen = new Set<string>();
  for (const d of domains) {
    const n = normalizeDomain(d);
    if (!n) continue;
    if (seen.has(n.domainName)) continue;
    seen.add(n.domainName);
    out.push(n);
  }
  return out;
}
