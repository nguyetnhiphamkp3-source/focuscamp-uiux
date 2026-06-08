import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    return isPrivateIpv4(mapped);
  }
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized === "::"
  );
}

function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true;
}

export async function assertSafeWebhookUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("invalid_url");
  }

  if (url.protocol !== "https:") throw new Error("webhook_url_must_be_https");
  if (url.username || url.password) throw new Error("webhook_url_must_not_include_credentials");

  const hostname = url.hostname.toLowerCase();
  if (!hostname || BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".localhost")) {
    throw new Error("webhook_url_host_blocked");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("webhook_url_host_blocked");
    return url;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) throw new Error("webhook_url_host_unresolved");
  if (addresses.some((addr) => isPrivateIp(addr.address))) {
    throw new Error("webhook_url_host_blocked");
  }

  return url;
}
