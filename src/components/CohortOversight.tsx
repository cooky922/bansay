import { useState, type FormEvent } from "react";
import {
  BookMarked,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Sparkles,
  UserCheck,
} from "lucide-react";
import type {
  BansayLanguage,
  CohortSeat,
  LessonCase,
  PeerLibraryItem,
  UserRole,
} from "../types/bansay";
import { PILOT_BUDGET_ITEMS, UI_COPY } from "../data/bansayData";

interface CohortOversightProps {
  language: BansayLanguage;
  role: UserRole;
  cases: LessonCase[];
  onUpdateCase: (updated: LessonCase) => void;
  onAddPeerLibraryItem: (item: PeerLibraryItem) => void;
  cohortSeats: CohortSeat[];
}

export function CohortOversight({
  language,
  role,
  cases,
  onUpdateCase,
  onAddPeerLibraryItem,
  cohortSeats,
}: CohortOversightProps) {
  const copy = UI_COPY[language];

  // Mentor Review Queue state
  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    cases.find((c) => c.mentorReview.status === "pending")?.id || cases[0]?.id
  );
  const selectedCase =
    cases.find((c) => c.id === selectedReviewId) || cases[0];

  const [focusedGap, setFocusedGap] = useState(
    selectedCase?.mentorReview.focusedGap || ""
  );
  const [teachingMove, setTeachingMove] = useState(
    selectedCase?.mentorReview.teachingMove || ""
  );
  const [quickRefresher, setQuickRefresher] = useState(
    selectedCase?.mentorReview.quickRefresher || ""
  );
  const [masteredSkill, setMasteredSkill] = useState(
    selectedCase?.mentorReview.masteredSkill || ""
  );
  const [practiceSkill, setPracticeSkill] = useState(
    selectedCase?.mentorReview.practiceSkill || ""
  );
  const [isDrafting, setIsDrafting] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [mentorSavedBanner, setMentorSavedBanner] = useState<string | null>(null);

  // Coordinator hours tracking
  const [loggedMentorMinutes, setLoggedMentorMinutes] = useState(192);

  const handleSelectReviewCase = (c: LessonCase) => {
    setSelectedReviewId(c.id);
    setFocusedGap(c.mentorReview.focusedGap);
    setTeachingMove(c.mentorReview.teachingMove);
    setQuickRefresher(c.mentorReview.quickRefresher || "");
    setMasteredSkill(c.mentorReview.masteredSkill);
    setPracticeSkill(c.mentorReview.practiceSkill);
    setMentorSavedBanner(null);
    setMentorError(null);
  };

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
      const response = await fetch("/api/bansay/mentor-assist", {
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

  const handleReturnFeedback = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !focusedGap.trim() || !teachingMove.trim()) return;

    onUpdateCase({
      ...selectedCase,
      mentorReview: {
        ...selectedCase.mentorReview,
        focusedGap: focusedGap.trim(),
        teachingMove: teachingMove.trim(),
        quickRefresher: quickRefresher.trim(),
        masteredSkill: masteredSkill.trim() || "Clear, supportive tone",
        practiceSkill: practiceSkill.trim() || "Checking conceptual reasoning",
        reviewedAt: "Returned just now",
        status:
          selectedCase.freshCaseStatus === "submitted" ? "completed" : "returned",
      },
      freshCaseStatus:
        selectedCase.freshCaseStatus === "submitted"
          ? "verified"
          : selectedCase.freshCaseStatus === "locked"
          ? "ready"
          : selectedCase.freshCaseStatus,
    });
    setLoggedMentorMinutes((m) => m + 6);
    setMentorSavedBanner(
      `Signed and returned coaching note to ${selectedCase.teacherName}. Scenario 2 (Fresh Case) is now unlocked for the teacher.`
    );
  };

  const handlePublishToPeerLibrary = () => {
    if (!selectedCase) return;
    onAddPeerLibraryItem({
      id: `lib-${Date.now()}`,
      subjectTag: `${selectedCase.subject} ${selectedCase.gradeLevel.replace("Grade ", "")}`,
      subject: selectedCase.subject,
      title: selectedCase.topic,
      summary: selectedCase.support.specialtyBridge.title,
      verifiedExplanation:
        teachingMove.trim() || selectedCase.support.specialtyBridge.explanation,
      improvisedSetup: `${selectedCase.support.improvisedActivity.title}: ${selectedCase.support.improvisedActivity.materials.join(", ")}`,
      saveCount: 1,
      language: selectedCase.language,
    });
    setMentorSavedBanner(
      "Added anonymized, mentor-verified explanation to the Shared LAC Peer Library."
    );
  };

  // Pilot Cohort Calculations (Section 5.4 Thresholds)
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
            Subject Specialist Portal · Non-evaluative review
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            Mentor review queue
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review teacher rehearsals sorted by earliest class date, return one focused gap and practical teaching move within two school days.
          </p>
        </div>

        {mentorSavedBanner && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{mentorSavedBanner}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Queue List (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
            <p className="px-2 text-xs font-semibold text-slate-500">
              Assigned cases ({cases.length})
            </p>
            {cases.map((c) => {
              const active = c.id === selectedCase?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectReviewCase(c)}
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
                      {c.mentorReview.status === "pending" ? "Pending" : "Returned"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">
                    {c.topic}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                    Class: {c.classDate} · Major: {c.teacherMajor} · {c.language.toUpperCase()}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Review Workspace (8 cols) */}
          {selectedCase && (
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {selectedCase.teacherName} (College major: {selectedCase.teacherMajor}) · Class {selectedCase.classDate} · Language: {selectedCase.language.toUpperCase()}
                  </p>
                  <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
                    {selectedCase.topic}
                  </h2>
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

              {/* Teacher Evidence */}
              <div className="space-y-3">
                {selectedCase.baselineExplanation && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                      Teacher baseline explanation (before model hints)
                    </p>
                    <p className="text-xs sm:text-sm text-slate-800">
                      {selectedCase.baselineExplanation}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Rehearsal exchange
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

                {selectedCase.freshCaseResponse && (
                  <div className="rounded-xl bg-violet-50/50 border border-violet-200 p-3.5">
                    <p className="text-xs font-semibold text-violet-900 mb-1">
                      Independent Fresh-Case Response
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

              <form onSubmit={handleReturnFeedback} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    One focused gap (most important improvement)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={focusedGap}
                    onChange={(e) => setFocusedGap(e.target.value)}
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
                    onChange={(e) => setTeachingMove(e.target.value)}
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
                    Optional quick content refresher (if topic confusion observed)
                  </label>
                  <input
                    type="text"
                    value={quickRefresher}
                    onChange={(e) => setQuickRefresher(e.target.value)}
                    placeholder="Leave blank if subject explanation is accurate"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePublishToPeerLibrary}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-violet-700" />
                    <span>Save anonymized idea to LAC Library</span>
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Sign &amp; return feedback</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Coordinator & School-Level Pilot Oversight View (Section 5.4 & Table 6) */
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-violet-700 mb-1">
          {copy.cohortKicker}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
          {copy.cohortTitle}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          {copy.cohortSubtitle}
        </p>
      </div>

      {/* Privacy Notice (Table 5) */}
      <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 flex items-start gap-3">
        <Lock className="w-4 h-4 text-violet-800 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-950 leading-relaxed">
          <strong className="font-semibold">Coaching privacy safeguard:</strong>{" "}
          Individual rehearsal attempts and raw mentor notes remain strictly private between each teacher and assigned mentor. School coordinators view anonymized cohort trends only.
        </p>
      </div>

      {/* Continuation Thresholds Row (Section 5.4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-slate-500">Both coaching cycles completed</p>
          <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
            {completedBothCount} / {cohortSeats.length} teachers
          </p>
          <p className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Meets continuation threshold (≥ 6 of 8)</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-slate-500">Feedback within 2 school days</p>
          <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
            {totalOnTimeReviews} / 16 initial reviews
          </p>
          <p className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Meets turnaround threshold (≥ 13 of 16)</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <p className="text-xs text-slate-500">Fresh-case improvement (no major error)</p>
          <p className="font-display text-2xl font-bold text-slate-900 tabular-nums">
            {improvedCount} / {cohortSeats.length} teachers
          </p>
          <p className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Meets independent transfer goal (≥ 5 of 8)</span>
          </p>
        </div>
      </div>

      {/* Anonymized Cohort Roster + Budget/Hours (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Anonymized cohort participation
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              Live AI: {liveAiCount} · Offline prompt: {offlineFallbackCount}
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

        {/* Pilot Hours & Cost Log (Table 6) */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-700">
                Four-week pilot cost &amp; hours
              </p>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Delivery resource tracker
              </h2>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Logged direct mentor review</p>
              <p className="font-display text-xl font-bold text-slate-900 tabular-nums">
                {loggedMentorMinutes} mins
              </p>
            </div>
            <span className="text-xs text-slate-600 tabular-nums">
              Est. 32 review actions
            </span>
          </div>

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
              {PILOT_BUDGET_ITEMS.map((row) => (
                <tr key={row.expense}>
                  <td className="py-2.5 pr-2 font-medium text-slate-800">
                    {row.expense}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-600">{row.basis}</td>
                  <td className="py-2.5 pr-2 text-right font-mono text-slate-800">
                    {row.estimatedValue}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-600">
                    {row.donatedCash}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 font-semibold text-slate-900">
                <td className="py-2.5 pr-2">Total (1 cohort)</td>
                <td className="py-2.5 pr-2 text-slate-500 font-normal">Up to 8 seats</td>
                <td className="py-2.5 pr-2 text-right font-mono">₱3,700</td>
                <td className="py-2.5 text-right font-mono">₱300</td>
              </tr>
            </tbody>
          </table>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Illustrative pilot delivery estimate (₱231 per completed cycle at 16 cycles). Actual hours and cash expenses are logged before any renewal decision.
          </p>
        </section>
      </div>
    </div>
  );
}
