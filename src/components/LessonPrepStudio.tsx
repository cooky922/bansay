import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Download,
  FlaskConical,
  ImagePlus,
  Lightbulb,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  AuthUserProfile,
  BansayLanguage,
  CareerStage,
  LessonCase,
  PeerLibraryItem,
  SubjectName,
} from "../types/bansay";
import {
  CAREER_STAGE_LABELS,
  curriculumFrameworkForGrade,
  DEPED_TOPIC_PRESETS,
  UI_COPY,
} from "../data/bansayData";
import { CustomSelect } from "./CustomSelect";
import { DatePicker } from "./DatePicker";
import { Checkbox, FieldError, Tabs } from "./ui";
import { bansayFetch } from "../lib/apiClient";

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
    imageData?: { mimeType: string; data: string };
    uploadedImagePreview?: string;
    noStudentFacesConfirmed?: boolean;
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
  const [startingMaterial, setStartingMaterial] = useState("");
  const [usesLabEquipment, setUsesLabEquipment] = useState(false);
  const [baselineFirst, setBaselineFirst] = useState(true);
  const [baselineIntakeExplanation, setBaselineIntakeExplanation] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState<string | undefined>(undefined);
  const [uploadedBase64, setUploadedBase64] = useState<{
    mimeType: string;
    data: string;
  } | null>(null);
  const [noStudentFacesConfirmed, setNoStudentFacesConfirmed] = useState(false);

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
  const activeFramework = curriculumFrameworkForGrade(gradeLevel);

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
    setStartingMaterial("");
    setBaselineIntakeExplanation("");
    setUploadedPreview(undefined);
    setUploadedBase64(null);
    setNoStudentFacesConfirmed(false);
    setCareerStage("2");
    setApiError(null);
    setStep(1);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setApiError("Please choose a setup or handwritten note photo under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedPreview(result);
      setNoStudentFacesConfirmed(false);
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        setUploadedBase64({ mimeType: match[1], data: match[2] });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBuildSupport = async (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveTopic) {
      setApiError("Please select or enter an upcoming DepEd lesson topic.");
      return;
    }
    if (uploadedPreview && !noStudentFacesConfirmed) {
      setApiError(
        "Please confirm that your uploaded photo shows materials or notes only (no student faces)."
      );
      return;
    }

    setApiError(null);
    setIsGenerating(true);

    try {
      const result = await onGenerateConceptPack({
        subject,
        gradeLevel,
        topic: effectiveTopic,
        teacherMajor: teacherMajorInfo,
        classDate,
        careerStage,
        startingMaterial: startingMaterial.trim(),
        baselineFirst,
        baselineExplanation: baselineIntakeExplanation.trim(),
        usesLabEquipment,
        imageData: uploadedBase64 || undefined,
        uploadedImagePreview: uploadedPreview,
        noStudentFacesConfirmed,
      });
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
            Prepare a focused 10-minute guide grounded in {activeFramework} and explained through concepts from your background.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>
              Specialty bridge lens (from profile):{" "}
              <strong className="font-semibold text-slate-900">{teacherMajorInfo}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Curriculum: <strong className="font-semibold text-slate-900">{activeFramework}</strong>
            </span>
          </div>

          <form onSubmit={handleBuildSupport} className="mt-6 space-y-5">
            {/* Subject + Class Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    label: `${g} · ${curriculumFrameworkForGrade(g)}`,
                  }))}
                  ariaLabel="Grade level and curriculum"
                />
              </div>

              <div className="md:col-span-8">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="topic-input"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Lesson topic or competency ({gradeLevel} · {activeFramework})
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

            {/* Lesson Proficiency Self-Calibration + Classroom Materials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Lesson Proficiency Self-Calibration
                  </span>
                  <span className="text-xs font-mono text-violet-700">Level {careerStage}</span>
                </div>
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
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Classroom materials
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Activities use everyday household items unless school lab equipment is checked below.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <Checkbox
                    checked={usesLabEquipment}
                    onChange={(e) => setUsesLabEquipment(e.target.checked)}
                  />
                  <span>School science laboratory equipment is available</span>
                </label>
              </div>
            </div>

            {/* Starting Material + Optional Photo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="starting-material"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Starting material or notes{" "}
                  <span className="font-normal text-slate-400">· Optional</span>
                </label>
                <textarea
                  id="starting-material"
                  rows={3}
                  value={startingMaterial}
                  onChange={(e) => setStartingMaterial(e.target.value)}
                  placeholder="Paste a module paragraph, learner question, or classroom materials on hand..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-700">
                  Note or setup photo{" "}
                  <span className="font-normal text-slate-400">· Optional</span>
                </span>
                {uploadedPreview ? (
                  <div className="border border-slate-200 rounded-xl p-3 space-y-2.5 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <img
                        src={uploadedPreview}
                        alt="Uploaded classroom setup preview"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          Photo attached
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Private to your workspace
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPreview(undefined);
                          setUploadedBase64(null);
                          setNoStudentFacesConfirmed(false);
                        }}
                        className="p-2 text-slate-500 hover:text-rose-700 rounded-lg"
                        aria-label="Remove attachment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <label className="flex items-start gap-2 text-xs text-slate-800">
                      <Checkbox
                        checked={noStudentFacesConfirmed}
                        onChange={(e) => setNoStudentFacesConfirmed(e.target.checked)}
                      />
                      <span>
                        Confirm photo shows materials or notes only (no student faces).
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-[88px] border border-dashed border-slate-300 rounded-xl bg-slate-50/70 hover:bg-violet-50/40 hover:border-violet-300 cursor-pointer transition-colors px-4 text-center">
                    <ImagePlus className="w-4 h-4 text-slate-500 mb-1" />
                    <span className="text-xs font-medium text-slate-700">
                      Add handwritten note or setup photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Starting Explanation */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Jot down your starting explanation</p>
                  <p className="text-xs text-slate-600">
                    Write 1–2 sentences first so you can compare your thinking with the Concept Pack.
                  </p>
                </div>
                <Checkbox
                  checked={baselineFirst}
                  onChange={(e) => setBaselineFirst(e.target.checked)}
                  aria-label="Prompt for starting explanation first"
                />
              </div>
              {baselineFirst && (
                <textarea
                  rows={2}
                  value={baselineIntakeExplanation}
                  onChange={(e) => setBaselineIntakeExplanation(e.target.value)}
                  placeholder="Optional now (or write it right before opening the Concept Pack)..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900"
                />
              )}
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

            {/* Persistent AI Draft / Mentor-Verified Epistemic Guardrail Banner */}
            {activeCase.packStatus === "mentor-verified" ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <strong>Mentor-Verified Concept Pack</strong> · Reviewed by{" "}
                  {activeCase.mentorReview.mentorName} for classroom use and portfolio export.
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950 space-y-1">
                <p>
                  <strong>Private Draft</strong> · For your personal prep and practice. Double-check against your DepEd Teacher&apos;s Guide and safety rules before teaching.
                </p>
                {demoMode && (
                  <p className="text-amber-900">
                    Local sample mode active (no live AI key configured).
                  </p>
                )}
              </div>
            )}

            {/* 6-Part + Judge Segmented Tabs */}
            <div className="mt-6">
              <Tabs
                value={supportTab}
                onChange={setSupportTab}
                label="10-Minute Concept Pack sections"
                items={[
                  { value: "bridge", label: "1–2 · Big Idea & Bridge" },
                  { value: "examples", label: "3 · Worked Examples" },
                  { value: "diagnostic", label: "4 · Misconceptions" },
                  { value: "selfcheck", label: "5 · Quick Self-Check" },
                  { value: "activity", label: "6 · Class Activity" },
                  {
                    value: "judge",
                    label: `Quality Check (${activeCase.support.judgeReport.passed ? "Ready" : "Review"})`,
                  },
                ]}
              />
            </div>

            {needsBaselineGate ? (
              <div className="mt-6 border border-violet-200 bg-violet-50/50 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-violet-800 mb-1">
                    Quick starting check
                  </p>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    How would you explain &ldquo;{activeCase.topic}&rdquo; in 1–2 sentences right now?
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Jotting down your own explanation first helps you see what changes after reading the guide.
                  </p>
                </div>
                <textarea
                  rows={3}
                  value={baselineDraft}
                  onChange={(e) => setBaselineDraft(e.target.value)}
                  placeholder="Write your quick intuitive explanation as you would tell your students..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setBaselineSkipped(true)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    Reveal Concept Pack anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveBaseline()}
                    disabled={!baselineDraft.trim()}
                    className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Save baseline &amp; open Concept Pack
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                {supportTab === "bridge" && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-1.5">
                      <p className="text-xs font-semibold text-violet-800">
                        Part 1 · Core Big Idea ({activeCase.support.bigIdea.curriculumGrounding})
                      </p>
                      <p className="text-sm sm:text-base text-slate-900 leading-relaxed font-medium">
                        {activeCase.support.bigIdea.summary}
                      </p>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-700 text-white flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-violet-700">
                          Part 2 · Teacher Understanding via {activeCase.teacherMajor}
                        </p>
                        <h2 className="font-display text-xl font-bold text-slate-900">
                          {activeCase.support.specialtyBridge.title}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl">
                          {activeCase.support.specialtyBridge.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 sm:p-5 space-y-1.5">
                      <p className="text-xs font-semibold text-violet-800">
                        How to explain it to students · Plain classroom language (no {activeCase.teacherMajor} jargon)
                      </p>
                      <p className="text-sm sm:text-base font-medium text-slate-900 italic leading-relaxed">
                        {activeCase.support.specialtyBridge.trySaying}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-800 mb-1">
                        Where your {activeCase.teacherMajor} model stops
                      </p>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {activeCase.support.specialtyBridge.limitationNote}
                      </p>
                    </div>
                  </div>
                )}

                {supportTab === "examples" && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-violet-700">
                      Part 3 · Worked Examples &amp; Non-Examples
                    </p>
                    {activeCase.support.contrastiveExamples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
                      >
                        <h3 className="font-display text-base font-bold text-slate-900">
                          {ex.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1.5">
                            <p className="text-xs font-semibold text-emerald-900">
                              Positive Example
                            </p>
                            <p className="text-sm text-slate-900">{ex.positiveExample}</p>
                            <p className="text-xs text-slate-700">
                              <strong>Causal Why:</strong> {ex.causalWhy}
                            </p>
                          </div>
                          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 space-y-1.5">
                            <p className="text-xs font-semibold text-amber-900">
                              Contrastive Non-Example
                            </p>
                            <p className="text-sm text-slate-900">
                              {ex.contrastiveNonExample}
                            </p>
                            <p className="text-xs text-slate-700">
                              <strong>Why it differs:</strong> {ex.contrastWhyItDiffers}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {supportTab === "diagnostic" && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-5 space-y-3">
                      <p className="text-xs font-semibold text-violet-800">
                        Part 4 · Common Student Misconception
                      </p>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        {activeCase.support.misconceptionDiagnostic.prompt}
                      </h3>
                      <div className="space-y-2">
                        {activeCase.support.misconceptionDiagnostic.options.map((opt, idx) => {
                          const picked = selectedDiagnosticIdx === idx;
                          const isDiagnosisTarget =
                            idx ===
                            activeCase.support.misconceptionDiagnostic.flawedOptionIndex;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => void handleSelectDiagnostic(idx)}
                              className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                                picked
                                  ? isDiagnosisTarget
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-medium"
                                    : "border-amber-400 bg-amber-50 text-amber-950"
                                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {(selectedDiagnosticIdx !== null ||
                        activeCase.diagnosticCompleted) && (
                        <div className="rounded-lg bg-white border border-slate-200 p-3.5 space-y-1.5 text-xs text-slate-700">
                          <p>
                            <strong className="text-slate-900">Student mental model:</strong>{" "}
                            {activeCase.support.misconceptionDiagnostic.studentMentalModel}
                          </p>
                          <p>
                            <strong className="text-violet-800">Classroom refutation:</strong>{" "}
                            {activeCase.support.misconceptionDiagnostic.refutation}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-700">
                        Likely Learner Follow-Up Questions
                      </p>
                      {activeCase.support.misconceptionAlerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white"
                        >
                          <h3 className="font-display text-sm font-bold text-slate-900">
                            {alert.question}
                          </h3>
                          <p className="text-xs text-slate-600">
                            <strong className="text-slate-800">What learner imagines:</strong>{" "}
                            {alert.whatStudentImagines}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                            <strong className="text-violet-800">Teaching move:</strong>{" "}
                            {alert.practicalResponse}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {supportTab === "selfcheck" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-violet-700">
                        Part 5 · 3-Item Quick Self-Check (Formative Retrieval)
                      </p>
                      {typeof activeCase.selfCheckScore === "number" && (
                        <span className="text-xs font-mono font-semibold text-emerald-800 tabular-nums">
                          Recorded score: {activeCase.selfCheckScore} /{" "}
                          {activeCase.support.quickSelfCheck.length}
                        </span>
                      )}
                    </div>

                    {activeCase.support.quickSelfCheck.map((item, qIdx) => {
                      const chosen = selfCheckAnswers[qIdx];
                      return (
                        <div
                          key={qIdx}
                          className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
                        >
                          <h3 className="text-sm font-semibold text-slate-900">
                            {item.question}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {item.options.map((opt, optIdx) => {
                              const isChosen = chosen === optIdx;
                              const isCorrect = optIdx === item.correctIndex;
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => void handleSelectSelfCheck(qIdx, optIdx)}
                                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                                    chosen !== undefined && isCorrect
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold"
                                      : isChosen
                                      ? "border-rose-400 bg-rose-50 text-rose-900"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {chosen !== undefined && (
                            <p className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                              {item.feedback}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {supportTab === "activity" && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-800 flex items-center justify-center shrink-0">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-violet-700 mb-0.5">
                          Part 6 · Low-Cost Classroom Demonstration (
                          {activeCase.usesLabEquipment
                            ? "Lab equipment enabled"
                            : "Everyday household items"}
                          )
                        </p>
                        <h2 className="font-display text-xl font-bold text-slate-900">
                          {activeCase.support.improvisedActivity.title}
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                        <h3 className="text-xs font-semibold text-slate-700 mb-2.5">
                          Everyday items needed
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                          {activeCase.support.improvisedActivity.materials.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-violet-700 font-semibold tabular-nums">
                                {i + 1}.
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4 bg-white">
                        <h3 className="text-xs font-semibold text-slate-700 mb-2.5">
                          Classroom steps
                        </h3>
                        <ol className="space-y-2 text-sm text-slate-700">
                          {activeCase.support.improvisedActivity.steps.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-violet-700 font-semibold tabular-nums">
                                {i + 1}.
                              </span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                      <p className="text-xs font-semibold text-amber-900 mb-1">
                        Classroom safety protocol
                      </p>
                      <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                        {activeCase.support.improvisedActivity.safetyProtocol}
                      </p>
                    </div>

                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                      <p className="text-xs font-semibold text-violet-900 mb-1">
                        What the class should conclude
                      </p>
                      <p className="text-sm text-slate-800 leading-relaxed">
                        {activeCase.support.improvisedActivity.keyTakeaway}
                      </p>
                    </div>
                  </div>
                )}

                {supportTab === "judge" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-violet-700">
                        Lesson Quality Check
                      </p>
                      <span className="text-xs text-slate-600 tabular-nums">
                        {activeCase.support.judgeReport.passed ? "Ready for practice" : "Needs quick review"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        {
                          label: "Conceptual Accuracy",
                          score: activeCase.support.judgeReport.scores.conceptualAccuracy,
                        },
                        {
                          label: "Analogy Clarity",
                          score: activeCase.support.judgeReport.scores.analogyFidelity,
                        },
                        {
                          label: "Misconception Depth",
                          score: activeCase.support.judgeReport.scores.misconceptionDepth,
                        },
                        {
                          label: "Local Feasibility",
                          score: activeCase.support.judgeReport.scores.localFeasibility,
                        },
                        {
                          label: "Quick Readability",
                          score: activeCase.support.judgeReport.scores.mobileScannability,
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                        >
                          <p className="text-xs text-slate-600">{row.label}</p>
                          <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                            {row.score} / 3
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-slate-600 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      {activeCase.support.judgeReport.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

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
