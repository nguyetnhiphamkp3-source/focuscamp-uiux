/**
 * Render tool results in three modes:
 *   --format json   (default — agent-friendly, pipeable)
 *   --format pretty (colored, human-readable summary)
 *   --format yaml   (configs, structured fields)
 */
import { inspect } from "node:util";
import type { ToolResult } from "./mcp-client.js";

export type OutputFormat = "json" | "pretty" | "yaml";

const isTty = process.stdout.isTTY;

export function defaultFormat(): OutputFormat {
  // Humans default to pretty when interactive, agents/pipes get JSON
  return isTty ? "pretty" : "json";
}

export function emit(result: ToolResult, format: OutputFormat = defaultFormat()): void {
  if (!result.ok) {
    process.stderr.write(`Error: ${result.error ?? "unknown"}\n`);
    process.exit(1);
  }
  switch (format) {
    case "json":
      process.stdout.write(JSON.stringify(result.data, null, 2) + "\n");
      return;
    case "yaml":
      process.stdout.write(toYaml(result.data) + "\n");
      return;
    case "pretty":
      process.stdout.write(toPretty(result.data) + "\n");
      return;
  }
}

function toPretty(data: unknown, indent = 0): string {
  if (data === null || data === undefined) return "—";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return "(empty)";
    return data.map((item, i) => `${i + 1}. ${toPretty(item, indent + 2)}`).join("\n");
  }
  if (typeof data === "object") {
    return inspect(data, { colors: isTty, depth: 4, breakLength: 100 });
  }
  return String(data);
}

function toYaml(data: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (data === null || data === undefined) return "~";
  if (typeof data === "string") {
    return /[:#\n]/.test(data) ? JSON.stringify(data) : data;
  }
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    return data
      .map((item) => `${pad}- ${toYaml(item, indent + 2).trimStart()}`)
      .join("\n");
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => {
        const rendered = toYaml(v, indent + 2);
        if (rendered.includes("\n")) return `${pad}${k}:\n${rendered}`;
        return `${pad}${k}: ${rendered}`;
      })
      .join("\n");
  }
  return String(data);
}
