import {
  extractDomainsFromText,
  normalizeDomain,
  isValidDomain,
  isUrlShortener,
  categorizeDomain,
  batchExtractDomains
} from '../domain-utils';

describe('Domain Utilities', () => {
  describe('extractDomainsFromText', () => {
    it('should extract domains from text with URLs', () => {
      const text = 'Check out https://example.com and www.test.org for more info';
      const domains = extractDomainsFromText(text);
      expect(domains).toEqual(['example.com', 'test.org']);
    });

    it('should extract domains without protocol', () => {
      const text = 'Visit example.com or test.net today';
      const domains = extractDomainsFromText(text);
      expect(domains).toEqual(['example.com', 'test.net']);
    });

    it('should handle empty or invalid input', () => {
      expect(extractDomainsFromText('')).toEqual([]);
      expect(extractDomainsFromText(null as any)).toEqual([]);
      expect(extractDomainsFromText(undefined as any)).toEqual([]);
    });

    it('should remove duplicates', () => {
      const text = 'example.com is great, visit example.com now';
      const domains = extractDomainsFromText(text);
      expect(domains).toEqual(['example.com']);
    });

    it('should filter blacklisted domains', () => {
      const text = 'Visit facebook.com, twitter.com, and mysite.com';
      const domains = extractDomainsFromText(text);
      expect(domains).toEqual(['mysite.com']);
    });

    it('should handle complex URLs with paths', () => {
      const text = 'Check https://example.com/path/to/page?query=1#hash';
      const domains = extractDomainsFromText(text);
      expect(domains).toEqual(['example.com']);
    });
  });

  describe('normalizeDomain', () => {
    it('should normalize domains correctly', () => {
      expect(normalizeDomain('HTTPS://WWW.EXAMPLE.COM/')).toBe('example.com');
      expect(normalizeDomain('http://example.com')).toBe('example.com');
      expect(normalizeDomain('www.example.com')).toBe('example.com');
      expect(normalizeDomain('example.com/')).toBe('example.com');
    });

    it('should remove paths and query parameters', () => {
      expect(normalizeDomain('example.com/path')).toBe('example.com');
      expect(normalizeDomain('example.com?query=1')).toBe('example.com');
      expect(normalizeDomain('example.com#section')).toBe('example.com');
    });

    it('should handle empty input', () => {
      expect(normalizeDomain('')).toBe('');
      expect(normalizeDomain(null as any)).toBe('');
    });
  });

  describe('isValidDomain', () => {
    it('should validate correct domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('example.co.uk')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('abc')).toBe(false);
      expect(isValidDomain('a.b')).toBe(false); // Too short
      expect(isValidDomain('.com')).toBe(false);
    });

    it('should reject blacklisted domains', () => {
      expect(isValidDomain('facebook.com')).toBe(false);
      expect(isValidDomain('tiktok.com')).toBe(false);
    });

    it('should reject domains with invalid characters', () => {
      expect(isValidDomain('exam ple.com')).toBe(false);
      expect(isValidDomain('exam@ple.com')).toBe(false);
    });
  });

  describe('isUrlShortener', () => {
    it('should identify URL shorteners', () => {
      expect(isUrlShortener('bit.ly')).toBe(true);
      expect(isUrlShortener('tinyurl.com')).toBe(true);
      expect(isUrlShortener('t.co')).toBe(true);
    });

    it('should not identify regular domains as shorteners', () => {
      expect(isUrlShortener('example.com')).toBe(false);
      expect(isUrlShortener('google.com')).toBe(false);
    });

    it('should handle URLs with protocol', () => {
      expect(isUrlShortener('https://bit.ly')).toBe(true);
      expect(isUrlShortener('http://www.tinyurl.com')).toBe(true);
    });
  });

  describe('categorizeDomain', () => {
    it('should categorize shorteners', () => {
      expect(categorizeDomain('bit.ly')).toBe('shortener');
      expect(categorizeDomain('tinyurl.com')).toBe('shortener');
    });

    it('should categorize suspicious domains', () => {
      expect(categorizeDomain('192.168.1.1')).toBe('suspicious');
      expect(categorizeDomain('example.tk')).toBe('suspicious');
      expect(categorizeDomain('site12345678.com')).toBe('suspicious');
    });

    it('should categorize standard domains', () => {
      expect(categorizeDomain('example.com')).toBe('standard');
      expect(categorizeDomain('mysite.org')).toBe('standard');
    });
  });

  describe('batchExtractDomains', () => {
    it('should extract domains from multiple texts', () => {
      const texts = [
        'Visit example.com',
        'Check out test.org and example.com',
        'New site: demo.net'
      ];
      
      const domainMap = batchExtractDomains(texts);
      
      expect(domainMap.size).toBe(3);
      expect(domainMap.has('example.com')).toBe(true);
      expect(domainMap.get('example.com')?.size).toBe(2);
      expect(domainMap.has('test.org')).toBe(true);
      expect(domainMap.has('demo.net')).toBe(true);
    });

    it('should handle empty array', () => {
      const domainMap = batchExtractDomains([]);
      expect(domainMap.size).toBe(0);
    });

    it('should handle texts with no domains', () => {
      const texts = ['No domains here', 'Just plain text'];
      const domainMap = batchExtractDomains(texts);
      expect(domainMap.size).toBe(0);
    });
  });
});