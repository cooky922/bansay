import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  Plus,
  X,
} from "lucide-react";
import type {
  BansayLanguage,
  ClassroomEvidenceItem,
  CompetencyQuarter,
} from "../types/bansay";
import { UI_COPY } from "../data/bansayData";

interface CpdPortfolioProps {
  language: BansayLanguage;
  quarters: CompetencyQuarter[];
  evidenceItems: ClassroomEvidenceItem[];
  onAddEvidence: (item: ClassroomEvidenceItem) => void;
  practiceHours: number;
}

export function CpdPortfolio({
  language,
  quarters,
  evidenceItems,
  onAddEvidence,
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

  const totalCompleted = quarters.reduce((sum, q) => sum + q.completedCount, 0);
  const totalTarget = quarters.reduce((sum, q) => sum + q.targetCount, 0);

  const handleSubmitEvidence = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !revisionUsed.trim()) return;

    const newItem: ClassroomEvidenceItem = {
      id: `ev-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim(),
      date: new Date().toISOString().slice(0, 10),
      revisionUsed: revisionUsed.trim(),
      classroomOutcome:
        classroomOutcome.trim() || "Applied revised explanation during class discussion.",
      evidenceType,
      verificationStatus: colleagueObserved ? "Colleague observed" : "Teacher logged",
    };

    onAddEvidence(newItem);
    setTitle("");
    setRevisionUsed("");
    setClassroomOutcome("");
    setColleagueObserved(false);
    setModalOpen(false);
  };

  const handleExportSummary = () => {
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>BANSAY Teaching Evidence Portfolio Summary</title>
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
  <h1>BANSAY Teaching Evidence Portfolio</h1>
  <p class="muted">Annual Competency Review Track (SY 2026–2027) · Practice hours: ${practiceHours.toFixed(1)} h · Competencies ready: ${totalCompleted}/${totalTarget}</p>
  <div class="box">
    <strong>Note on Recognition:</strong> Online rehearsal hours and voluntary classroom implementation logs are tracked separately. Eligibility for PRC CPD units or DepEd credits depends on formal accredited partner agreements.
  </div>
  <h2>Quarterly Competency Map</h2>
  <div class="box">
    ${quarters
      .map(
        (q) =>
          `<div class="item"><strong>${q.quarter}: ${q.title}</strong> (${q.completedCount}/${q.targetCount}) — ${q.description}</div>`
      )
      .join("")}
  </div>
  <h2>Classroom Implementation Evidence</h2>
  <div class="box">
    ${evidenceItems
      .map(
        (ev) =>
          `<div class="item"><strong>${ev.title}</strong> (${ev.subject} · ${ev.date} · ${ev.verificationStatus})<br/><em>Revision used:</em> ${ev.revisionUsed}<br/><em>What followed in class:</em> ${ev.classroomOutcome}</div>`
      )
      .join("")}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bansay-teaching-evidence-portfolio.html";
    a.click();
    URL.revokeObjectURL(url);
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

        <button
          type="button"
          onClick={handleExportSummary}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600"
        >
          <Download className="w-4 h-4" />
          <span>{copy.exportPortfolioBtn}</span>
        </button>
      </div>

      {/* Annual Track Purple Banner (Figure 7) */}
      <section className="rounded-2xl bg-[#381B68] text-white p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex flex-col items-center justify-center shrink-0 tabular-nums">
              <span className="font-display text-2xl font-extrabold leading-none">
                {totalCompleted}
              </span>
              <span className="text-[11px] text-purple-200 mt-0.5">
                of {totalTarget}
              </span>
            </div>
            <div>
              <p className="text-xs text-purple-200 font-medium">2026 Annual Track</p>
              <h2 className="font-display text-lg sm:text-xl font-bold mt-0.5">
                You&apos;re building steady, classroom-ready evidence.
              </h2>
              <p className="text-xs text-purple-200/85 mt-1">
                {Math.max(0, totalTarget - totalCompleted)} more competencies complete your annual portfolio review package.
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
          Rehearsal progress and voluntary classroom implementation logs are tracked separately. Future PRC CPD units or DepEd credit recognition remain subject to formal accredited partner agreements.
        </p>
      </section>

      {/* Two-Column Map + Classroom Evidence (Figure 7) */}
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
              School year 2026–2027
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
              <p className="text-xs font-semibold text-violet-700">
                Classroom evidence
              </p>
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
            {evidenceItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-violet-700 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </h3>
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
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
            <Lock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <span>
              Classroom evidence stays separate from private rehearsal attempts and is only exported when you choose to share your summary.
            </span>
          </div>
        </section>
      </div>

      {/* Add Classroom Evidence Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-evidence-title"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
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
                  onChange={(e) => setTitle(e.target.value)}
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
                  <select
                    value={evidenceType}
                    onChange={(e) =>
                      setEvidenceType(
                        e.target.value as ClassroomEvidenceItem["evidenceType"]
                      )
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="Improvised Lab Setup">Improvised Lab Setup</option>
                    <option value="Classroom Reflection">Classroom Reflection</option>
                    <option value="Colleague Observation">Colleague Observation</option>
                  </select>
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
                  onChange={(e) => setRevisionUsed(e.target.value)}
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
                <input
                  type="checkbox"
                  checked={colleagueObserved}
                  onChange={(e) => setColleagueObserved(e.target.checked)}
                  className="rounded border-slate-300 text-violet-700"
                />
                <span>A fellow teacher observed the physical setup or demonstration locally</span>
              </label>

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
                  className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold"
                >
                  Save to portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
