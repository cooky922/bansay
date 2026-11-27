import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Lock,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  BansayLanguage,
  ClassroomEvidenceItem,
  CompetencyQuarter,
  LessonCase,
} from "../types/bansay";
import { UI_COPY } from "../data/bansayData";
import { CustomSelect } from "./CustomSelect";
import { Checkbox, FieldError } from "./ui";

interface CpdPortfolioProps {
  language: BansayLanguage;
  quarters: CompetencyQuarter[];
  evidenceItems: ClassroomEvidenceItem[];
  cases: LessonCase[];
  onAddEvidence: (payload: {
    title: string;
    subject: string;
    revisionUsed: string;
    classroomOutcome: string;
    evidenceType: ClassroomEvidenceItem["evidenceType"];
    colleagueObserved: boolean;
    hasPhotoAttachment: boolean;
    noStudentFacesConfirmed: boolean;
  }) => Promise<void>;
  onLogPortfolioExport: (exportType: "pmes-annex-a" | "cpd-summary") => Promise<void>;
  practiceHours: number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function CpdPortfolio({
  language,
  quarters,
  evidenceItems,
  cases,
  onAddEvidence,
  onLogPortfolioExport,
  practiceHours,
}: CpdPortfolioProps) {
  const copy = UI_COPY[language];
  const [modalOpen, setModalOpen] = useState(false);

  // Add evidence form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Science 7 · Solutions");
  const [evidenceType, setEvidenceType] =
    useState<ClassroomEvidenceItem["evidenceType"]>("Classroom Reflection");
  const [revisionUsed, setRevisionUsed] = useState("");
  const [classroomOutcome, setClassroomOutcome] = useState("");
  const [colleagueObserved, setColleagueObserved] = useState(false);
  const [hasPhotoAttachment, setHasPhotoAttachment] = useState(false);
  const [noStudentFacesConfirmed, setNoStudentFacesConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCompleted = quarters.reduce((sum, q) => sum + q.completedCount, 0);
  const totalTarget = quarters.reduce((sum, q) => sum + q.targetCount, 0);
  const verifiedCases = cases.filter((c) => c.packStatus === "mentor-verified");
  const strippedMediaCount = cases.reduce(
    (sum, c) =>
      sum +
      c.mediaAssets.filter((m) => m.status === "stripped-from-portfolio").length,
    0
  );
  const vaultPhotoCount = cases.reduce(
    (sum, c) =>
      sum + c.mediaAssets.filter((m) => m.portfolioIncluded && m.status !== "purged").length,
    0
  );

  const handleSubmitEvidence = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Enter a short title so you can identify this evidence later.");
      return;
    }
    if (!revisionUsed.trim()) {
      setFormError("Describe the revision you used; this is required for your portfolio record.");
      return;
    }
    if (hasPhotoAttachment && !noStudentFacesConfirmed) {
      setFormError(
        "Confirm that your setup photo shows only classroom materials or boardwork, with no student faces."
      );
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      await onAddEvidence({
        title: title.trim(),
        subject: subject.trim(),
        revisionUsed: revisionUsed.trim(),
        classroomOutcome:
          classroomOutcome.trim() || "Applied revised explanation during class discussion.",
        evidenceType,
        colleagueObserved,
        hasPhotoAttachment,
        noStudentFacesConfirmed,
      });
      setTitle("");
      setRevisionUsed("");
      setClassroomOutcome("");
      setColleagueObserved(false);
      setHasPhotoAttachment(false);
      setNoStudentFacesConfirmed(false);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save evidence.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async (exportType: "pmes-annex-a" | "cpd-summary") => {
    const isPmes = exportType === "pmes-annex-a";
    const docTitle = isPmes
      ? "BANSAY Teacher-Custody PMES Annex A / MOV Pack"
      : "BANSAY Teaching Evidence & CPD Summary";

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; max-width: 780px; margin: 40px auto; padding: 0 24px; line-height: 1.55; }
  h1 { color: #31175B; margin-bottom: 4px; }
  .muted { color: #64748b; font-size: 13px; }
  .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0; }
  .item { border-bottom: 1px solid #f1f5f9; padding: 12px 0; }
  .item:last-child { border-bottom: none; }
</style>
</head>
<body>
  <h1>${escapeHtml(docTitle)}</h1>
  <p class="muted">Teacher-Custody Export · SY 2026–2027 · Competencies ready: ${totalCompleted}/${totalTarget} · Practice hours: ${practiceHours.toFixed(1)} h</p>
  <div class="box">
    <strong>RA 10173 &amp; Non-Punitive Safeguard:</strong> This export is 100% teacher-initiated. Raw rehearsal turns, error logs, voice recordings, and Phase 2 COT videos are automatically stripped and excluded.
  </div>
  <h2>Mentor-Verified Concept Packs (${verifiedCases.length})</h2>
  <div class="box">
    ${
      verifiedCases.length
        ? verifiedCases
            .map(
              (c) =>
                `<div class="item"><strong>${escapeHtml(c.subject)} (${escapeHtml(c.gradeLevel)}) — ${escapeHtml(c.topic)}</strong><br/><span class="muted">${escapeHtml(c.support.bigIdea.curriculumGrounding)} · PPST ${escapeHtml(c.support.bigIdea.ppstIndicators.join(", "))}</span><br/><em>Big Idea:</em> ${escapeHtml(c.support.bigIdea.summary)}</div>`
            )
            .join("")
        : "<p class='muted'>No Mentor-Verified Concept Packs yet. Pending AI Drafts remain excluded.</p>"
    }
  </div>
  ${
    !isPmes
      ? `<h2>Quarterly Competency Map</h2>
  <div class="box">
    ${quarters
      .map(
        (q) =>
          `<div class="item"><strong>${escapeHtml(q.quarter)}: ${escapeHtml(q.title)}</strong> (${q.completedCount}/${q.targetCount}) — ${escapeHtml(q.description)}</div>`
      )
      .join("")}
  </div>`
      : ""
  }
  <h2>Classroom Implementation Evidence (MOV)</h2>
  <div class="box">
    ${evidenceItems
      .map(
        (ev) =>
          `<div class="item"><strong>${escapeHtml(ev.title)}</strong> (${escapeHtml(ev.subject)} · ${escapeHtml(ev.date)} · ${escapeHtml(ev.verificationStatus)})<br/><em>Revision used:</em> ${escapeHtml(ev.revisionUsed)}<br/><em>What followed in class:</em> ${escapeHtml(ev.classroomOutcome)}${ev.photoRetentionNotice ? `<br/><span class="muted">${escapeHtml(ev.photoRetentionNotice)}</span>` : ""}</div>`
      )
      .join("")}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isPmes
      ? "bansay-pmes-annex-a-mov-pack.html"
      : "bansay-cpd-portfolio-summary.html";
    a.click();
    URL.revokeObjectURL(url);
    await onLogPortfolioExport(exportType);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-violet-700 mb-1">
            {copy.portfolioKicker}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            {copy.portfolioTitle}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {copy.portfolioSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExport("pmes-annex-a")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Export PMES Annex A MOV Pack</span>
          </button>
          <button
            type="button"
            onClick={() => void handleExport("cpd-summary")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CPD Summary</span>
          </button>
        </div>
      </div>

      {/* Annual Track Purple Banner */}
      <section className="rounded-2xl bg-[#381B68] text-white p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center shrink-0 tabular-nums">
              <span className="font-display text-2xl font-extrabold leading-none">
                {totalCompleted}
              </span>
              <span className="text-[11px] text-purple-200 mt-0.5">of {totalTarget}</span>
            </div>
            <div>
              <p className="text-xs text-purple-200 font-medium">
                SY 2026–2027 · Teacher-Custody Portfolio
              </p>
              <h2 className="font-display text-lg sm:text-xl font-bold mt-0.5">
                You&apos;re building steady, classroom-ready evidence.
              </h2>
              <p className="text-xs text-purple-200/85 mt-1">
                {verifiedCases.length} Mentor-Verified Concept Pack(s) · {evidenceItems.length} MOV evidence log(s) · {vaultPhotoCount} setup photo(s).
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white/10 border border-white/15 px-5 py-3.5 shrink-0">
            <p className="text-[11px] text-purple-200">Documented practice time</p>
            <p className="font-display text-2xl font-bold tabular-nums mt-0.5">
              {practiceHours.toFixed(1)} hours
            </p>
            <p className="text-[11px] text-purple-200/80 mt-0.5">
              Rehearsal + classroom reflections
            </p>
          </div>
        </div>

        <p className="mt-5 pt-4 border-t border-white/15 text-xs text-purple-100/85 leading-relaxed">
          Privacy Guarantee: Practice webcam clips, voice notes ({strippedMediaCount} excluded), and classroom clips are never included in your exported portfolio. Only verified lesson guides and your own evidence notes are exported.
        </p>
      </section>

      {/* Two-Column Map + Classroom Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Competency Map */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-semibold text-violet-700">Competency map</p>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Quarterly progress
              </h2>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              SY 2026–2027
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {quarters.map((q) => (
              <div key={q.quarter} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 tabular-nums ${
                      q.status === "verified"
                        ? "bg-violet-700 text-white"
                        : q.status === "in-progress"
                        ? "bg-violet-100 text-violet-900"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {q.quarter}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{q.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{q.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-800 tabular-nums">
                    {q.completedCount} / {q.targetCount}
                  </p>
                  <p className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
                    {q.status === "verified" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span className="text-emerald-800 font-medium">Verified</span>
                      </>
                    ) : q.status === "in-progress" ? (
                      <>
                        <Clock className="w-3 h-3 text-violet-700" />
                        <span className="text-violet-800 font-medium">In progress</span>
                      </>
                    ) : (
                      <span>Upcoming</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Classroom Evidence */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-semibold text-violet-700">Classroom evidence</p>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Implementation proof
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-violet-700" />
              <span>Add evidence</span>
            </button>
          </div>

          <div className="space-y-3">
            {evidenceItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No classroom evidence logged yet. Use &ldquo;Add evidence&rdquo; after applying a Concept Pack in class.
              </div>
            ) : (
              evidenceItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-violet-700 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {item.subject} · {item.date} · {item.evidenceType}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-emerald-800 whitespace-nowrap shrink-0">
                      {item.verificationStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900">Revision used:</strong>{" "}
                    {item.revisionUsed}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">What followed in class:</strong>{" "}
                    {item.classroomOutcome}
                  </p>
                  {item.photoRetentionNotice && (
                    <p className="text-[11px] text-violet-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.photoRetentionNotice}</span>
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
            <Lock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <span>
              Classroom evidence stays under your custody and is never shared with school heads or coordinators unless you export and submit it yourself.
            </span>
          </div>
        </section>
      </div>

      {/* Add Classroom Evidence Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-slate-950/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-evidence-title"
        >
          <div className="my-auto w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="add-evidence-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Log classroom implementation proof
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Evidence title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g., Dried saltwater saucer check with Grade 7 Ruby"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject &amp; topic
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Evidence type
                  </label>
                  <CustomSelect
                    value={evidenceType}
                    onChange={(value) =>
                      setEvidenceType(value as ClassroomEvidenceItem["evidenceType"])
                    }
                    options={[
                      "Improvised Lab Setup",
                      "Classroom Reflection",
                      "Colleague Observation",
                    ].map((item) => ({ value: item, label: item }))}
                    ariaLabel="Evidence type"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Which revision did you use in class?
                </label>
                <textarea
                  rows={2}
                  required
                  value={revisionUsed}
                  onChange={(e) => {
                    setRevisionUsed(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Describe the explanation or demonstration change you applied..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What happened when students responded?
                </label>
                <textarea
                  rows={2}
                  value={classroomOutcome}
                  onChange={(e) => setClassroomOutcome(e.target.value)}
                  placeholder="Briefly note how learners reacted or what follow-up questions came up..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <Checkbox
                  checked={colleagueObserved}
                  onChange={(e) => setColleagueObserved(e.target.checked)}
                />
                <span>A fellow teacher observed the physical setup or demonstration locally</span>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Checkbox
                    checked={hasPhotoAttachment}
                    onChange={(e) => {
                      setHasPhotoAttachment(e.target.checked);
                      if (!e.target.checked) setNoStudentFacesConfirmed(false);
                    }}
                  />
                  <span>Attach setup or boardwork photo (&le; 1 MB, kept private)</span>
                </label>
                {hasPhotoAttachment && (
                  <label className="flex items-start gap-2 text-xs text-violet-950 pl-1">
                    <Checkbox
                      checked={noStudentFacesConfirmed}
                      onChange={(e) => setNoStudentFacesConfirmed(e.target.checked)}
                    />
                    <span>
                      I confirm this photo shows only classroom materials or boardwork, with zero student faces or personal learner data (purged within 30 days of deletion/expiry).
                    </span>
                  </label>
                )}
              </div>

              {formError && <FieldError>{formError}</FieldError>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {isSubmitting ? "Saving…" : "Save to portfolio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
