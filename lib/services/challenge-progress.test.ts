import test from "node:test";
import assert from "node:assert/strict";
import {
  canStartChallengeNow,
  challengeCurrentDay,
  challengeDayAnchor,
} from "@/lib/services/challenge-progress";

const iso = (date: Date) => date.toISOString();

test("challenge day anchor is fixed at 07:00 Asia/Ho_Chi_Minh", () => {
  assert.equal(
    iso(challengeDayAnchor(new Date("2026-06-07T23:00:00.000Z"))),
    "2026-06-08T00:00:00.000Z",
  );
  assert.equal(
    iso(challengeDayAnchor(new Date("2026-06-08T00:00:00.000Z"))),
    "2026-06-08T00:00:00.000Z",
  );
  assert.equal(
    iso(challengeDayAnchor(new Date("2026-06-08T01:24:37.147Z"))),
    "2026-06-09T00:00:00.000Z",
  );
  assert.equal(
    iso(challengeDayAnchor(new Date("2026-06-08T15:00:00.000Z"))),
    "2026-06-09T00:00:00.000Z",
  );
});

test("current day advances only at the 07:00 Vietnam boundary", () => {
  const startedAt = new Date("2026-06-07T01:24:37.147Z");

  assert.equal(
    iso(challengeDayAnchor(startedAt)),
    "2026-06-08T00:00:00.000Z",
  );
  assert.equal(
    challengeCurrentDay(startedAt, 21, new Date("2026-06-08T06:33:58.000Z")),
    1,
  );
  assert.equal(
    challengeCurrentDay(startedAt, 21, new Date("2026-06-08T23:59:59.000Z")),
    1,
  );
  assert.equal(
    challengeCurrentDay(startedAt, 21, new Date("2026-06-09T00:00:00.000Z")),
    2,
  );
  assert.equal(
    challengeCurrentDay(startedAt, 21, new Date("2026-06-10T00:00:00.000Z")),
    3,
  );
});

test("manual start window is closed from 00:00 to before 07:00 Vietnam time for calendar modes", () => {
  assert.equal(canStartChallengeNow("DAILY", new Date("2026-06-07T16:59:59.000Z")), true);
  assert.equal(canStartChallengeNow("DAILY", new Date("2026-06-07T17:00:00.000Z")), false);
  assert.equal(canStartChallengeNow("DAILY_SEQUENTIAL", new Date("2026-06-07T23:59:59.000Z")), false);
  assert.equal(canStartChallengeNow("DAILY_SEQUENTIAL", new Date("2026-06-08T00:00:00.000Z")), true);
  assert.equal(canStartChallengeNow("SEQUENTIAL", new Date("2026-06-07T20:00:00.000Z")), true);
});
