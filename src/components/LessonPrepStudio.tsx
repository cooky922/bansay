import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  Calendar,
  CheckCircle2,
  Download,
  FlaskConical,
  ImagePlus,
  Lightbulb,
  Loader2,
  Lock,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  BansayLanguage,
  GeneratedLessonSupport,
  LessonCase,
  SubjectName,
} from "../types/bansay";
import {
  DEPED_TOPIC_PRESETS,
  TEACHER_MAJORS,
  UI_COPY,
} from "../data/bansayData";

interface LessonPrepStudioProps {
  language: BansayLanguage;
  lowDataMode: boolean;
  cases: LessonCase[];
  activeCase: LessonCase;
  onSelectCase: (id: string) => void;
  onCreateOrUpdateCase: (newCase: LessonCase) => void;
  onUpdateActiveCase: (updated: LessonCase) => void;
  onGoToRehearsal: () => void;
}

type SupportTab = "bridge" | "misconceptions" | "activity";

function computeDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function LessonPrepStudio({
  language,
  lowDataMode,
  cases,
  activeCase,
  onSelectCase,
  onCreateOrUpdateCase,
  onUpdateActiveCase,
  onGoToRehearsal,
}: LessonPrepStudioProps) {
  const copy = UI_COPY[language];
  const [step, setStep] = useState<1 | 2>(2);
  const [supportTab, setSupportTab] = useState<SupportTab>("bridge");

  // Form state for Step 1
  const [subject, setSubject] = useState<SubjectName>(activeCase.subject);
  const [gradeLevel, setGradeLevel] = useState(activeCase.gradeLevel);
  const [topic, setTopic] = useState(activeCase.topic);
  const [customTopic, setCustomTopic] = useState("");
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [teacherMajor, setTeacherMajor] = useState(activeCase.teacherMajor);
  const [classDate, setClassDate] = useState(activeCase.classDate);
  const [startingMaterial, setStartingMaterial] = useState(activeCase.startingMaterial);
  const [baselineFirst, setBaselineFirst] = useState(activeCase.baselineFirst);
  const [uploadedPreview, setUploadedPreview] = useState<string | undefined>(
    activeCase.uploadedImagePreview
  );
  const [uploadedBase64, setUploadedBase64] = useState<{
    mimeType: string;
    data: string;
  } | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [baselineDraft, setBaselineDraft] = useState(activeCase.baselineExplanation);
  const [baselineSkipped, setBaselineSkipped] = useState(false);

  const daysUntilClass = computeDaysUntil(classDate);
  const meetsThreeDayWindow = daysUntilClass >= 3;

  const handleSubjectChange = (nextSubject: SubjectName) => {
    setSubject(nextSubject);
    const firstPreset = DEPED_TOPIC_PRESETS[nextSubject][0];
    if (firstPreset) {
      setTopic(firstPreset.topic);
      setGradeLevel(firstPreset.gradeLevel);
      setUseCustomTopic(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setApiError("Please choose an image or note file under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedPreview(result);
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        setUploadedBase64({ mimeType: match[1], data: match[2] });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBuildSupport = async (e: FormEvent) => {
    e.preventDefault();
    const chosenTopic = useCustomTopic ? customTopic.trim() : topic.trim();
    if (!chosenTopic) {
      setApiError("Please select or enter an upcoming DepEd lesson topic.");
      return;
    }

    setApiError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/bansay/generate-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          gradeLevel,
          topic: chosenTopic,
          teacherMajor,
          language,
          startingMaterial,
          imageData: uploadedBase64 || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to generate lesson support right now.");
      }

      const generated = data as GeneratedLessonSupport;
      const created: LessonCase = {
        id: `case-${Date.now()}`,
        subject,
        gradeLevel,
        topic: chosenTopic,
        teacherName: "Maria Reyes",
        teacherMajor,
        classDate,
        submittedAt: new Date().toISOString().slice(0, 10),
        language,
        startingMaterial,
        uploadedImagePreview: uploadedPreview,
        baselineFirst,
        baselineExplanation: "",
        submissionFormat: lowDataMode ? "offline-fallback" : "live-ai",
        support: generated,
        rehearsalMessages: [
          {
            id: `msg-${Date.now()}`,
            sender: "student",
            text: generated.simulatedStudentPrompt.openingQuestion,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
        mentorReview: {
          mentorName:
            subject === "Mathematics"
              ? "Lourdes Tan"
              : subject === "English"
              ? "Grace Bautista"
              : "Ramon Villamor",
          mentorAffiliation: `MSU-IIT ${subject} Specialist`,
          backupMentorName: "Elena Villanueva",
          languagesCovered: ["en", "fil", "ceb"],
          reviewedAt: "Pending submission",
          focusedGap: "",
          teachingMove: "",
          quickRefresher: "",
          masteredSkill: "",
          practiceSkill: "",
          status: "pending",
        },
        teacherRevision: "",
        freshCaseResponse: "",
        freshCaseStatus: "locked",
        cachedOffline: true,
      };

      onCreateOrUpdateCase(created);
      setBaselineDraft("");
      setBaselineSkipped(false);
      setSupportTab("bridge");
      setStep(2);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Network error generating lesson support.";
      setApiError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBaseline = () => {
    if (!baselineDraft.trim()) return;
    onUpdateActiveCase({
      ...activeCase,
      baselineExplanation: baselineDraft.trim(),
    });
  };

  const handleDownloadOfflineGuide = () => {
    const { specialtyBridge, misconceptionAlerts, improvisedActivity, simulatedStudentPrompt } =
      activeCase.support;

    const textContent = [
      `BANSAY OFFLINE LESSON GUIDE`,
      `==========================================`,
      `Topic: ${activeCase.topic} (${activeCase.subject} · ${activeCase.gradeLevel})`,
      `Teacher Major: ${activeCase.teacherMajor}`,
      `Class Date: ${activeCase.classDate}`,
      `Language: ${activeCase.language.toUpperCase()}`,
      ``,
      `1. SPECIALTY BRIDGE: ${specialtyBridge.title}`,
      specialtyBridge.explanation,
      `Try saying: ${specialtyBridge.trySaying}`,
      `Watch out (where analogy stops): ${specialtyBridge.limitationNote}`,
      ``,
      `2. MISCONCEPTION ALERTS`,
      ...misconceptionAlerts.flatMap((m, i) => [
        `Alert ${i + 1}: ${m.question}`,
        `What student imagines: ${m.whatStudentImagines}`,
        `Teaching move: ${m.practicalResponse}`,
        ``,
      ]),
      `3. IMPROVISED CLASSROOM ACTIVITY: ${improvisedActivity.title}`,
      `Materials: ${improvisedActivity.materials.join(", ")}`,
      ...improvisedActivity.steps.map((s, idx) => `Step ${idx + 1}: ${s}`),
      `Key Takeaway: ${improvisedActivity.keyTakeaway}`,
      ``,
      `4. OFFLINE REHEARSAL PROMPT (For weak connectivity)`,
      `Student (${simulatedStudentPrompt.studentName}) asks: ${simulatedStudentPrompt.openingQuestion}`,
      `Write your explanation on paper or voice note, then upload when connected.`,
    ].join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bansay-guide-${activeCase.subject.toLowerCase()}-${activeCase.gradeLevel.replace(/\s+/g, "").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    onUpdateActiveCase({
      ...activeCase,
      cachedOffline: true,
    });
  };

  const needsBaselineGate =
    activeCase.baselineFirst &&
    !activeCase.baselineExplanation.trim() &&
    !baselineSkipped;

  return (
    <div className="space-y-6">
      {/* Top Switcher Bar: Step 1 (Intake) vs Step 2 (Ready Support) + Saved Lessons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600 ${
              step === 1
                ? "bg-white text-violet-950 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Lesson intake
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600 ${
              step === 2
                ? "bg-white text-violet-950 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Ready-to-use support
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="active-case-select" className="text-xs text-slate-500 whitespace-nowrap">
            Active lesson:
          </label>
          <select
            id="active-case-select"
            value={activeCase.id}
            onChange={(e) => {
              onSelectCase(e.target.value);
              setBaselineDraft("");
              setBaselineSkipped(false);
            }}
            className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 max-w-xs truncate focus-visible:outline-2 focus-visible:outline-violet-600"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subject} ({c.gradeLevel}) — {c.topic.slice(0, 42)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {step === 1 ? (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-4xl">
          <p className="text-xs font-medium text-violet-700 mb-1">
            {copy.step1Kicker}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            {copy.step1Title}
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
            Enter your upcoming DepEd topic and your actual college degree. BANSAY builds a bridge from what you already know, plus common learner misconceptions and an improvised classroom activity.
          </p>

          <form onSubmit={handleBuildSupport} className="mt-6 space-y-5">
            {/* Subject & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assigned subject
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                  {(["Science", "Mathematics", "English"] as SubjectName[]).map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => handleSubjectChange(subj)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
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
                <label
                  htmlFor="major-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Your college major
                </label>
                <select
                  id="major-select"
                  value={teacherMajor}
                  onChange={(e) => setTeacherMajor(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                >
                  {TEACHER_MAJORS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="class-date"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Class date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="class-date"
                    type="date"
                    value={classDate}
                    onChange={(e) => setClassDate(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 tabular-nums focus-visible:outline-2 focus-visible:outline-violet-600"
                  />
                </div>
              </div>
            </div>

            {/* Turnaround Notice */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3">
              {meetsThreeDayWindow ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              )}
              <div className="text-xs text-slate-700 leading-relaxed">
                {meetsThreeDayWindow ? (
                  <span>
                    <strong className="text-slate-900">Within target mentor window:</strong> Class is{" "}
                    <span className="tabular-nums font-medium">{daysUntilClass} days</span> away. Submitting a rehearsal today qualifies for a specialist mentor reply within two school days before class.
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-900">Class is soon ({daysUntilClass <= 0 ? "today/past" : `${daysUntilClass} day(s)`}):</strong> You receive immediate specialty bridges, misconception alerts, and improvised lab guides right away. Human mentor review is targeted for requests submitted at least 3 school days ahead.
                  </span>
                )}
              </div>
            </div>

            {/* DepEd Topic */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="topic-select"
                  className="text-xs font-semibold text-slate-700"
                >
                  DepEd topic or learning competency
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomTopic(!useCustomTopic)}
                  className="text-xs font-medium text-violet-700 hover:underline"
                >
                  {useCustomTopic ? "Choose from DepEd presets" : "Type a custom topic"}
                </button>
              </div>

              {useCustomTopic ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    aria-label="Grade level"
                    className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                  </select>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g., Mixtures and pure substances — explaining why salt stays dissolved"
                    className="sm:col-span-3 text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                  />
                </div>
              ) : (
                <select
                  id="topic-select"
                  value={topic}
                  onChange={(e) => {
                    const selected = DEPED_TOPIC_PRESETS[subject].find(
                      (p) => p.topic === e.target.value
                    );
                    setTopic(e.target.value);
                    if (selected) setGradeLevel(selected.gradeLevel);
                  }}
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                >
                  {DEPED_TOPIC_PRESETS[subject].map((preset) => (
                    <option key={preset.topic} value={preset.topic}>
                      {preset.gradeLevel} — {preset.topic}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Starting Material + Photo Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="starting-material"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Starting material or notes <span className="font-normal text-slate-400">· Optional</span>
                </label>
                <textarea
                  id="starting-material"
                  rows={3}
                  value={startingMaterial}
                  onChange={(e) => setStartingMaterial(e.target.value)}
                  placeholder="Paste a module paragraph, sample question, or list of materials available in your classroom..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Photo of handwritten work or planned setup <span className="font-normal text-slate-400">· Up to 5 MB</span>
                </span>
                {uploadedPreview ? (
                  <div className="border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3 bg-slate-50">
                    <img
                      src={uploadedPreview}
                      alt="Uploaded teacher setup or notes"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        Classroom setup attached
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Included in support generation and mentor review
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedPreview(undefined);
                        setUploadedBase64(null);
                      }}
                      className="p-2 text-slate-500 hover:text-rose-700 rounded-lg"
                      aria-label="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-[88px] border border-dashed border-slate-300 rounded-xl bg-slate-50/70 hover:bg-violet-50/40 hover:border-violet-300 cursor-pointer transition-colors px-4 text-center">
                    <ImagePlus className="w-4 h-4 text-slate-500 mb-1" />
                    <span className="text-xs font-medium text-slate-700">
                      Add a photo or handwritten note
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

            {/* Baseline First Toggle */}
            <div className="flex items-center justify-between gap-4 border border-slate-200 rounded-xl px-4 py-3 bg-violet-50/40">
              <div>
                <p className="text-sm font-semibold text-slate-900">Baseline first</p>
                <p className="text-xs text-slate-600">
                  Answer once in your own words before opening model examples so mentors can see your independent reasoning.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={baselineFirst}
                onClick={() => setBaselineFirst(!baselineFirst)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-violet-600 ${
                  baselineFirst ? "bg-violet-700" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    baselineFirst ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {apiError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
              >
                {apiError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Your starting answer stays private to you and your assigned mentor.</span>
              </p>
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Building guide...</span>
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
        /* STEP 2: Ready-to-use Support (Figure 4) */
        <section className="space-y-5">
          {/* Header Row */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-violet-700">{copy.step2Kicker}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeCase.subject} · {activeCase.gradeLevel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Major: {activeCase.teacherMajor}</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                  {copy.step2Title}
                </h1>
                <p className="text-sm text-slate-600 mt-1">{activeCase.topic}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadOfflineGuide}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600"
                >
                  {activeCase.cachedOffline ? (
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download offline guide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  Edit intake
                </button>
              </div>
            </div>

            {/* Segmented Support Tabs */}
            <div
              className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-xl"
              role="tablist"
              aria-label="Lesson support sections"
            >
              <button
                type="button"
                role="tab"
                aria-selected={supportTab === "bridge"}
                onClick={() => setSupportTab("bridge")}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  supportTab === "bridge"
                    ? "bg-white text-violet-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Specialty bridge
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={supportTab === "misconceptions"}
                onClick={() => setSupportTab("misconceptions")}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  supportTab === "misconceptions"
                    ? "bg-white text-violet-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Misconception alerts ({activeCase.support.misconceptionAlerts.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={supportTab === "activity"}
                onClick={() => setSupportTab("activity")}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  supportTab === "activity"
                    ? "bg-white text-violet-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Improvised activity
              </button>
            </div>

            {/* Baseline-first gate */}
            {needsBaselineGate ? (
              <div className="mt-6 border border-violet-200 bg-violet-50/50 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-violet-800 mb-1">
                    Baseline first · Independent thinking check
                  </p>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    How would you explain "{activeCase.topic}" in 1–2 sentences right now?
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Writing your starting answer before viewing model examples lets your mentor coach your actual reasoning.
                  </p>
                </div>
                <textarea
                  rows={3}
                  value={baselineDraft}
                  onChange={(e) => setBaselineDraft(e.target.value)}
                  placeholder="Write your quick initial explanation as you would tell your class..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setBaselineSkipped(true)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    View guide first anyway
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBaseline}
                    disabled={!baselineDraft.trim()}
                    className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Save baseline &amp; reveal support
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                {supportTab === "bridge" && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-700 text-white flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-violet-700">
                          {activeCase.teacherMajor} · Subject bridge
                        </p>
                        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                          {activeCase.support.specialtyBridge.title}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl">
                          {activeCase.support.specialtyBridge.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 sm:p-5">
                      <p className="text-xs font-semibold text-violet-800 mb-1.5">
                        Try saying this in class
                      </p>
                      <p className="text-sm sm:text-base font-medium text-slate-900 italic leading-relaxed">
                        {activeCase.support.specialtyBridge.trySaying}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-700 mb-1">
                        Where the analogy stops (for scientific accuracy)
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {activeCase.support.specialtyBridge.limitationNote}
                      </p>
                    </div>
                  </div>
                )}

                {supportTab === "misconceptions" && (
                  <div className="space-y-4">
                    {activeCase.support.misconceptionAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 p-5 space-y-2.5 bg-white"
                      >
                        <p className="text-xs font-semibold text-amber-800">
                          Likely learner question {idx + 1}
                        </p>
                        <h3 className="font-display text-base font-bold text-slate-900">
                          {alert.question}
                        </h3>
                        <p className="text-xs text-slate-600">
                          <strong className="text-slate-800">What the learner imagines:</strong>{" "}
                          {alert.whatStudentImagines}
                        </p>
                        <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                          <strong className="text-violet-800">Teaching move:</strong>{" "}
                          {alert.practicalResponse}
                        </p>
                      </div>
                    ))}
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
                          Low-cost classroom demonstration
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
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Ready to test this explanation against a tough learner follow-up before class?
              </p>
              <button
                type="button"
                onClick={onGoToRehearsal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600"
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
