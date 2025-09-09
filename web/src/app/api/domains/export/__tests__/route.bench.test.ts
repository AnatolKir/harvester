// Use same mock as route.test.ts by relying on global.__csvBatches
jest.mock("@/lib/supabase/server", () => {
  let call = 0;
  const chain = () => ({
    select: jest.fn(() => chain()),
    order: jest.fn(() => chain()),
    gte: jest.fn(() => chain()),
    range: jest.fn(() => {
      // @ts-expect-error test-only global
      const batches =
        (
          global as unknown as {
            __csvBatches?: Array<Record<string, unknown>[]>;
          }
        ).__csvBatches || [];
      const data = batches[call] ?? [];
      call += 1;
      return { data, error: null };
    }),
  });
  return {
    createClient: jest.fn(() => ({ from: jest.fn(() => chain()) })),
  };
});

// Skipped by default; enable locally to stress test streaming
describe.skip("bench: large CSV export", () => {
  it("streams ~100k rows efficiently", async () => {
    // Prepare 100 batches of 1000 rows each (~100k rows)
    // @ts-expect-error test-only global
    global.__csvBatches = Array.from({ length: 100 }, (_, i) =>
      Array.from({ length: 1000 }, (__, j) => ({
        domain: `example-${i}-${j}.com`,
        total_mentions: (i * 1000 + j) % 50,
        first_seen: "2024-01-01T00:00:00.000Z",
        last_seen: "2024-01-02T00:00:00.000Z",
      }))
    ).concat([[]]);

    const { NextRequest } = await import("next/server");
    const { GET } = await import("../route");
    const request = new NextRequest(
      "http://localhost:3000/api/domains/export?dateFilter=all"
    );
    const response = await GET(request);

    const body = (response as unknown as Response)
      .body as ReadableStream<Uint8Array>;
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += (value as Uint8Array).byteLength;
      // Consume chunk (discard)
      decoder.decode(value);
    }

    expect(totalBytes).toBeGreaterThan(0);
  });
});
