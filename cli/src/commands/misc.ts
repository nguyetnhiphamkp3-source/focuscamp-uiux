import { Command } from "commander";
import { requireConfig } from "../config.js";
import { FcClient } from "../mcp-client.js";
import { emit, type OutputFormat } from "../output.js";

export function courseCommand(): Command {
  const cmd = new Command("course").description("Courses and lessons");

  cmd
    .command("create")
    .description("Create a new course")
    .requiredOption("--slug <slug>")
    .requiredOption("--title <title>")
    .option("--description <desc>")
    .option("--required-tier <tier>")
    .option("-f, --format <fmt>")
    .action(async (opts: { slug: string; title: string; description?: string; requiredTier?: string; format?: OutputFormat }) => {
      const args: Record<string, unknown> = { slug: opts.slug, title: opts.title };
      if (opts.description) args.description = opts.description;
      if (opts.requiredTier) args.requiredTier = opts.requiredTier;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("courses_create", args), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("lesson <courseId>")
    .description("Append a lesson to a course")
    .requiredOption("--title <title>")
    .option("--video-url <url>")
    .option("--body <text>")
    .option("-f, --format <fmt>")
    .action(async (courseId: string, opts: { title: string; videoUrl?: string; body?: string; format?: OutputFormat }) => {
      const args: Record<string, unknown> = { courseId, title: opts.title };
      if (opts.videoUrl) args.videoUrl = opts.videoUrl;
      if (opts.body) args.body = opts.body;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("courses_add_lesson", args), opts.format);
      } finally {
        await client.close();
      }
    });

  return cmd;
}

export function xpCommand(): Command {
  const cmd = new Command("xp").description("XP ledger");
  cmd
    .command("recent")
    .description("Recent XP events in the community")
    .option("--limit <n>", "", (v) => parseInt(v, 10), 30)
    .option("-f, --format <fmt>")
    .action(async (opts: { limit: number; format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("xp_list_recent", { limit: opts.limit }), opts.format);
      } finally {
        await client.close();
      }
    });
  return cmd;
}

export function notifyCommand(): Command {
  const cmd = new Command("notify").description("Send notifications to members");
  cmd
    .command("send")
    .description("Push a notification to one or all members")
    .option("--user-id <id>", "Target one member (omit for broadcast)")
    .requiredOption("--title <title>")
    .option("--body <text>")
    .option("--url <url>", "Optional click-through link")
    .option("-f, --format <fmt>")
    .action(async (opts: { userId?: string; title: string; body?: string; url?: string; format?: OutputFormat }) => {
      const args: Record<string, unknown> = { title: opts.title };
      if (opts.userId) args.userId = opts.userId;
      if (opts.body) args.body = opts.body;
      if (opts.url) args.url = opts.url;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("notifications_send", args), opts.format);
      } finally {
        await client.close();
      }
    });
  return cmd;
}

export function toolsCommand(): Command {
  const cmd = new Command("tools").description("List every MCP tool the server exposes");
  cmd.option("-f, --format <fmt>").action(async (opts: { format?: OutputFormat }) => {
    const client = new FcClient(requireConfig());
    try {
      const tools = await client.listTools();
      emit({ ok: true, data: tools }, opts.format);
    } finally {
      await client.close();
    }
  });
  return cmd;
}
