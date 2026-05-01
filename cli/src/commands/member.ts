import { Command } from "commander";
import { requireConfig } from "../config.js";
import { FcClient } from "../mcp-client.js";
import { emit, type OutputFormat } from "../output.js";

export function memberCommand(): Command {
  const cmd = new Command("member").description("List, inspect, and moderate members");

  cmd
    .command("list")
    .description("List members with pagination")
    .option("--limit <n>", "How many to return", (v) => parseInt(v, 10), 20)
    .option("--cursor <id>", "Pagination cursor (member id)")
    .option("--role <role>", "Filter by role: OWNER|ADMIN|MEMBER")
    .option("--tier <tier>", "Filter by subscription tier: EXPLORER|PRO|MASTER")
    .option("-f, --format <fmt>")
    .action(async (opts: { limit: number; cursor?: string; role?: string; tier?: string; format?: OutputFormat }) => {
      const args: Record<string, unknown> = { limit: opts.limit };
      if (opts.cursor) args.cursor = opts.cursor;
      if (opts.role) args.role = opts.role;
      if (opts.tier) args.tier = opts.tier;
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("community_list_members", args), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("get <userId>")
    .description("Get one member's profile + membership detail")
    .option("-f, --format <fmt>")
    .action(async (userId: string, opts: { format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("community_get_member", { userId }), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("role <userId> <role>")
    .description("Promote/demote: <role> = OWNER|ADMIN|MEMBER")
    .option("-f, --format <fmt>")
    .action(async (userId: string, role: string, opts: { format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("members_update_role", { userId, role }), opts.format);
      } finally {
        await client.close();
      }
    });

  cmd
    .command("remove <userId>")
    .description("Remove a member from the community (irreversible)")
    .option("-f, --format <fmt>")
    .action(async (userId: string, opts: { format?: OutputFormat }) => {
      const client = new FcClient(requireConfig());
      try {
        emit(await client.callTool("members_remove", { userId }), opts.format);
      } finally {
        await client.close();
      }
    });

  return cmd;
}
