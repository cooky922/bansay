import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
} from "lucide-react";
import type {
  BansayLanguage,
  CohortSeat,
  EngineeringControlMetric,
  LessonCase,
  PilotBudgetRow,
  PilotValidationMetric,
  UnitEconomicsRow,
  UserRole,
} from "../types/bansay";
import { MEDIA_POLICY_TIERS, UI_COPY } from "../data/bansayData";
import { Checkbox } from "./ui";
import { bansayFetch } from "../lib/apiClient";

interface CohortOversightProps {
  language: BansayLanguage;
  role: UserRole;
  cases: LessonCase[];
  onVerifyConceptPack: (
    caseId: string,
    payload: {
      bigIdeaSummary: string;
      bridgeExplanation: string;
      limitationNote: string;
      packAuditDurationSec: number;
      publishToLac: boolean;
    }
  ) => Promise<void>;
  onSubmitMentorReview: (
    caseId: string,
    payload: {
      focusedGap: string;
      teachingMove: string;
      quickRefresher: string;
      masteredSkill: string;
      practiceSkill: string;
      transcriptReviewDurationSec: number;
    }
  ) => Promise<void>;
  cohortSeats: CohortSeat[];
  engineeringControls: EngineeringControlMetric[];
  pilotMetrics: PilotValidationMetric[];
  pilotBudget: PilotBudgetRow[];
  unitEconomics: UnitEconomicsRow[];
  directMentorMinutesLogged: number;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CohortOversight({
  language,
  role,
  cases,
  onVerifyConceptPack,
  onSubmitMentorReview,
  cohortSeats,
  engineeringControls,
  pilotMetrics,
  pilotBudget,
  unitEconomics,
  directMentorMinutesLogged,
}: CohortOversightProps) {
  const copy = UI_COPY[language];

  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    cases.find((c) => c.mentorReview.status === "pending")?.id || cases[0]?.id || ""
  );
  const selectedCase =
    cases.find((c) => c.id === selectedReviewId) || cases[0];

  // Inline Concept Pack verification state
  const [bigIdeaDraft, setBigIdeaDraft] = useState("");
  const [bridgeDraft, setBridgeDraft] = useState("");
  const [limitationDraft, setLimitationDraft] = useState("");
  const [publishToLac, setPublishToLac] = useState(true);
  const [isVerifyingPack, setIsVerifyingPack] = useState(false);

