# Prompt 17: Extractor Tests

Scope
- Validate extraction against tricky inputs and ensure normalization.

Cases
- Dots only / punctuation-only tokens are ignored.
- Zero-width characters stripped.
- Simple homoglyphs (exampIe.com → example.com).
- Protocol/www/path stripped.
- Trailing punctuation stripped.
- Punycode xn-- supported.

Acceptance
- Tests in `web/src/lib/extract/__tests__/domain.test.ts` pass.
- Add more samples if provider shows evasion patterns.
