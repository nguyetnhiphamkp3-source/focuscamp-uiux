/**
 * Thin MCP client that calls focus.camp's Streamable HTTP endpoint.
 * Every CLI command resolves through `callTool(name, args)`.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Config } from "./config.js";

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export class FcClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;
  private connected = false;

  constructor(private cfg: Config) {
    this.transport = new StreamableHTTPClientTransport(new URL(cfg.baseUrl), {
      requestInit: {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      },
    });
    this.client = new Client(
      { name: "fc-cli", version: "0.1.0" },
      { capabilities: {} },
    );
  }

  private async connect(): Promise<void> {
    if (this.connected) return;
    await this.client.connect(this.transport);
    this.connected = true;
  }

  async listTools(): Promise<Array<{ name: string; description?: string }>> {
    await this.connect();
    const res = await this.client.listTools();
    return res.tools.map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    await this.connect();
    try {
      const res = await this.client.callTool({ name, arguments: args });
      const text = (res.content as Array<{ type: string; text?: string }>)
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n");
      // Most tools return JSON-stringified data — try to parse for nicer output.
      try {
        return { ok: !res.isError, data: JSON.parse(text) };
      } catch {
        return { ok: !res.isError, data: text };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.transport.close().catch(() => {});
      this.connected = false;
    }
  }
}
