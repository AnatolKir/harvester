import { extractDomains } from "../../extract/domain";

describe("extractDomains", () => {
  it("extracts simple domain and strips trailing punctuation", () => {
    expect(extractDomains("visit example.com."))
      .toEqual(["example.com"]);
  });

  it("handles protocol and www and path", () => {
    expect(extractDomains("http://www.example.com/path?x=1"))
      .toEqual(["example.com"]);
  });

  it("removes zero-width characters", () => {
    const zeroWidth = "exa\u200Bmple.\u200Bcom";
    expect(extractDomains(`check ${zeroWidth}`))
      .toEqual(["example.com"]);
  });

  it("normalizes simple homoglyph exampIe.com (I->l)", () => {
    expect(extractDomains("exampIe.com")).toEqual(["example.com"]);
  });

  it("keeps punycode xn-- domains", () => {
    expect(extractDomains("xn--fsq.com")).toEqual(["xn--fsq.com"]);
  });

  it("ignores bare dots or punctuation tokens", () => {
    expect(extractDomains("see [.], not a domain"))
      .toEqual([]);
  });

  it("deduplicates repeated domains", () => {
    expect(extractDomains("example.com and https://example.com"))
      .toEqual(["example.com"]);
  });
});


