export type CheckinResubmitState = {
  status: string;
  reviewedAt?: Date | string | null;
};

export function isReopenedPendingSubmission(checkin: CheckinResubmitState): boolean {
  return checkin.status === "PENDING" && checkin.reviewedAt != null;
}

export function canResubmitCheckin(checkin: CheckinResubmitState): boolean {
  return checkin.status === "REJECTED" || isReopenedPendingSubmission(checkin);
}
