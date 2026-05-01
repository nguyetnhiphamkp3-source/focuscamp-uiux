import { readFileSync } from "node:fs";
import { Command } from "commander";
import { requireConfig } from "../config.js";
import { FcClient } from "../mcp-client.js";
import { emit, type OutputFormat } from "../output.js";

/**
 * Read post body from --body, --body-file, or stdin (`fc post create -`).
 */
async function resolveBody(opts: { body?: string; bodyFile?: string }): Promise<string | undefined> {
  if (opts.body) return opts.body;
  if (opts.bodyFile) {
    if (opts.bodyFile === "-") {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
      return Buffer.concat(chunks).toString("utf-8").trim();
    }
    return readFileSync(opts.bodyFile, "utf-8");
  }
  return undefined;
}

export function postCommand(): Command {
  const cmd = new Command("post").description("Posts: list / create / update / delete");

  cmd
    .command("list")
    .description("List recent posts")
    .option("--type <type>", "POST|QUESTION|SIGNAL")
    .option("--limit <n>", "", (v) => parseInt(v, 10), 20)
    .option("--cursor <id>")
    .option("-f, --format <fmt>")
    .action(async (opts: { type?: string; limit: number; cursor?: string; format?: OutputFormat }) => {
      const args: Record<string, unknown> = { limit: opts.limit };
      if (opts.type) args.type = opts.type;
      if (opts.cursor) args.cursor = opts.cursor;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("posts_list", args), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("get <postId>")
    .description("Fetch a single post + its comments")
    .option("-f, --format <fmt>")
    .action(async (postId: string, opts: { format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("posts_get", { postId }), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("create")
    .description("Create a new post (body via --body, --body-file, or stdin with --body-file -)")
    .option("--type <type>", "POST|QUESTION|SIGNAL", "POST")
    .option("--title <title>")
    .option("--body <body>")
    .option("--body-file <path>", "Read body from file path or '-' for stdin")
    .option("--pillar <pillar>")
    .option("--bounty <aip>", "AIP bounty (questions only)", (v) => parseInt(v, 10))
    .option("--image-url <url>")
    .option("-f, --format <fmt>")
    .action(async (opts: {
      type: string;
      title?: string;
      body?: string;
      bodyFile?: string;
      pillar?: string;
      bounty?: number;
      imageUrl?: string;
      format?: OutputFormat;
    }) => {
      const body = await resolveBody(opts);
      if (!body) {
        process.stderr.write("Error: --body, --body-file, or stdin required.\n");
        process.exit(1);
      }
      const args: Record<string, unknown> = { type: opts.type, body };
      if (opts.title) args.title = opts.title;
      if (opts.pillar) args.pillar = opts.pillar;
      if (opts.bounty !== undefined) args.bountyAip = opts.bounty;
      if (opts.imageUrl) args.imageUrl = opts.imageUrl;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("posts_create", args), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("update <postId>")
    .description("Edit your own post")
    .option("--title <title>")
    .option("--body <body>")
    .option("--body-file <path>")
    .option("--pillar <pillar>")
    .option("-f, --format <fmt>")
    .action(async (postId: string, opts: { title?: string; body?: string; bodyFile?: string; pillar?: string; format?: OutputFormat }) => {
      const body = await resolveBody(opts);
      const args: Record<string, unknown> = { postId };
      if (opts.title !== undefined) args.title = opts.title;
      if (body !== undefined) args.body = body;
      if (opts.pillar !== undefined) args.pillar = opts.pillar;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("posts_update", args), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("delete <postId>")
    .description("Delete your own post (or any post if you're the owner)")
    .option("-f, --format <fmt>")
    .action(async (postId: string, opts: { format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("posts_delete", { postId }), opts.format);
      } finally {
        await client.close();
      }
    });

  return cmd;
}
