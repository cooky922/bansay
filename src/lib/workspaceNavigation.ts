import type { LessonCase } from "../types/bansay.ts";

export interface AnnualTrackProgress {
  practiced: number;
  total: number;
}

export function visibleAnnualTrack(enabled: boolean, progress?: AnnualTrackProgress) {
  if (!enabled || !progress || !Number.isInteger(progress.practiced) || !Number.isInteger(progress.total) ||
    progress.practiced < 0 || progress.total < 1 || progress.practiced > progress.total) {
    return undefined;
  }
  return progress;
}

export function rehearsalBadge(cases: LessonCase[]) {
  let ready = 0;
  let waiting = 0;
  for (const lesson of cases) {
    const review = lesson.mentorReview;
    if (review.status === "pending") {
      if (review.submittedForReview ?? lesson.rehearsalMessages.some((message) => message.sharedWithMentor)) waiting++;
    } else if (review.focusedGap.trim() || review.teachingMove.trim() || review.quickRefresher?.trim()) {
      ready++;
    }
  }
  return { ready, waiting };
}

export function offlinePackStorageKey(userId: string, caseId: string) {
  return `bansay-offline-pack-${userId}-${caseId}`;
}
