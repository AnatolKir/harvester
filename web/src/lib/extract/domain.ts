// Domain extraction utility
// Normalizes text, handles zero-widths and simple homoglyphs, strips protocol/www, and returns unique domains

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
  const slash = t.indexOf("/");
  if (slash !== -1) t = t.slice(0, slash);
  return t.toLowerCase();
}

export function extractDomains(text: string): string[] {
  if (!text) return [];

  // Normalize Unicode and remove zero-widths
  let input = text.normalize("NFKC").replace(ZERO_WIDTH, "");
  input = normalizeHomoglyphs(input);

  // Regex: domain labels (alnum + hyphen), dots, TLD 2+; allow punycode xn--
  const domainRegex = /\b(?:(?:https?:\/\/)?(?:www\.)?)((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9-]{2,}))\b[^\s]*/g;

  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = domainRegex.exec(input)) !== null) {
    const raw = m[0];
    const cleaned = cleanToken(raw);
    if (!cleaned || cleaned === ".") continue;
    found.add(cleaned);
  }
  return Array.from(found);
}


