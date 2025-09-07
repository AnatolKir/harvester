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
  async call(
    tool: string,
    params: Record<string, any>,
    { sticky = false, sessionId }: { sticky?: boolean; sessionId?: string } = {}
  ) {
    const body = { tool, params, sticky, sessionId, stickyTtlMin: this.stickyMin };
    const res = await this.fetcher(`${this.base}/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`MCP ${tool} ${res.status}: ${await res.text()}`);
    return res.json();
  }
}


