#!/usr/bin/env node
import { Command } from "commander";
import { authCommand } from "../commands/auth.js";
import { communityCommand } from "../commands/community.js";
import { memberCommand } from "../commands/member.js";
import { postCommand } from "../commands/post.js";
import { challengeCommand } from "../commands/challenge.js";
import {
  courseCommand,
  xpCommand,
  notifyCommand,
  toolsCommand,
} from "../commands/misc.js";

const program = new Command();

program
  .name("fc")
  .description("focus.camp command-line — wraps the MCP API for humans + AI agents.")
  .version("0.1.0")
  .addHelpText(
    "after",
    `
Examples:
  fc auth login                                Save your API key
  fc community info                            Show community + plan status
  fc member list --tier PRO --limit 50         Filter members
  echo "hello world" | fc post create --type POST --title "Hi" --body-file -
  fc challenge pending --format json | jq '.[].id'
                                               Get pending checkin ids for scripting
  fc tools                                     List every MCP tool

Auth:
  Stored at ~/.fc/config.json. Override with FOCUS_CAMP_API_KEY +
  FOCUS_CAMP_BASE_URL env vars.

Output:
  Default is 'pretty' on a TTY and 'json' when piped. Override with
  --format json|pretty|yaml on any subcommand.
`,
  );

program.addCommand(authCommand());
program.addCommand(communityCommand());
program.addCommand(memberCommand());
program.addCommand(postCommand());
program.addCommand(challengeCommand());
program.addCommand(courseCommand());
program.addCommand(xpCommand());
program.addCommand(notifyCommand());
program.addCommand(toolsCommand());

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`fc: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
