import { Command } from "commander";
import prompts from "prompts";
import { loadConfig, saveConfig, clearConfig, configPath } from "../config.js";
import { FcClient } from "../mcp-client.js";

export function authCommand(): Command {
  const cmd = new Command("auth").description("Manage authentication");

  cmd
    .command("login")
    .description("Save an API key + endpoint to ~/.fc/config.json")
    .option("--key <key>", "API key (skip the interactive prompt)")
    .option("--base-url <url>", "MCP endpoint URL", "https://focus.camp/api/mcp")
    .action(async (opts: { key?: string; baseUrl: string }) => {
      let key = opts.key;
      if (!key) {
        const ans = await prompts({
          type: "password",
          name: "key",
          message: "API key (created at /c/<community>/settings → API Keys)",
        });
        key = ans.key as string | undefined;
      }
      if (!key) {
        process.stderr.write("Aborted: no API key provided.\n");
        process.exit(1);
      }
      // Verify by calling community_get_info
      const cfg = { apiKey: key, baseUrl: opts.baseUrl };
      const client = new FcClient(cfg);
      try {
        const res = await client.callTool("community_get_info");
        if (!res.ok) {
          process.stderr.write(`Login failed: ${res.error ?? "unauthorized"}\n`);
          process.exit(1);
        }
        const slug = (res.data as { slug?: string })?.slug;
        saveConfig({ ...cfg, communitySlug: slug });
        process.stdout.write(
          `Logged in. Config saved to ${configPath()}\n` +
            (slug ? `Community: ${slug}\n` : ""),
        );
      } finally {
        await client.close();
      }
    });

  cmd
    .command("status")
    .description("Show the current API key prefix + community")
    .action(async () => {
      const cfg = loadConfig();
      if (!cfg) {
        process.stdout.write("Not logged in. Run `fc auth login`.\n");
        return;
      }
      const masked = cfg.apiKey.slice(0, 6) + "…" + cfg.apiKey.slice(-4);
      process.stdout.write(
        `Endpoint:  ${cfg.baseUrl}\n` +
          `Key:       ${masked}\n` +
          (cfg.communitySlug ? `Community: ${cfg.communitySlug}\n` : ""),
      );
    });

  cmd
    .command("logout")
    .description("Wipe the saved API key from ~/.fc/config.json")
    .action(() => {
      clearConfig();
      process.stdout.write("Logged out.\n");
    });

  return cmd;
}