  // Coaching transcript review state
  const [focusedGap, setFocusedGap] = useState("");
  const [teachingMove, setTeachingMove] = useState("");
  const [quickRefresher, setQuickRefresher] = useState("");
  const [masteredSkill, setMasteredSkill] = useState("");
  const [practiceSkill, setPracticeSkill] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);

  async function downloadAttachment(caseId: string, assetId: string, label: string) {
    try {
      const response = await bansayFetch(`/api/bansay/cases/${caseId}/media/${assetId}`);
      if (!response.ok) throw new Error("This attachment is no longer available.");
      const media = await response.blob();
      const url = URL.createObjectURL(media);
      const link = document.createElement("a");
      link.href = url;
      link.download = label;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMentorError("This attachment could not be downloaded.");
    }
  }
  const [mentorSavedBanner, setMentorSavedBanner] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState(false);

  // Live review elapsed timer (tracks 2-min pack audit / 4-min transcript target)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!selectedCase) return;
    setBigIdeaDraft(selectedCase.support.bigIdea.summary);
    setBridgeDraft(selectedCase.support.specialtyBridge.explanation);
    setLimitationDraft(selectedCase.support.specialtyBridge.limitationNote);
    setFocusedGap(selectedCase.mentorReview.focusedGap || "");
    setTeachingMove(selectedCase.mentorReview.teachingMove || "");
    setQuickRefresher(selectedCase.mentorReview.quickRefresher || "");
    setMasteredSkill(selectedCase.mentorReview.masteredSkill || "");
    setPracticeSkill(selectedCase.mentorReview.practiceSkill || "");
    setElapsedSeconds(0);
    setMentorError(null);
  }, [selectedCase?.id]);

  useEffect(() => {
    if (role !== "mentor" || !selectedCase) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [role, selectedCase?.id]);

  const handleDraftWithAi = async () => {
    if (!selectedCase) return;
    setIsDrafting(true);
    setMentorError(null);

    const teacherTurns = selectedCase.rehearsalMessages
      .filter((m) => m.sender === "teacher")
      .map((m) => m.text)
      .join("\n");

    const responseText =
      teacherTurns || selectedCase.baselineExplanation || selectedCase.topic;

    try {
      const response = await bansayFetch("/api/bansay/mentor-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedCase.subject,
          topic: selectedCase.topic,
          teacherMajor: selectedCase.teacherMajor,
          language,
          teacherResponse: responseText,
          freshCaseResponse: selectedCase.freshCaseResponse || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to draft coaching note.");
      }

      setDemoNotice(Boolean(data.demo));
      setFocusedGap(data.focusedGap || "");
      setTeachingMove(data.teachingMove || "");
      setQuickRefresher(data.quickRefresher || "");
      setMasteredSkill(data.masteredSkill || "");
      setPracticeSkill(data.practiceSkill || "");
    } catch (err) {
      setMentorError(
        err instanceof Error ? err.message : "Error drafting mentor feedback."
      );
    } finally {
      setIsDrafting(false);
    }
  };

  const handleVerifyPack = async () => {
    if (!selectedCase) return;
    setIsVerifyingPack(true);
    setMentorError(null);
    setMentorSavedBanner(null);
    try {
      await onVerifyConceptPack(selectedCase.id, {
        bigIdeaSummary: bigIdeaDraft.trim() || selectedCase.support.bigIdea.summary,
        bridgeExplanation:
          bridgeDraft.trim() || selectedCase.support.specialtyBridge.explanation,
        limitationNote:
          limitationDraft.trim() || selectedCase.support.specialtyBridge.limitationNote,
        packAuditDurationSec: Math.max(15, elapsedSeconds),
        publishToLac,
      });
      setMentorSavedBanner(
        publishToLac
          ? "Concept Pack marked Mentor-Verified and published anonymously to the Shared LAC Library."
          : "Concept Pack marked Mentor-Verified for the teacher."
      );
    } catch (err) {
      setMentorError(
        err instanceof Error ? err.message : "Unable to verify Concept Pack."
      );
    } finally {
      setIsVerifyingPack(false);
    }
  };

  const handleReturnFeedback = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    if (!focusedGap.trim() || !teachingMove.trim()) {
      setMentorError(
        "Complete the focused gap and practical teaching move before returning feedback."
      );
      return;
    }

    setIsSubmittingReview(true);
    setMentorError(null);
    setMentorSavedBanner(null);
    try {
      await onSubmitMentorReview(selectedCase.id, {
        focusedGap: focusedGap.trim(),
        teachingMove: teachingMove.trim(),
        quickRefresher: quickRefresher.trim(),
        masteredSkill: masteredSkill.trim() || "Clear, supportive tone",
        practiceSkill: practiceSkill.trim() || "Checking conceptual reasoning",
        transcriptReviewDurationSec: Math.max(20, elapsedSeconds),
      });
      setMentorSavedBanner(
        `Signed and returned coaching note to ${selectedCase.teacherName} (${formatTimer(
          elapsedSeconds
        )} review time). Scenario 2 (Fresh Case) is now unlocked.`
      );
    } catch (err) {
      setMentorError(
        err instanceof Error ? err.message : "Unable to save mentor review."
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Pilot Cohort Calculations
  const completedBothCount = cohortSeats.filter((s) => s.cyclesCompleted >= 2).length;
  const totalOnTimeReviews = cohortSeats.reduce((s, r) => s + r.onTimeReviews, 0);
  const improvedCount = cohortSeats.filter((s) => s.freshCaseImproved === true).length;
  const liveAiCount = cohortSeats.filter((s) => s.submissionChannel === "Live AI").length;
  const offlineFallbackCount = cohortSeats.length - liveAiCount;

  if (role === "mentor") {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-violet-700 mb-1">
            Subject Mentor Review · Non-evaluative coaching
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            Mentor review &amp; pack audit queue
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Lessons with 3+ school days before class appear first, followed by shorter-notice requests.
          </p>
        </div>

        {mentorSavedBanner && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{mentorSavedBanner}</span>
          </div>
        )}

        {demoNotice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Demo mode · Local sample coaching draft active until OpenRouter API key is configured.
          </div>
        )}

        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No teacher rehearsals have been submitted to the mentor queue yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Queue List (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <p className="px-2 text-xs font-semibold text-slate-500">
                Submitted cases ({cases.length})
              </p>
              {cases.map((c) => {
                const active = c.id === selectedCase?.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedReviewId(c.id)}
                    className={`w-full text-left rounded-xl p-3.5 border transition-colors ${
                      active
                        ? "bg-violet-50 border-violet-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-violet-800">
                        {c.subject} · {c.gradeLevel}
                      </span>
                      <span
                        className={`font-medium ${
                          c.mentorReview.status === "pending"
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {c.mentorReview.status === "pending"
                          ? "Pending"
                          : c.mentorReview.status === "completed"
                          ? "Completed"
                          : "Returned"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">
                      {c.topic}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      {c.leadTimeTier === "standard-sla"
                        ? "Before class (3+ days)"
                        : "Short notice (<3 days)"}{" "}
                      · Pack:{" "}
                      {c.packStatus === "mentor-verified" ? "Verified" : "Draft"} · Class{" "}
                      {c.classDate}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Review Workspace (8 cols) */}
            {selectedCase && (
              <div className="lg:col-span-8 space-y-5">
                {/* Timer + Case Header */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {selectedCase.teacherName} (Major: {selectedCase.teacherMajor}) · Class{" "}
                        {selectedCase.classDate} ·{" "}
                        {selectedCase.leadTimeTier === "standard-sla"
                          ? "Before class (3+ days)"
                          : "Short notice (<3 days)"}
                      </p>
                      <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
                        {selectedCase.topic}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 tabular-nums">
                        <Timer className="w-3.5 h-3.5 text-violet-700" />
                        <span>{formatTimer(elapsedSeconds)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDraftWithAi}
                        disabled={isDrafting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-900 text-xs font-semibold whitespace-nowrap"
                      >
                        {isDrafting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>Draft coaching note</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Concept Pack Audit & Verification */}
                  <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 sm:p-5 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-violet-800">
                          Quality Check (Review)
                        </p>
                        <p className="text-xs text-slate-600">
                          Status:{" "}
                          <strong className="text-slate-900">
                            {selectedCase.packStatus === "mentor-verified"
                              ? "Mentor-Verified"
                              : "Private Draft"}
                          </strong>{" "}
                          · Automated checks:{" "}
                          {selectedCase.support.judgeReport.passed ? "Passed; mentor review required" : "Needs review"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isVerifyingPack}
                        onClick={() => void handleVerifyPack()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {isVerifyingPack ? "Verifying…" : "Verify Guide"}
                        </span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Big Idea summary ({selectedCase.support.bigIdea.curriculumGrounding})
                        </label>
                        <textarea
                          rows={2}
                          value={bigIdeaDraft}
                          onChange={(e) => setBigIdeaDraft(e.target.value)}
                          className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Specialty Bridge explanation
                        </label>
                        <textarea
                          rows={2}
                          value={bridgeDraft}
                          onChange={(e) => setBridgeDraft(e.target.value)}
                          className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Where the analogy stops (boundary guardrail)
                        </label>
                        <input
                          type="text"
                          value={limitationDraft}
                          onChange={(e) => setLimitationDraft(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-800">
                        <Checkbox
                          checked={publishToLac}
                          onChange={(e) => setPublishToLac(e.target.checked)}
                        />
                        <span>
                          Also publish anonymized Concept Pack to Shared LAC Library upon verification
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Teacher Evidence */}
                  <div className="space-y-3">
                    {selectedCase.baselineExplanation && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                        <p className="text-xs font-semibold text-slate-700 mb-1">
                          Teacher Baseline First explanation (before AI Draft)
                        </p>
                        <p className="text-xs sm:text-sm text-slate-800">
                          {selectedCase.baselineExplanation}
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Rehearsal transcript ({selectedCase.rehearsalMessages.length} turns)
                      </p>
                      {selectedCase.rehearsalMessages.map((m) => (
                        <p key={m.id} className="text-xs text-slate-700 leading-relaxed">
                          <strong className="text-slate-900">
                            {m.sender === "student" ? "Simulated Learner:" : "Teacher:"}
                          </strong>{" "}
                          {m.text}
                        </p>
                      ))}
                    </div>

                    {selectedCase.mediaAssets.filter((m) => m.status !== "purged").length >
                      0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-700">
                          Consented attachments
                        </p>
                        {selectedCase.mediaAssets
                          .filter((m) => m.status !== "purged")
                          .map((asset) => (
                            <p key={asset.id} className="text-xs text-slate-600 tabular-nums">
                              {asset.label} ({asset.tier} · auto-deletes{" "}
                              {asset.expiresAt?.slice(0, 10)})
                              {asset.hasContent && <button type="button" className="ml-2 text-bansay-strong underline" onClick={() => void downloadAttachment(selectedCase.id, asset.id, asset.label)}>Download</button>}
                            </p>
                          ))}
                      </div>
                    )}

                    {selectedCase.freshCaseResponse && (
                      <div className="rounded-xl bg-violet-50/50 border border-violet-200 p-3.5">
                        <p className="text-xs font-semibold text-violet-900 mb-1">
                          New Example Response
                        </p>
                        <p className="text-xs sm:text-sm text-slate-800">
                          {selectedCase.freshCaseResponse}
                        </p>
                      </div>
                    )}
                  </div>

                  {mentorError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800"
                    >
                      {mentorError}
                    </div>
                  )}

                  <form
                    noValidate
                    onSubmit={handleReturnFeedback}
                    className="space-y-4 pt-2 border-t border-slate-100"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        One focused gap (most important improvement)
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={focusedGap}
                        onChange={(e) => {
                          setFocusedGap(e.target.value);
                          if (mentorError) setMentorError(null);
                        }}
                        placeholder="Identify the single most helpful conceptual or pedagogical gap..."
                        className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Practical teaching move for tomorrow&apos;s class
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={teachingMove}
                        onChange={(e) => {
                          setTeachingMove(e.target.value);
                          if (mentorError) setMentorError(null);
                        }}
                        placeholder="Give one concrete demonstration, question, or phrasing move..."
                        className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Skill mastered
                        </label>
                        <input
                          type="text"
                          value={masteredSkill}
                          onChange={(e) => setMasteredSkill(e.target.value)}
                          placeholder="e.g., Elicits learner reasoning first"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Still needs practice
                        </label>
                        <input
                          type="text"
                          value={practiceSkill}
                          onChange={(e) => setPracticeSkill(e.target.value)}
                          placeholder="e.g., Separating particle size from visibility"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Optional quick content refresher
                      </label>
                      <input
                        type="text"
                        value={quickRefresher}
                        onChange={(e) => setQuickRefresher(e.target.value)}
                        placeholder="Leave blank if subject explanation is accurate"
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white text-xs font-semibold"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>
                          {isSubmittingReview
                            ? "Signing & returning…"
                            : "Sign & return feedback"}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* Coordinator & School-Level Pilot Oversight View (Tables 4, 5, 6, 7 + 4-Tier Media Policy) */
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-violet-700 mb-1">
          {copy.cohortKicker}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
          {copy.cohortTitle}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          {copy.cohortSubtitle}
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 flex items-start gap-3">
        <Lock className="w-4 h-4 text-violet-800 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-950 leading-relaxed">
          <strong className="font-semibold">Non-evaluative privacy safeguard:</strong>{" "}
          School coordinators receive zero teacher names, rehearsal transcripts, or raw mentor coaching notes. Only anonymized cohort summaries and pilot unit economics are exposed by the server.
        </p>
      </div>

      {/* Continuation Thresholds Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-slate-500">Both coaching cycles completed</p>
          <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
            {completedBothCount} / {cohortSeats.length} teachers
          </p>
          <p className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Meets continuation threshold (&ge; 6 of 8)</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-slate-500">Feedback within 2 school days</p>
          <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
            {totalOnTimeReviews} / 16 initial reviews
          </p>
          <p className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Meets turnaround threshold (&ge; 13 of 16)</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-slate-500">Fresh-case improvement (no major error)</p>
          <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
            {improvedCount} / {cohortSeats.length} teachers
          </p>
          <p className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Meets independent transfer goal (&ge; 5 of 8)</span>
          </p>
        </div>
      </div>

      {/* Anonymized Cohort Roster + Restated Table 6 Resource Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Anonymized cohort participation
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              Live AI: {liveAiCount} · Offline: {offlineFallbackCount}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">Seat</th>
                  <th className="py-2.5 pr-3 font-medium">Subject / Major</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Cycles</th>
                  <th className="py-2.5 pr-3 font-medium">Channel</th>
                  <th className="py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cohortSeats.map((seat) => (
                  <tr key={seat.seatCode} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-3 font-medium text-slate-900 whitespace-nowrap">
                      {seat.seatCode}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                      {seat.subjectArea} · {seat.majorBackground}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-800">
                      {seat.cyclesCompleted}/2
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                      {seat.submissionChannel}
                    </td>
                    <td className="py-2.5 text-slate-700 whitespace-nowrap">
                      {seat.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table 6: Pilot Direct Delivery Cost Reconciliation */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-700">
                Table 6 · Restated Pilot Direct Delivery Cost Reconciliation
              </p>
              <h2 className="font-display text-lg font-bold text-slate-900">
                160 min direct + 200 min prep = 360 min (6.0 hr)
              </h2>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">Direct mentor review logged</p>
              <p className="font-display text-xl font-bold text-slate-900 tabular-nums">
                {directMentorMinutesLogged} mins
              </p>
            </div>
            <span className="text-xs text-slate-600 tabular-nums">
              160 min baseline (16×[2m+4m] + 16×4m) + 200 min prep
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2 font-medium">Expense</th>
                  <th className="py-2 pr-2 font-medium">Basis</th>
                  <th className="py-2 pr-2 font-medium text-right">Est. value</th>
                  <th className="py-2 font-medium text-right">Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {pilotBudget.map((row) => (
                  <tr key={row.expense}>
                    <td className="py-2.5 pr-2 font-medium text-slate-800 whitespace-nowrap">
                      {row.expense}
                    </td>
                    <td className="py-2.5 pr-2 text-slate-600">{row.basis}</td>
                    <td className="py-2.5 pr-2 text-right font-mono text-slate-800">
                      {row.estimatedValue}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {row.cashOutlay}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="py-2.5 pr-2">Total (1 cohort)</td>
                  <td className="py-2.5 pr-2 text-slate-500 font-normal">
                    8 teachers · 16 cycles
                  </td>
                  <td className="py-2.5 pr-2 text-right font-mono">₱3,700</td>
                  <td className="py-2.5 text-right font-mono">₱300</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Table 4 & Table 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-violet-700">
              Table 4 · Five Pre-Delivery Concept Pack Engineering Controls
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              AI quality guardrails
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Control</th>
                  <th className="py-2 pr-3 font-medium">Purpose</th>
                  <th className="py-2 font-medium text-right">Pass rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {engineeringControls.map((ctrl) => (
                  <tr key={ctrl.id}>
                    <td className="py-2.5 pr-3 font-medium text-slate-900">
                      {ctrl.control}
                      <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                        {ctrl.specification}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{ctrl.purpose}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-emerald-800 font-semibold whitespace-nowrap">
                      {ctrl.passCount}/{ctrl.totalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-violet-700">
              Table 5 · Four Falsifiable Pilot Validation Metrics
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Pilot efficacy &amp; mentor workload
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Metric</th>
                  <th className="py-2 pr-3 font-medium">Threshold</th>
                  <th className="py-2 font-medium text-right">Current</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pilotMetrics.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-3 font-medium text-slate-900">
                      {m.metric}
                      <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                        {m.dataSource}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{m.threshold}</td>
                    <td
                      className={`py-2.5 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        m.meetsThreshold ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {m.currentValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Table 7 + 4-Tier Media Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-violet-700">
              Table 7 · Pilot Baseline vs. Updated Commercial Unit Economics
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Sustainable deployment tiers
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Tier</th>
                  <th className="py-2 pr-3 font-medium">Buyer / COGS</th>
                  <th className="py-2 pr-3 font-medium text-right">Price</th>
                  <th className="py-2 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {unitEconomics.map((row) => (
                  <tr key={row.tier}>
                    <td className="py-2.5 pr-3 font-medium text-slate-900">
                      {row.tier}
                      <span className="block text-[11px] font-normal text-slate-500">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {row.buyer}
                      <span className="block text-[11px] text-slate-500">
                        COGS: {row.variableCogs}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-slate-800 whitespace-nowrap">
                      {row.targetPrice}
                    </td>
                    <td className="py-2.5 text-right font-mono text-emerald-800 font-semibold whitespace-nowrap">
                      {row.grossMargin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-violet-700">
              4-Tier Media Capture, Retention &amp; RA 10173 Policy
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Zero classroom learner faces &amp; auto-deletion
            </h2>
          </div>
          <div className="space-y-3">
            {MEDIA_POLICY_TIERS.map((row) => (
              <div
                key={row.tier}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-900">{row.tier}</strong>
                  <span className="font-mono text-violet-800">{row.retentionWindow}</span>
                </div>
                <p className="text-slate-700">
                  <strong>Storage:</strong> {row.storageRule} ·{" "}
                  <strong>Portfolio:</strong> {row.portfolioInclusion}
                </p>
                <p className="text-slate-600">{row.consentRule}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
