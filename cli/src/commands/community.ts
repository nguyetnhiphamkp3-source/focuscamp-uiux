import { Command } from "commander";
import { requireConfig } from "../config.js";
import { FcClient } from "../mcp-client.js";
import { emit, type OutputFormat } from "../output.js";

interface FormatOpts {
  format?: OutputFormat;
}

export function communityCommand(): Command {
  const cmd = new Command("community").description("Community info & settings");

  cmd
    .command("info")
    .description("Fetch community core info + plan status")
    .option("-f, --format <fmt>", "Output format: json|pretty|yaml")
    .action(async (opts: FormatOpts) => {
      const client = new FcClient(requireConfig());
      try {
        const res = await client.callTool("community_get_info");
        emit(res, opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("stats")
    .description("Aggregate counts: members, posts, completed challenges, …")
    .option("-f, --format <fmt>", "Output format")
    .action(async (opts: FormatOpts) => {
      const client = new FcClient(requireConfig());
      try {
        const res = await client.callTool("community_get_stats");
        emit(res, opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("update")
    .description("Update community name / tagline / description")
    .option("--name <name>")
    .option("--tagline <tagline>")
    .option("--description <description>")
    .option("-f, --format <fmt>")
    .action(async (opts: FormatOpts & { name?: string; tagline?: string; description?: string }) => {
      const args: Record<string, unknown> = {};
      if (opts.name !== undefined) args.name = opts.name;
      if (opts.tagline !== undefined) args.tagline = opts.tagline;
      if (opts.description !== undefined) args.description = opts.description;
      if (Object.keys(args).length === 0) {
        process.stderr.write("Provide at least one of --name --tagline --description.\n");
        process.exit(1);
      }
      const client = new FcClient(requireConfig());
      try {
        const res = await client.callTool("community_update_info", args);
        emit(res, opts.format);
      } finally {
        await client.close();
      }
    });

  return cmd;
}
