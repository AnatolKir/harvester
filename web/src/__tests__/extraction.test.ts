import {
  extractDomains,
  normalizeDomain,
  dedupeNormalized,
} from "../lib/extract/domain";

describe("extraction & normalization", () => {
  test("basic domain and trailing punctuation", () => {
    expect(extractDomains("visit example.com.")).toEqual(["example.com"]);
  });

  test("protocol, www and path trimmed", () => {
    expect(extractDomains("https://www.example.com/path?q=1")).toEqual([
      "example.com",
    ]);
  });

  test("emails are ignored", () => {
    expect(extractDomains("email me at person@example.com please")).toEqual([]);
  });

  test("zero-width removed + homoglyph normalize", () => {
    const zw = "examp\u200Ble.com";
    expect(extractDomains(zw)).toEqual(["example.com"]);
  });

  test("punycode kept", () => {
    expect(extractDomains("xn--fsq.com")).toEqual(["xn--fsq.com"]);
  });

  test("dedupeNormalized returns unique apex", () => {
    const list = ["http://example.com", "www.example.com", "example.com/"];
    const deduped = dedupeNormalized(list);
    expect(deduped.map((d) => d.domainName)).toEqual(["example.com"]);
  });

  test("normalizeDomain simple com", () => {
    expect(normalizeDomain("sub.example.com")).toEqual({
      domainName: "example.com",
      tld: "com",
      subdomain: "sub",
    });
  });

  test("normalizeDomain multi-part tld co.uk", () => {
    expect(normalizeDomain("a.b.example.co.uk")).toEqual({
      domainName: "example.co.uk",
      tld: "co.uk",
      subdomain: "a.b",
    });
  });

  test("normalizeDomain returns null on invalid", () => {
    expect(normalizeDomain("localhost")).toBeNull();
  });

  const vectors: Array<{ input: string; expectDomains: string[] }> = [
    { input: "Check example.com!", expectDomains: ["example.com"] },
    { input: "www.example.com", expectDomains: ["example.com"] },
    { input: "Visit http://example.org/path", expectDomains: ["example.org"] },
    { input: "Multiple a.com, b.com", expectDomains: ["a.com", "b.com"] },
    { input: "Email user@a.com should be ignored", expectDomains: [] },
    { input: "Emoji 😀 example.net 😀", expectDomains: ["example.net"] },
    { input: "Mixed CAPS EXAMPLE.COM", expectDomains: ["example.com"] },
    { input: "sub.domain.co.uk", expectDomains: ["domain.co.uk"] },
    {
      input: "xn--fsq.com and http://xn--fsq.com/x",
      expectDomains: ["xn--fsq.com"],
    },
    { input: "https://sub.example.co.jp/", expectDomains: ["example.co.jp"] },
    { input: "http://a.b.c.d.com", expectDomains: ["d.com"] },
    { input: "Trailing: site.io)", expectDomains: ["site.io"] },
    { input: "www.site.com?x=1", expectDomains: ["site.com"] },
    {
      input: "co.in sample: news.co.in and www.news.co.in",
      expectDomains: ["news.co.in"],
    },
    { input: "com.au sample: a.b.c.com.au", expectDomains: ["c.com.au"] },
    { input: "No domains here", expectDomains: [] },
    { input: "Edge ....", expectDomains: [] },
    {
      input: "URL with fragment https://example.com/#top",
      expectDomains: ["example.com"],
    },
    { input: "At end example.dev", expectDomains: ["example.dev"] },
    {
      input: "subdomain.multi.level.example.com",
      expectDomains: ["example.com"],
    },
    { input: "co.nz multi : test.co.nz", expectDomains: ["test.co.nz"] },
    { input: "Registrar style example.com,", expectDomains: ["example.com"] },
    {
      input: "Sentence with two example.com foo.example.com",
      expectDomains: ["example.com"],
    },
    { input: "br tld foo.com.br", expectDomains: ["foo.com.br"] },
    { input: "mx tld foo.com.mx", expectDomains: ["foo.com.mx"] },
    { input: "tr tld foo.com.tr", expectDomains: ["foo.com.tr"] },
    { input: "sg tld foo.com.sg", expectDomains: ["foo.com.sg"] },
    { input: "jp tld bar.co.jp", expectDomains: ["bar.co.jp"] },
    { input: "au tld bar.net.au", expectDomains: ["bar.net.au"] },
    { input: "nz tld bar.org.nz", expectDomains: ["bar.org.nz"] },
    { input: "uk org bar.org.uk", expectDomains: ["bar.org.uk"] },
    // omit bare registry-only domains like gov.uk (no registrable label)
    { input: "co.cn example.co.cn", expectDomains: ["example.co.cn"] },
    { input: "hyphen label my-site.com", expectDomains: ["my-site.com"] },
    { input: "digits 123site.com", expectDomains: ["123site.com"] },
    { input: "dash end not allowed -site.com", expectDomains: ["site.com"] },
    { input: "start char ok a-site.com", expectDomains: ["a-site.com"] },
    { input: "https and path http://a.com/b/c?d=e", expectDomains: ["a.com"] },
    {
      input: "two same example.com example.com",
      expectDomains: ["example.com"],
    },
    { input: "path like example.com/foo/bar.", expectDomains: ["example.com"] },
    { input: "paren (example.com)", expectDomains: ["example.com"] },
    { input: "braces [example.com]", expectDomains: ["example.com"] },
    { input: "comma example.com, next", expectDomains: ["example.com"] },
    { input: "semicolon example.com; next", expectDomains: ["example.com"] },
    { input: "colon example.com: next", expectDomains: ["example.com"] },
    { input: "exclam example.com!", expectDomains: ["example.com"] },
    { input: "question example.com?", expectDomains: ["example.com"] },
    { input: "email-like name@example.com/domain", expectDomains: [] },
    { input: "with underscore not domain a_b.com", expectDomains: [] },
    // omit synthetic tld cases like xn--abcd.example from negative vectors
  ];

  for (const v of vectors) {
    test(`vector: ${v.input}`, () => {
      const out = dedupeNormalized(extractDomains(v.input))
        .map((n) => n.domainName)
        .sort();
      expect(out).toEqual(v.expectDomains.sort());
    });
  }
});
