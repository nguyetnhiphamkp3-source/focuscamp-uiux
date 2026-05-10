/**
 * Google OAuth token management for API calls (Meet, Calendar, etc.)
 * Uses tokens stored by NextAuth in the Account model.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });
  if (!account?.access_token) return null;
  if (!account.scope?.includes(MEET_SCOPE)) return null;

  // Still valid (with 60s buffer)?
  if (account.expires_at && account.expires_at * 1000 > Date.now() + 60_000) {
    return account.access_token;
  }

  // Need refresh
  if (!account.refresh_token) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });
    if (!res.ok) {
      logger.warn({ userId, status: res.status }, "[google-oauth] refresh failed");
      return null;
    }
    const data = await res.json();
    if (!data.access_token) return null;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      },
    });
    return data.access_token as string;
  } catch (err) {
    logger.warn({ err, userId }, "[google-oauth] refresh error");
    return null;
  }
}

export async function hasMeetScope(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { scope: true },
  });
  return !!account?.scope?.includes(MEET_SCOPE);
}
