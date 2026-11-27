import assert from "node:assert/strict";
import test from "node:test";
import { INITIAL_CASES } from "../data/bansayData.ts";
import { rehearsalBadge, visibleAnnualTrack } from "./workspaceNavigation.ts";

test("rehearsal badge reflects submitted reviews and real mentor notes", () => {
  const lesson = structuredClone(INITIAL_CASES[0]);
  lesson.mentorReview.status = "pending";
  lesson.mentorReview.submittedForReview = false;
  assert.deepEqual(rehearsalBadge([lesson]), { ready: 0, waiting: 0 });
  lesson.mentorReview.submittedForReview = true;
  assert.deepEqual(rehearsalBadge([lesson]), { ready: 0, waiting: 1 });
  lesson.mentorReview.status = "returned";
  lesson.mentorReview.focusedGap = "Use a concrete example.";
  assert.deepEqual(rehearsalBadge([lesson]), { ready: 1, waiting: 0 });
  lesson.mentorReview.focusedGap = "";
  lesson.mentorReview.teachingMove = "";
  lesson.mentorReview.quickRefresher = "";
  assert.deepEqual(rehearsalBadge([lesson]), { ready: 0, waiting: 0 });
});

test("annual track requires both the feature flag and valid progress data", () => {
  const progress = { practiced: 2, total: 10 };
  assert.equal(visibleAnnualTrack(false, progress), undefined);
  assert.equal(visibleAnnualTrack(true), undefined);
  assert.equal(visibleAnnualTrack(true, { practiced: 0, total: 0 }), undefined);
  assert.equal(visibleAnnualTrack(true, { practiced: 0, total: 10 })?.practiced, 0);
  assert.deepEqual(visibleAnnualTrack(true, progress), progress);
});
