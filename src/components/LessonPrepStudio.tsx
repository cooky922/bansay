import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Lock,
  MoreHorizontal,
  ShieldCheck,
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
import { offlinePackStorageKey } from "../lib/workspaceNavigation";
import { OfflinePackCard } from "./OfflinePackCard";
import { ConceptPackSteps } from "./ConceptPackSteps";
import { DatePicker } from "./DatePicker";
import { Checkbox, FieldError } from "./ui";
import { bansayFetch } from "../lib/apiClient";
import { requestConceptPack } from "../lib/conceptPackRequest";

interface LessonPrepStudioProps {
  language: BansayLanguage;
  lowDataMode: boolean;
  initialPackStep?: number;
  demoVerified?: boolean;
  user: AuthUserProfile;
  activeCase?: LessonCase;
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
    factSheet?: string;
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

function computeDaysUntil(dateStr: string): number {
  if (!dateStr) return 5;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return 5;
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isCurrentConceptPack(value: unknown): value is ValidatedConceptPack {
  if (!value || typeof value !== "object") return false;
  const pack = value as Partial<ValidatedConceptPack>;
  return Boolean(
    pack.understand &&
      Array.isArray(pack.understand.big_idea_lines) &&
      pack.understand.diagram &&
      Array.isArray(pack.understand.key_terms) &&
      pack.model &&
      Array.isArray(pack.model.steps) &&
      pack.model.formula &&
      pack.connect &&
      Array.isArray(pack.connect.mappings) &&
      pack.worked_example &&
      Array.isArray(pack.worked_example.steps) &&
      pack.worked_example.common_error &&
      pack.misconceptions &&
      Array.isArray(pack.misconceptions.items) &&
      pack.self_check &&
      Array.isArray(pack.self_check.questions) &&
      pack.teach_it &&
      Array.isArray(pack.teach_it.say_in_class_lines) &&
      pack.teach_it.activity
  );
}

function offlinePackText(activeCase: LessonCase, pack: ValidatedConceptPack) {
  return [
    `BANSAY 10-MINUTE CONCEPT PACK`,
    `==========================================`,
    `Status: ${activeCase.packStatus === "mentor-verified" ? "Mentor verified" : "Unverified AI draft"}`,
    `Topic: ${activeCase.topic} (${activeCase.subject} · ${activeCase.gradeLevel})`,
    ...(pack.curriculum?.references?.length
    ? [`Curriculum: ${pack.curriculum.framework} (${pack.curriculum.competencyCode}) — ${pack.curriculum.competency}`]
    : []),
    ``,
    `1. UNDERSTAND`,
    ...pack.understand.big_idea_lines,
    `Diagram (${pack.understand.diagram.template}): ${pack.understand.diagram.title} — ${pack.understand.diagram.caption}`,
    ...pack.understand.diagram.items.map((item) => `- ${item.label}: ${item.detail}`),
    `Key terms:`,
    ...pack.understand.key_terms.map((k) => `- ${k.term}: ${k.definition}`),
    ``,
    `2. MODEL`,
    ...pack.model.steps.map((s, i) => `${i + 1}. ${s}`),
    `When it applies: ${pack.model.when_it_applies}`,
    `When it doesn't apply: ${pack.model.when_it_does_not_apply}`,
    `Formula: ${pack.model.formula.law} (${pack.model.formula.equation})`,
    ``,
    `3. CONNECT (Your ${pack.connect.short_field_label} background)`,
    ...pack.connect.mappings.map((m) => `- ${m.field_feature} -> ${m.lesson_concept}: ${m.explanation}`),
    `Where the comparison stops: ${pack.connect.where_comparison_stops}`,
    ``,
    `4. WORKED EXAMPLE`,
    `Problem: ${pack.worked_example.problem}`,
    ...pack.worked_example.steps.map((s, i) => `${i + 1}. ${s}`),
    `Final answer: ${pack.worked_example.answer}`,
    `Common error (${pack.worked_example.common_error.error_name}): ${pack.worked_example.common_error.wrong_work} -> ${pack.worked_example.common_error.wrong_result}. ${pack.worked_example.common_error.why_wrong}`,
    ``,
    `5. MISCONCEPTIONS`,
    `Predict first: ${pack.misconceptions.prediction_prompt}`,
    ...pack.misconceptions.items.flatMap((m) => [
    `- ${m.name}`,
    `  What students say: ${m.what_students_say}`,
    `  What is really happening: ${m.what_is_really_happening}`,
    `  Teaching move: ${m.teaching_move}`,
  ]),
    ``,
    `6. SELF-CHECK`,
    ...pack.self_check.questions.flatMap((q, qi) => [
    `Q${qi + 1}: ${q.question}`,
    ...q.options.map((o) => `  [${o.correct ? "Correct" : "Incorrect"}] ${o.text} — ${o.explanation}`),
  ]),
    ``,
    `7. TEACH IT`,
    `Say this in class:`,
    ...pack.teach_it.say_in_class_lines.map((l) => `- ${l}`),
    `Activity: ${pack.teach_it.activity.title} (${pack.teach_it.activity.time_needed})`,
    `Prepare before class: ${pack.teach_it.activity.prepare_before_class}`,
    `Materials: ${pack.teach_it.activity.materials.map((m) => `${m.amount} ${m.name}`).join(", ")}`,
    `Predict: ${pack.teach_it.activity.predict_prompt}`,
    ...pack.teach_it.activity.steps.map((s) => `${s.number}. ${s.instruction}`),
    `Observe: ${pack.teach_it.activity.observe_prompt}`,
    `Explain: ${pack.teach_it.activity.explain_prompt}`,
    `Scale note: ${pack.teach_it.activity.scale_note}`,
    `Safety: ${pack.teach_it.activity.safety_note}`,
  ].join("\n");
}

export function LessonPrepStudio({
  language,
  user,
  activeCase,
  initialPackStep,
  demoVerified,
  onGenerateConceptPack,
  onPatchCase,
  onGoToRehearsal,
  onNotify,
}: LessonPrepStudioProps) {
  const copy = UI_COPY[language];
  const [step, setStep] = useState<1 | 2>(activeCase ? 2 : 1);
  const [showPackMenu, setShowPackMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const confirmNewLesson = useRef<HTMLDialogElement>(null);
  const setupHeading = useRef<HTMLHeadingElement>(null);
  const currentPack = activeCase?.support.validatedPack;
  const hasSteps = isCurrentConceptPack(currentPack);

  function openLessonPrep() {
    setShowPackMenu(false);
    setStep(1);
    window.requestAnimationFrame(() => setupHeading.current?.focus());
  }

  // Lesson Setup state (starts blank by default)
  const [subject, setSubject] = useState<SubjectName>("Science");
  const [gradeLevel, setGradeLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const teacherMajorInfo = (user.major || user.degree || "General Education").trim();
  const [classDate, setClassDate] = useState("");
  const [careerStage, setCareerStage] = useState<CareerStage>("1");
  const [usesLabEquipment, setUsesLabEquipment] = useState(false);
  const [showFactSheetInput, setShowFactSheetInput] = useState(false);
  const [factSheetText, setFactSheetText] = useState("");

  const [matchedLac, setMatchedLac] = useState<PeerLibraryItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const effectiveTopic = useCustomTopic ? customTopic.trim() : topic.trim();
  const daysUntilClass = computeDaysUntil(classDate);
  const meetsThreeDayWindow = daysUntilClass >= 3;

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

  const handleFactSheetUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFactSheetText(text);
    setShowFactSheetInput(true);
  };

  const resetIntakeToBlank = () => {
    setTopic("");
    setClassDate("");
    setGradeLevel("");
    setCustomTopic("");
    setUseCustomTopic(false);
    setCareerStage("1");
    setFactSheetText("");
    setShowFactSheetInput(false);
    setApiError(null);
    openLessonPrep();
  };

  const handleBuildSupport = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradeLevel) {
      setApiError("Please select a grade level.");
      return;
    }
    if (!effectiveTopic) {
      setApiError("Please select or enter an upcoming lesson topic.");
      return;
    }
    if (!classDate) {
      setApiError("Please select a class date.");
      return;
    }
    setApiError(null);
    setIsGenerating(true);

    try {
      const outcome = await requestConceptPack(() =>
        onGenerateConceptPack({
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
          factSheet: factSheetText.trim() || undefined,
        })
      );
      if (!outcome.ok) {
        setApiError(outcome.message);
        return;
      }
      setStep(2);
      onNotify("Your 10-Minute Concept Pack is ready.");
    } catch {
      setApiError("Could not build your Concept Pack. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const presetOptions = DEPED_TOPIC_PRESETS[subject].filter(
    (preset) => preset.gradeLevel === gradeLevel
  );

  return (
    <div className="space-y-6">
      {step === 1 || !activeCase ? (
        <div className="space-y-3">
          {activeCase && (
            <nav aria-label="Breadcrumb" className="flex justify-end">
              <a href="#concept-pack" onClick={(event) => {
                event.preventDefault();
                setStep(2);
                window.requestAnimationFrame(() => document.getElementById("concept-pack")?.focus());
              }} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-bansay-strong hover:bg-bansay-tint">
                Back to Concept Pack <ArrowRight size={17} aria-hidden="true" />
              </a>
            </nav>
          )}
        <section className="w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-violet-700 mb-1">
                {copy.step1Kicker}
              </p>
              <h1 id="lesson-prep-studio" ref={setupHeading} tabIndex={-1} className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                {copy.step1Title}
              </h1>
            </div>
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
                  placeholder="Select a grade level"
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
                    {useCustomTopic ? "Choose a preset" : "Type custom topic"}
                  </button>
                </div>

                {useCustomTopic ? (
                  <input
                    id="topic-input"
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder={"Enter a topic or competency..."}
                    className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
                  />
                ) : (
                  <CustomSelect
                    value={topic}
                    onChange={setTopic}
                    placeholder={gradeLevel ? "Select a topic..." : "Select a grade level first"}
                    options={presetOptions.map((preset) => ({
                      value: preset.topic,
                      label: preset.topic,
                    }))}
                    ariaLabel="DepEd topic"
                  />
                )}
              </div>
            </div>
              <label className="proficiency-equipment-toggle flex items-center gap-2 min-h-11 border-t border-slate-200 pt-2 text-sm font-medium text-slate-700">
                <Checkbox
                  checked={usesLabEquipment}
                  onChange={(e) => setUsesLabEquipment(e.target.checked)}
                />
                <span>School science laboratory equipment is available</span>
              </label>
            </div>

            {/* Deadline-Aware Lead Time Banner + Matched Shared LAC Library Check */}
            {classDate && <div
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
            </div>}

            {/* Lesson proficiency */}
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
            </div>

            {/* Optional Mentor Fact Sheet (JSON or plain text) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Optional mentor fact sheet (JSON or text)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowFactSheetInput((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  <span>{showFactSheetInput ? "Hide" : "Attach fact sheet"}</span>
                  {showFactSheetInput ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {showFactSheetInput && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] text-slate-600">
                    When present, the pack treats this fact sheet as source of truth and shows curriculum competency info when its references are verified. Leave blank for any general topic.
                  </p>
                  <input
                    type="file"
                    accept=".json,.txt,application/json,text/plain"
                    onChange={(e) => void handleFactSheetUpload(e)}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-800 hover:file:bg-slate-50"
                  />
                  <textarea
                    rows={3}
                    value={factSheetText}
                    onChange={(e) => setFactSheetText(e.target.value)}
                    placeholder="Paste a mentor fact sheet JSON or plain text (Competency:, Core explanation:, Key terms:, Approved materials:)..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
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
                  copy.buildSupportBtn
                )}
              </button>
            </div>
          </form>
        </section>
        </div>
      ) : (
        <section id="concept-pack" tabIndex={-1} aria-label="Concept Pack" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <nav aria-label="Breadcrumb">
              <a href="#lesson-prep-studio" onClick={(event) => {
                event.preventDefault();
                openLessonPrep();
              }} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-bansay-strong hover:bg-bansay-tint">
                <ArrowLeft size={17} aria-hidden="true" /> Lesson Prep Studio
              </a>
            </nav>
            <div className="relative" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setShowPackMenu(false);
            }} onKeyDown={(event) => {
              if (event.key === "Escape" && showPackMenu) {
                event.stopPropagation();
                setShowPackMenu(false);
                menuButton.current?.focus();
              }
            }}>
              <button ref={menuButton} type="button" className="icon-button min-h-11 min-w-11" aria-label="Concept Pack options" aria-expanded={showPackMenu}
                onClick={() => setShowPackMenu((open) => !open)}>
                <MoreHorizontal size={22} aria-hidden="true" />
              </button>
              {showPackMenu && (
                <div className="absolute right-0 top-full z-20 w-48 rounded-xl border border-bansay-line bg-white p-1 shadow-lg">
                  <button type="button" className="ui-button ui-button-quiet w-full justify-start" onClick={() => {
                    if (!hasSteps) {
                      resetIntakeToBlank();
                      return;
                    }
                    menuButton.current?.focus();
                    setShowPackMenu(false);
                    confirmNewLesson.current?.showModal();
                  }}>Start a new lesson</button>
                </div>
              )}
            </div>
          </div>

          <dialog ref={confirmNewLesson} aria-labelledby="new-lesson-title" className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-bansay-line bg-white p-5 backdrop:bg-slate-950/45">
            <form method="dialog" onSubmit={(event) => {
              if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "start") {
                resetIntakeToBlank();
              }
            }}>
              <h2 id="new-lesson-title" className="text-bansay-deep">Your progress is saved. Start a new lesson?</h2>
              <div className="mt-4 flex justify-end gap-2">
                <button type="submit" value="cancel" autoFocus className="ui-button ui-button-secondary">Cancel</button>
                <button type="submit" value="start" className="ui-button ui-button-primary">Start</button>
              </div>
            </form>
          </dialog>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-7">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-bansay-line bg-bansay-tint px-2.5 py-1 font-semibold text-bansay-strong">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  {activeCase.packStatus === "mentor-verified" ? "Mentor verified" : "Unverified AI draft"}
                </span>
                <span className="font-medium text-slate-600">{activeCase.subject} &middot; {activeCase.gradeLevel}</span>
              </div>
              <h1 className="font-display font-bold text-slate-900 wrap-anywhere">{activeCase.topic}</h1>
            </header>

            {hasSteps ? (
              <ConceptPackSteps
                key={activeCase.id}
                pack={currentPack}
                initialStep={initialPackStep}
                teacherMajor={activeCase.teacherMajor}
                progressKey={`bansay-pack-progress-${user.id}-${activeCase.id}`}
                renderOfflineFooter={(backButton, practiceButton) => (
                  <OfflinePackCard storageKey={offlinePackStorageKey(user.id, activeCase.id)} text={offlinePackText(activeCase, currentPack)} backButton={backButton} practiceButton={practiceButton} />
                )}
                onSelfCheckComplete={(score) => void onPatchCase(activeCase.id, { selfCheckScore: score })}
                onPracticeExplaining={onGoToRehearsal}
              />
            ) : (
              <div className="space-y-4">
                <p role="status" className="rounded-xl border border-slate-300 bg-slate-50 p-5 text-sm text-slate-900">
                  <strong>This saved Concept Pack uses an older format.</strong> Start a new lesson to generate it in the 7-step format.
                </p>
                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <button type="button" onClick={onGoToRehearsal} className="ui-button ui-button-primary h-[48px] w-[12.5rem] shrink-0 whitespace-nowrap px-2!">
                    Practice explaining this <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
