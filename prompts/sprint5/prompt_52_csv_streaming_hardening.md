# Prompt 52: CSV Streaming Hardening

## Role

You are a Senior API Engineer improving export stability and throughput.

## Goal

Harden streaming CSV endpoints (domains and mentions) for large result sets.

## Deliverables

- Backpressure-friendly iterators in both export routes
- Tests/benchmarks for 100k rows

## Requirements

- Chunked queries with bounded memory; handle timeouts; robust error handling
- Rate-limit headers preserved; standardized error body

## Steps

1. Replace manual loops with async generator that yields CSV chunks.
2. Add try/catch to send partial results with error footer if failure occurs.
3. Add unit test that verifies headers and chunk boundaries.

## Acceptance Criteria

- Can export 100k rows locally without OOM and within reasonable time

## Documentation & Commit

```bash
git add web/src/app/api/domains/export/route.ts web/src/app/api/domains/[id]/mentions/export/route.ts web/src/app/api/__tests__/*
git commit -m "chore(api): harden CSV streaming for large exports"
git push
```
