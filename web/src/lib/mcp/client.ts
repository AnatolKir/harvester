// Lightweight MCP client wrapper
export type MCPOptions = {
  baseUrl: string;
  apiKey: string;
  stickyMinutes?: number;
  fetchImpl?: typeof fetch;
};

export class MCPClient {
  private base: string;
  private key: string;
  private stickyMin: number;
  private fetcher: typeof fetch;
  constructor(opts: MCPOptions) {
    this.base = opts.baseUrl.replace(/\/+$/, "");
    this.key = opts.apiKey;
    this.stickyMin = opts.stickyMinutes ?? 10;
    this.fetcher = opts.fetchImpl ?? fetch;
  }
  /** Thin, structured MCP error with classification */
  static classify(status?: number, message?: string) {
    const isRateLimit = status === 429;
    const is5xx = typeof status === "number" && status >= 500 && status <= 599;
    const isNetworkOrUnknown = status === null || status === undefined;
    const isTransient = isRateLimit || is5xx || isNetworkOrUnknown;
    return { isTransient, isRateLimit, status, message };
  }
  static toSnippet(body: unknown): string {
    try {
      const text = typeof body === "string" ? body : JSON.stringify(body);
      return text.length > 300 ? text.slice(0, 300) + "…" : text;
    } catch {
      return String(body ?? "");
    }
  }
  static MCPError = class MCPError extends Error {
    status?: number;
    bodySnippet?: string;
    isTransient: boolean;
    isRateLimit: boolean;
    constructor(message: string, opts: { status?: number; body?: unknown }) {
      super(message);
      this.name = "MCPError";
      const { isTransient, isRateLimit } = MCPClient.classify(
        opts.status,
        message
      );
      this.isTransient = isTransient;
      this.isRateLimit = isRateLimit;
      this.status = opts.status;
      this.bodySnippet = MCPClient.toSnippet(opts.body);
    }
  };
  async call(
    tool: string,
    params: Record<string, any>,
    {
      sticky = false,
      sessionId,
      idempotencyKey,
    }: { sticky?: boolean; sessionId?: string; idempotencyKey?: string } = {}
  ) {
    const body = {
      tool,
      params,
      sticky,
      sessionId,
      stickyTtlMin: this.stickyMin,
    };
    try {
      const res = await this.fetcher(`${this.base}/mcp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new MCPClient.MCPError(`MCP ${tool} ${res.status}`, {
          status: res.status,
          body: text,
        });
      }
      return res.json();
    } catch (err: any) {
      if (err?.name === "MCPError") throw err;
      // Network or unknown error
      throw new MCPClient.MCPError(`MCP ${tool} request failed`, {
        status: undefined,
        body: String(err?.message ?? err),
      });
    }
  }
}
