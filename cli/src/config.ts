/**
 * Local config: ~/.fc/config.json — stores API key + base URL per profile.
 * Env vars FOCUS_CAMP_API_KEY + FOCUS_CAMP_BASE_URL override file.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".fc");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_BASE_URL = "https://focus.camp/api/mcp";

export interface Config {
  apiKey: string;
  baseUrl: string;
  /** Optional human label so `fc auth status` is readable. */
  communitySlug?: string;
}

export function loadConfig(): Config | null {
  // Env wins
  const envKey = process.env.FOCUS_CAMP_API_KEY;
  const envUrl = process.env.FOCUS_CAMP_BASE_URL;
  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: envUrl ?? DEFAULT_BASE_URL,
    };
  }
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    if (!parsed.apiKey) return null;
    return {
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl ?? DEFAULT_BASE_URL,
      communitySlug: parsed.communitySlug,
    };
  } catch {
    return null;
  }
}

export function saveConfig(cfg: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, "{}", { mode: 0o600 });
  }
}

export function configPath(): string {
  return CONFIG_FILE;
}

export function requireConfig(): Config {
  const cfg = loadConfig();
  if (!cfg) {
    process.stderr.write(
      "fc: not authenticated. Run `fc auth login` first.\n",
    );
    process.exit(2);
  }
  return cfg;
}
