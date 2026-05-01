import { Command } from "commander";
import { requireConfig } from "../config.js";
import { FcClient } from "../mcp-client.js";
import { emit, type OutputFormat } from "../output.js";

export function challengeCommand(): Command {
  const cmd = new Command("challenge").description("Challenges + checkin review");

  cmd
    .command("list")
    .description("List challenges in the connected community")
    .option("--limit <n>", "", (v) => parseInt(v, 10), 20)
    .option("-f, --format <fmt>")
    .action(async (opts: { limit: number; format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("challenges_list", { limit: opts.limit }), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("get <slug>")
    .description("Get one challenge with tasks + member counts")
    .option("-f, --format <fmt>")
    .action(async (slug: string, opts: { format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("challenges_get", { slug }), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("create")
    .description("Create a new challenge")
    .requiredOption("--slug <slug>", "URL slug")
    .requiredOption("--title <title>")
    .option("--description <desc>")
    .option("--total-days <n>", "Length in days", (v) => parseInt(v, 10), 30)
    .option("--required-tier <tier>", "EXPLORER|PRO|MASTER")
    .option("-f, --format <fmt>")
    .action(async (opts: {
      slug: string;
      title: string;
      description?: string;
      totalDays: number;
      requiredTier?: string;
      format?: OutputFormat;
    }) => {
      const args: Record<string, unknown> = {
        slug: opts.slug,
        title: opts.title,
        totalDays: opts.totalDays,
      };
      if (opts.description) args.description = opts.description;
      if (opts.requiredTier) args.requiredTier = opts.requiredTier;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("challenges_create", args), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("pending")
    .description("List checkins still waiting for review")
    .option("--challenge-slug <slug>", "Filter to one challenge")
    .option("--limit <n>", "", (v) => parseInt(v, 10), 30)
    .option("-f, --format <fmt>")
    .action(async (opts: { challengeSlug?: string; limit: number; format?: OutputFormat }) => {
      const args: Record<string, unknown> = { limit: opts.limit };
      if (opts.challengeSlug) args.challengeSlug = opts.challengeSlug;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("challenges_list_pending_checkins", args), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("review <submissionId>")
    .description("Approve / reject a submission")
    .requiredOption("--decision <d>", "APPROVED|REJECTED|NEEDS_REVISION")
    .option("--feedback <text>")
    .option("-f, --format <fmt>")
    .action(async (submissionId: string, opts: { decision: string; feedback?: string; format?: OutputFormat }) => {
      const args: Record<string, unknown> = {
        submissionId,
        decision: opts.decision,
      };
      if (opts.feedback) args.feedback = opts.feedback;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("checkins_review", args), opts.format);
      } finally {
        await client.close();
      }
    });

  return cmd;
}
