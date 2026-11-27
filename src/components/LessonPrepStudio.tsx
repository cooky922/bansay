import { useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Download,
  FlaskConical,
  Lightbulb,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  AuthUserProfile,
  BansayLanguage,
  CareerStage,
  LessonCase,
  PeerLibraryItem,
  SubjectName,
  ValidatedConceptPack,
} from "../types/bansay";
import {
  CAREER_STAGE_LABELS,
  curriculumFrameworkForGrade,
  DEPED_TOPIC_PRESETS,
  UI_COPY,
} from "../data/bansayData";
import { CustomSelect } from "./CustomSelect";
import { ConceptPackSteps } from "./ConceptPackSteps";
import { DatePicker } from "./DatePicker";
import { Checkbox, FieldError, Tabs } from "./ui";
import { bansayFetch } from "../lib/apiClient";
import { requestConceptPack } from "../lib/conceptPackRequest";

interface LessonPrepStudioProps {
  language: BansayLanguage;
  lowDataMode: boolean;
  user: AuthUserProfile;
  cases: LessonCase[];
  activeCase?: LessonCase;
  onSelectCase: (id: string) => void;
  onGenerateConceptPack: (payload: {
    subject: SubjectName;
    gradeLevel: string;
    topic: string;
    teacherMajor: string;
    classDate: string;
    careerStage: CareerStage;
    startingMaterial: string;
    baselineFirst: boolean;
    baselineExplanation: string;
    usesLabEquipment: boolean;
  }) => Promise<{ demo?: boolean }>;
  onPatchCase: (
    caseId: string,
    patch: Partial<{
      baselineExplanation: string;
      diagnosticCompleted: boolean;
      selfCheckScore: number;
      cachedOffline: boolean;
    }>
  ) => Promise<void>;
  onGoToRehearsal: () => void;
  onNotify: (message: string) => void;
}

type SupportTab =
  | "bridge"
  | "examples"
  | "diagnostic"
  | "selfcheck"
  | "activity"
  | "judge";

