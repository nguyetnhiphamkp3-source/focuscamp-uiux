import test from "node:test";
import assert from "node:assert/strict";
import {
  canResubmitCheckin,
  isReopenedPendingSubmission,
} from "@/lib/checkin-resubmit-state";

test("plain pending submissions are not editable while awaiting review", () => {
  const checkin = { status: "PENDING", reviewedAt: null };

  assert.equal(isReopenedPendingSubmission(checkin), false);
  assert.equal(canResubmitCheckin(checkin), false);
});

test("pending submissions reopened after review can be resubmitted", () => {
  const checkin = { status: "PENDING", reviewedAt: new Date("2026-06-07T00:00:00.000Z") };

  assert.equal(isReopenedPendingSubmission(checkin), true);
  assert.equal(canResubmitCheckin(checkin), true);
});

test("rejected submissions can be resubmitted", () => {
  assert.equal(canResubmitCheckin({ status: "REJECTED", reviewedAt: null }), true);
});

test("approved submissions cannot be edited until admin reopens them", () => {
  assert.equal(
    canResubmitCheckin({ status: "APPROVED", reviewedAt: new Date("2026-06-07T00:00:00.000Z") }),
    false,
  );
});
