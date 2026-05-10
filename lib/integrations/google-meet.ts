/**
 * Google Meet REST API v2 client.
 * Docs: https://developers.google.com/workspace/meet/api/reference/rest
 *
 * Auth: OAuth 2.0 user token with meetings.space.created scope.
 * Rate limits: 100 space creations/min (project), 10/min (per user).
 */
import { logger } from "@/lib/logger";

const BASE = "https://meet.googleapis.com/v2";

async function meetFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 429 && retries > 0) {
    const wait = Math.pow(2, 3 - retries) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return meetFetch(accessToken, path, options, retries - 1);
  }
  return res;
}

/** Create a new Meet Space. Returns meetingUri + spaceName for storage. */
export async function createMeetSpace(
  accessToken: string,
  opts: { autoRecording?: boolean; autoTranscription?: boolean } = {}
): Promise<{ meetingUri: string; spaceName: string; meetingCode: string } | null> {
  try {
    const res = await meetFetch(accessToken, "/spaces", {
      method: "POST",
      body: JSON.stringify({
        config: {
          artifactConfig: {
            autoRecordingGeneration: opts.autoRecording ? "ENABLED" : "DISABLED",
            autoTranscriptionGeneration: opts.autoTranscription ? "ENABLED" : "DISABLED",
          },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      logger.warn({ status: res.status, err }, "[google-meet] createSpace failed");
      return null;
    }
    const data = await res.json();
    return {
      meetingUri: data.meetingUri as string,
      spaceName: data.name as string,
      meetingCode: data.meetingCode as string,
    };
  } catch (err) {
    logger.warn({ err }, "[google-meet] createSpace error");
    return null;
  }
}

/** List conference records for a given space. Returns the most recent one. */
export async function getConferenceRecord(
  accessToken: string,
  spaceName: string
): Promise<{ name: string; endTime?: string } | null> {
  try {
    const res = await meetFetch(
      accessToken,
      `/conferenceRecords?filter=space.name="${spaceName}"&pageSize=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const records: { name: string; endTime?: string }[] = data.conferenceRecords ?? [];
    return records[0] ?? null;
  } catch (err) {
    logger.warn({ err }, "[google-meet] getConferenceRecord error");
    return null;
  }
}

/** Get recording Drive links for a conference record. */
export async function getRecordingLinks(
  accessToken: string,
  conferenceRecordName: string
): Promise<string[]> {
  try {
    const res = await meetFetch(accessToken, `/${conferenceRecordName}/recordings`);
    if (!res.ok) return [];
    const data = await res.json();
    const recordings: { state: string; driveDestination?: { exportUri: string } }[] =
      data.recordings ?? [];
    return recordings
      .filter((r) => r.state === "FILE_GENERATED" && r.driveDestination?.exportUri)
      .map((r) => r.driveDestination!.exportUri);
  } catch (err) {
    logger.warn({ err }, "[google-meet] getRecordingLinks error");
    return [];
  }
}

/** Get transcript Google Docs links for a conference record. */
export async function getTranscriptLinks(
  accessToken: string,
  conferenceRecordName: string
): Promise<string[]> {
  try {
    const res = await meetFetch(accessToken, `/${conferenceRecordName}/transcripts`);
    if (!res.ok) return [];
    const data = await res.json();
    const transcripts: { state: string; docsDestination?: { documentsLink: string } }[] =
      data.transcripts ?? [];
    return transcripts
      .filter((t) => t.state === "FILE_GENERATED" && t.docsDestination?.documentsLink)
      .map((t) => t.docsDestination!.documentsLink);
  } catch (err) {
    logger.warn({ err }, "[google-meet] getTranscriptLinks error");
    return [];
  }
}

/** List actual attendees from conference participants API. */
export async function getAttendees(
  accessToken: string,
  conferenceRecordName: string
): Promise<{ displayName: string; joinedAt?: string; leftAt?: string; googleUserId?: string }[]> {
  try {
    const res = await meetFetch(accessToken, `/${conferenceRecordName}/participants`);
    if (!res.ok) return [];
    const data = await res.json();
    const participants: {
      earliestStartTime?: string;
      latestEndTime?: string;
      user?: {
        signedinUser?: { userId: string; displayName: string };
        anonymousUser?: { displayName: string };
      };
    }[] = data.participants ?? [];
    return participants.map((p) => ({
      displayName:
        p.user?.signedinUser?.displayName ?? p.user?.anonymousUser?.displayName ?? "Unknown",
      googleUserId: p.user?.signedinUser?.userId,
      joinedAt: p.earliestStartTime,
      leftAt: p.latestEndTime,
    }));
  } catch (err) {
    logger.warn({ err }, "[google-meet] getAttendees error");
    return [];
  }
}