function computeDaysUntil(dateStr: string): number {
  if (!dateStr) return 5;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return 5;
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function defaultClassDate(): string {
  return new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
}

function isCurrentConceptPack(value: unknown): value is ValidatedConceptPack {
  if (!value || typeof value !== "object") return false;
  const pack = value as Partial<ValidatedConceptPack>;
  return Boolean(
    pack.grounding && Array.isArray(pack.grounding.sources) &&
    pack.formula && Array.isArray(pack.formula.variables) &&
    pack.worked_example && typeof pack.worked_example.problem === "string" &&
    Array.isArray(pack.worked_example.steps) && typeof pack.worked_example.answer === "string" &&
    pack.contrast && typeof pack.contrast.wrong_result === "string" &&
    Array.isArray(pack.misconceptions) && Array.isArray(pack.self_check) &&
    pack.demo && Array.isArray(pack.demo.materials) && Array.isArray(pack.demo.steps)
  );
}

export function LessonPrepStudio({
  language,
  user,
  cases,
  activeCase,
  onSelectCase,
  onGenerateConceptPack,
  onPatchCase,
  onGoToRehearsal,
  onNotify,
}: LessonPrepStudioProps) {
  const copy = UI_COPY[language];
  const [step, setStep] = useState<1 | 2>(activeCase ? 2 : 1);
  const [supportTab, setSupportTab] = useState<SupportTab>("bridge");

  // Step 2 Intake state (starts blank by default)
  const [subject, setSubject] = useState<SubjectName>("Science");
  const [gradeLevel, setGradeLevel] = useState("Grade 7");
  const [topic, setTopic] = useState("");
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const teacherMajorInfo = (user.major || user.degree || "General Education").trim();
  const [classDate, setClassDate] = useState(defaultClassDate());
  const [careerStage, setCareerStage] = useState<CareerStage>("2");
  const [usesLabEquipment, setUsesLabEquipment] = useState(false);

  const [matchedLac, setMatchedLac] = useState<PeerLibraryItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Step 3 interactive Concept Pack states
  const [baselineDraft, setBaselineDraft] = useState("");
  const [baselineSkipped, setBaselineSkipped] = useState(false);
  const [selectedDiagnosticIdx, setSelectedDiagnosticIdx] = useState<number | null>(null);
  const [selfCheckAnswers, setSelfCheckAnswers] = useState<Record<number, number>>({});

  const effectiveTopic = useCustomTopic ? customTopic.trim() : topic.trim();
  const daysUntilClass = computeDaysUntil(classDate);
  const meetsThreeDayWindow = daysUntilClass >= 3;

  useEffect(() => {
    setSelectedDiagnosticIdx(null);
    setSelfCheckAnswers({});
    setBaselineDraft("");
    setBaselineSkipped(false);
  }, [activeCase?.id]);

  // Check Shared LAC Library match automatically whenever class is < 3 school days away
  useEffect(() => {
    if (daysUntilClass >= 3 || !effectiveTopic) {
      setMatchedLac(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await bansayFetch(
          `/api/bansay/lac-library/match?subject=${encodeURIComponent(
            subject
          )}&topic=${encodeURIComponent(effectiveTopic)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { match: PeerLibraryItem | null };
        setMatchedLac(data.match);
      } catch {
        // ignore network lookup errors in low connectivity
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [daysUntilClass, subject, effectiveTopic]);

  const handleSubjectChange = (nextSubject: SubjectName) => {
    setSubject(nextSubject);
    if (!useCustomTopic) {
      setTopic("");
    }
  };

  const handleGradeChange = (nextGrade: string) => {
    setGradeLevel(nextGrade);
    if (!useCustomTopic) {
      setTopic("");
    }
  };

  const resetIntakeToBlank = () => {
    setTopic("");
    setCustomTopic("");
    setUseCustomTopic(false);
    setCareerStage("2");
    setApiError(null);
    setStep(1);
  };

  const handleBuildSupport = async (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveTopic) {
      setApiError("Please select or enter an upcoming DepEd lesson topic.");
      return;
    }
    setApiError(null);
    setIsGenerating(true);

    try {
      const outcome = await requestConceptPack(() => onGenerateConceptPack({
        subject,
        gradeLevel,
        topic: effectiveTopic,
        teacherMajor: teacherMajorInfo,
        classDate,
        careerStage,
        startingMaterial: "",
        baselineFirst: false,
        baselineExplanation: "",
        usesLabEquipment,
      }));
      if (!outcome.ok) {
        setApiError(outcome.message);
        return;
      }
      const result = outcome.value;
      setDemoMode(Boolean(result.demo));
      setSupportTab("bridge");
      setStep(2);
      onNotify("Your 10-Minute Concept Pack is ready.");
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Unable to generate 10-Minute Concept Pack right now."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBaseline = async () => {
    if (!activeCase || !baselineDraft.trim()) return;
    await onPatchCase(activeCase.id, { baselineExplanation: baselineDraft.trim() });
    setBaselineDraft("");
  };

  const handleSelectDiagnostic = async (idx: number) => {
    setSelectedDiagnosticIdx(idx);
    if (activeCase && !activeCase.diagnosticCompleted) {
      await onPatchCase(activeCase.id, { diagnosticCompleted: true });
    }
  };

  const handleSelectSelfCheck = async (itemIdx: number, optIdx: number) => {
    if (!activeCase) return;
    const nextAnswers = { ...selfCheckAnswers, [itemIdx]: optIdx };
    setSelfCheckAnswers(nextAnswers);
    const items = activeCase.support.quickSelfCheck || [];
    if (Object.keys(nextAnswers).length === items.length && items.length > 0) {
      const score = items.reduce(
        (sum, item, idx) => sum + (nextAnswers[idx] === item.correctIndex ? 1 : 0),
        0
      );
      await onPatchCase(activeCase.id, { selfCheckScore: score });
    }
  };

  const handleDownloadOfflineGuide = async () => {
    if (!activeCase) return;
    const {
      bigIdea,
      specialtyBridge,
      contrastiveExamples,
      misconceptionDiagnostic,
      misconceptionAlerts,
      quickSelfCheck,
      improvisedActivity,
      simulatedStudentPrompt,
    } = activeCase.support;

    const textContent = [
      `BANSAY OFFLINE 10-MINUTE CONCEPT PACK`,
      `==========================================`,
      `Status: ${activeCase.packStatus === "mentor-verified" ? "MENTOR-VERIFIED" : "AI DRAFT (UNVERIFIED)"}`,
      `Topic: ${activeCase.topic} (${activeCase.subject} · ${activeCase.gradeLevel})`,
      `Curriculum: ${bigIdea.curriculumGrounding}`,
      `Bridge Lens: ${activeCase.teacherMajor} · Class Date: ${activeCase.classDate}`,
      ``,
      `1. BIG IDEA SUMMARY`,
      bigIdea.summary,
      ``,
      `2. SPECIALTY BRIDGE FOR YOU (via ${activeCase.teacherMajor}): ${specialtyBridge.title}`,
      specialtyBridge.explanation,
      `For students (plain classroom explanation): ${specialtyBridge.trySaying}`,
      `Where the ${activeCase.teacherMajor} model stops: ${specialtyBridge.limitationNote}`,
      ``,
      `3. CONTRASTIVE CAUSAL WORKED EXAMPLES`,
      ...contrastiveExamples.flatMap((ex, i) => [
        `Example ${i + 1}: ${ex.title}`,
        `+ Positive: ${ex.positiveExample} | Why: ${ex.causalWhy}`,
        `- Non-Example: ${ex.contrastiveNonExample} | Difference: ${ex.contrastWhyItDiffers}`,
      ]),
      ``,
      `4. MISCONCEPTION DIAGNOSTIC & ALERTS`,
      `Diagnostic Prompt: ${misconceptionDiagnostic.prompt}`,
      `Mental Model: ${misconceptionDiagnostic.studentMentalModel}`,
      `Refutation: ${misconceptionDiagnostic.refutation}`,
      ...misconceptionAlerts.map(
        (m, i) => `Q${i + 1}: ${m.question} -> Move: ${m.practicalResponse}`
      ),
      ``,
      `5. QUICK SELF-CHECK (3 ITEMS)`,
      ...quickSelfCheck.map(
        (q) => `${q.question} (Answer: ${q.options[q.correctIndex]}) — ${q.feedback}`
      ),
      ``,
      `6. IMPROVISED ACTIVITY: ${improvisedActivity.title}`,
      `Materials: ${improvisedActivity.materials.join(", ")}`,
      ...improvisedActivity.steps.map((s, i) => `Step ${i + 1}: ${s}`),
      `Safety Protocol: ${improvisedActivity.safetyProtocol}`,
      `Key Takeaway: ${improvisedActivity.keyTakeaway}`,
      ``,
      `7. OFFLINE REHEARSAL PROMPT`,
      `Student (${simulatedStudentPrompt.studentName}): ${simulatedStudentPrompt.openingQuestion}`,
    ].join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bansay-concept-pack-${activeCase.subject.toLowerCase()}-${activeCase.gradeLevel
      .replace(/\s+/g, "")
      .toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    await onPatchCase(activeCase.id, { cachedOffline: true });
    onNotify("Offline Concept Pack downloaded for low-connectivity study.");
  };

  const needsBaselineGate = Boolean(
    activeCase &&
      activeCase.baselineFirst &&
      !activeCase.baselineExplanation.trim() &&
      !baselineSkipped
  );

  const presetOptions = DEPED_TOPIC_PRESETS[subject].filter(
    (preset) => preset.gradeLevel === gradeLevel
  );

  return (
    <div className="space-y-6">
      {step === 1 || !activeCase ? (
        <section className="w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-violet-700 mb-1">
                {copy.step1Kicker}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                {copy.step1Title}
              </h1>
            </div>
            {activeCase && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
              >
                <span>Back to Concept Pack</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Build a focused 10-minute guide around your upcoming topic, explained through concepts from your background.
          </p>

          <div className="mt-4 border-l-2 border-violet-200 pl-3 text-xs text-slate-600">
            <span>
              Specialty bridge lens:{" "}
              <strong className="font-semibold text-slate-900">{teacherMajorInfo}</strong>
            </span>
          </div>

          <form onSubmit={handleBuildSupport} className="mt-7 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-5">
            {/* Subject + Class Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Assigned subject
                </span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                  {(["Science", "Mathematics", "English"] as SubjectName[]).map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => handleSubjectChange(subj)}
                      className={`px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        subject === subj
                          ? "bg-white text-violet-900 shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {subj === "Mathematics" ? "Math" : subj}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Class date
                </span>
                <DatePicker
                  value={classDate}
                  onChange={setClassDate}
                  locale={language}
                  label="Class date"
                />
              </div>
            </div>

            {/* Grade & Curriculum beside Grade-Filtered DepEd Topic */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-4">
                <span className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Grade &amp; curriculum
                </span>
                <CustomSelect
                  value={gradeLevel}
                  onChange={handleGradeChange}
                  options={[
                    "Grade 7",
                    "Grade 8",
                    "Grade 9",
                    "Grade 10",
                    "Grade 11",
                    "Grade 12",
                  ].map((g) => ({
                    value: g,
                    label: `${g} · ${curriculumFrameworkForGrade(g).replace(/\s*\([^)]*\)/, "")}`,
                  }))}
                  ariaLabel="Grade level and curriculum"
                />
              </div>

              <div className="md:col-span-8">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="topic-input"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Lesson topic or competency
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomTopic(!useCustomTopic)}
                    className="text-xs font-semibold text-violet-700 hover:underline"
                  >
                    {useCustomTopic ? `Choose ${gradeLevel} preset` : "Type custom topic"}
                  </button>
                </div>

                {useCustomTopic ? (
                  <input
                    id="topic-input"
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder={`Enter a ${gradeLevel} ${subject} topic or competency...`}
                    className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
                  />
                ) : (
                  <CustomSelect
                    value={topic}
                    onChange={setTopic}
                    placeholder={`Select a ${gradeLevel} ${subject} topic...`}
                    options={presetOptions.map((preset) => ({
                      value: preset.topic,
                      label: preset.topic,
                    }))}
                    ariaLabel="DepEd topic"
                  />
                )}
              </div>
            </div>
            </div>

            {/* Deadline-Aware Lead Time Banner + Matched Shared LAC Library Check */}
            <div
              className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
                meetsThreeDayWindow
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-amber-200 bg-amber-50/80"
              }`}
            >
              {meetsThreeDayWindow ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              )}
              <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                {meetsThreeDayWindow ? (
                  <p>
                    <strong className="text-slate-900">
                      Mentor review available before class:
                    </strong>{" "}
                    Your class is <span className="tabular-nums font-semibold">{daysUntilClass} days</span>{" "}
                    away. After practicing, you can send your explanation to a mentor for feedback before class.
                  </p>
                ) : (
                  <p>
                    <strong className="text-amber-950">
                      Class is under 3 days away ({daysUntilClass <= 0 ? "today" : `${daysUntilClass} day(s)`}):
                    </strong>{" "}
                    Your Concept Pack and practice rehearsal are ready right away, and mentor feedback may arrive after class.
                  </p>
                )}
                {!meetsThreeDayWindow && matchedLac && (
                  <div className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-slate-700">
                    <strong className="text-violet-800">
                      Verified peer lesson found:
                    </strong>{" "}
                    {matchedLac.title} ({matchedLac.saveCount} saves).
                  </div>
                )}
              </div>
            </div>

            {/* Lesson proficiency with a compact classroom materials toggle */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Lesson Proficiency Self-Calibration
              </h2>
              <div className="relative grid grid-cols-4 rounded-xl bg-slate-100 p-1">
                <span
                  className="absolute inset-y-1 rounded-lg bg-violet-700 shadow-sm transition-transform duration-200"
                  style={{
                    width: "calc(25% - 0.25rem)",
                    transform: `translateX(${(Number(careerStage) - 1) * 100}%)`,
                  }}
                />
                {(["1", "2", "3", "4"] as CareerStage[]).map((stage) => (
                  <button
                    type="button"
                    key={stage}
                    onClick={() => setCareerStage(stage)}
                    className={`relative z-10 rounded-lg py-1.5 text-xs font-semibold ${
                      careerStage === stage ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-600">
                <strong>{CAREER_STAGE_LABELS[careerStage].name}:</strong>{" "}
                {CAREER_STAGE_LABELS[careerStage].focus}
              </p>
              <label className="proficiency-equipment-toggle flex items-center gap-2 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-700">
                <Checkbox
                  checked={usesLabEquipment}
                  onChange={(e) => setUsesLabEquipment(e.target.checked)}
                />
                <span>School science laboratory equipment is available</span>
              </label>
            </div>

            {apiError && <FieldError>{apiError}</FieldError>}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Private to you and your assigned mentor.</span>
              </p>
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Building your Concept Pack…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{copy.buildSupportBtn}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      ) : (
        /* Step 3: 6-Part 10-Minute Concept Pack */
        <section className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">
                  <span className="font-semibold text-violet-700">{activeCase.subject}</span>
                  {" · "}
                  <span>{activeCase.gradeLevel}</span>
                  {" · "}
                  <span>{activeCase.support.bigIdea.curriculumGrounding}</span>
                  {" · "}
                  <span>Bridge lens: {activeCase.teacherMajor}</span>
                  {" · "}
                  <span>Lesson proficiency: Level {activeCase.careerStage}</span>
                </p>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight text-balance">
                  {activeCase.topic}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {cases.length > 1 && (
                  <div className="w-56">
                    <CustomSelect
                      value={activeCase.id}
                      onChange={(caseId) => {
                        onSelectCase(caseId);
                        setDemoMode(false);
                      }}
                      options={cases.map((c) => ({
                        value: c.id,
                        label: `${c.subject} (${c.gradeLevel}) — ${c.topic.slice(0, 32)}`,
                      }))}
                      className="text-xs font-medium"
                      ariaLabel="Switch saved lesson"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void handleDownloadOfflineGuide()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  {activeCase.cachedOffline ? (
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download offline pack</span>
                </button>
                <button
                  type="button"
                  onClick={resetIntakeToBlank}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  New lesson
                </button>
              </div>
            </div>

            {activeCase.packStatus === "mentor-verified" && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <strong>Mentor-Verified Concept Pack</strong>
                <span>Reviewed by {activeCase.mentorReview.mentorName}.</span>
              </div>
            )}
            <div className="mt-6">
              {isCurrentConceptPack(activeCase.support.validatedPack) ? (
                <ConceptPackSteps pack={activeCase.support.validatedPack} />
              ) : (
                <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                  <strong>This saved Concept Pack uses an older format.</strong> Start a new lesson to generate it in the current format.
                  <button type="button" onClick={resetIntakeToBlank} className="ml-3 rounded-lg bg-violet-700 px-3 py-2 text-white">Start a new lesson</button>
                </div>
              )}
            </div>
            <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Ready to test this explanation in a quick student exchange?
              </p>
              <button
                type="button"
                onClick={onGoToRehearsal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <span>Practice explaining this</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
