import { useState, type FormEvent } from "react";
import {
  BookMarked,
  CalendarClock,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  Search,
  Send,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import type {
  BansayLanguage,
  LessonCase,
  PeerLibraryItem,
  RehearsalMessage,
  SubjectName,
} from "../types/bansay";
import { UI_COPY } from "../data/bansayData";

interface RehearsalReviewProps {
  language: BansayLanguage;
  activeCase: LessonCase;
  onUpdateCase: (updated: LessonCase) => void;
  peerLibrary: PeerLibraryItem[];
  onSaveLibraryItem: (id: string) => void;
  onSwitchToMentorQueue: () => void;
}

export function RehearsalReview({
  language,
  activeCase,
  onUpdateCase,
  peerLibrary,
  onSaveLibraryItem,
  onSwitchToMentorQueue,
}: RehearsalReviewProps) {
  const copy = UI_COPY[language];
  const [scenarioTab, setScenarioTab] = useState<1 | 2>(
    activeCase.mentorReview.status === "returned" ? 1 : 1
  );
  const [teacherInput, setTeacherInput] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [rehearsalError, setRehearsalError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);

  // Scenario 2 state
  const [revisionDraft, setRevisionDraft] = useState(activeCase.teacherRevision);
  const [freshCaseDraft, setFreshCaseDraft] = useState(activeCase.freshCaseResponse);

  // Peer Library modal
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [librarySubject, setLibrarySubject] = useState<"All" | SubjectName>("All");
  const [expandedLibId, setExpandedLibId] = useState<string | null>(
    peerLibrary[0]?.id ?? null
  );

  const handleSendToStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacherInput.trim()) return;

    setRehearsalError(null);
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: RehearsalMessage = {
      id: `msg-t-${Date.now()}`,
      sender: "teacher",
      text: teacherInput.trim(),
      timestamp: nowTime,
      attachmentType: voiceMode ? "voice-note" : "text",
    };

    const nextMessages = [...activeCase.rehearsalMessages, userMsg];
    onUpdateCase({
      ...activeCase,
      rehearsalMessages: nextMessages,
    });
    setTeacherInput("");
    setVoiceMode(false);
    setIsSending(true);

    try {
      const response = await fetch("/api/bansay/rehearse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeCase.subject,
          gradeLevel: activeCase.gradeLevel,
          topic: activeCase.topic,
          language,
          studentName: activeCase.support.simulatedStudentPrompt.studentName,
          history: activeCase.rehearsalMessages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          teacherMessage: userMsg.text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Simulated learner could not respond.");
      }

      const studentReply: RehearsalMessage = {
        id: `msg-s-${Date.now()}`,
        sender: "student",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      onUpdateCase({
        ...activeCase,
        rehearsalMessages: [...nextMessages, studentReply],
      });
    } catch (err) {
      setRehearsalError(
        err instanceof Error
          ? err.message
          : "Unable to reach simulated learner right now."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitForMentorReview = () => {
    onUpdateCase({
      ...activeCase,
      mentorReview: {
        ...activeCase.mentorReview,
        status: "pending",
        reviewedAt: "Submitted · Target within 2 school days",
      },
    });
    setSubmissionNotice(
      `Submitted privately to ${activeCase.mentorReview.mentorName}. You can switch "Viewing as" to Subject Mentor at the top right to review and return feedback immediately.`
    );
  };

  const handleSubmitFreshCase = (e: FormEvent) => {
    e.preventDefault();
    if (!freshCaseDraft.trim()) return;
    onUpdateCase({
      ...activeCase,
      teacherRevision: revisionDraft.trim(),
      freshCaseResponse: freshCaseDraft.trim(),
      freshCaseStatus: "submitted",
    });
    setSubmissionNotice(
      "Revision and independent fresh-case response recorded for mentor second check."
    );
  };

  const handleDownloadOfflinePrompt = () => {
    const promptTxt = [
      `BANSAY OFFLINE REHEARSAL PROMPT`,
      `Topic: ${activeCase.topic} (${activeCase.subject} · ${activeCase.gradeLevel})`,
      `Class Date: ${activeCase.classDate}`,
      `Assigned Mentor: ${activeCase.mentorReview.mentorName}`,
      ``,
      `Simulated Learner (${activeCase.support.simulatedStudentPrompt.studentName}) asks:`,
      activeCase.support.simulatedStudentPrompt.openingQuestion,
      ``,
      `Write your 3-5 sentence classroom explanation below or record a short voice note,`,
      `then submit once connectivity returns.`,
    ].join("\n");

    const blob = new Blob([promptTxt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bansay-rehearsal-prompt-${activeCase.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    onUpdateCase({
      ...activeCase,
      submissionFormat: "offline-fallback",
    });
  };

  const filteredLibrary = peerLibrary.filter((item) => {
    const matchesSubject =
      librarySubject === "All" || item.subject === librarySubject;
    const matchesQuery =
      !librarySearch.trim() ||
      item.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      item.summary.toLowerCase().includes(librarySearch.toLowerCase());
    return matchesSubject && matchesQuery;
  });

  const formattedClassDate = new Date(activeCase.classDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "short", day: "numeric", month: "short" }
  );

  const hasTeacherTurn = activeCase.rehearsalMessages.some((m) => m.sender === "teacher");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-violet-700 mb-1">
            {copy.rehearsalKicker}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            {copy.rehearsalTitle}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{copy.rehearsalSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600"
        >
          <BookMarked className="w-4 h-4 text-violet-700" />
          <span>{copy.openPeerLibraryBtn}</span>
        </button>
      </div>

      {submissionNotice && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-violet-950 leading-relaxed">{submissionNotice}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSwitchToMentorQueue}
              className="px-3 py-1.5 rounded-lg bg-violet-700 text-white text-xs font-semibold hover:bg-violet-800 whitespace-nowrap"
            >
              View in Mentor Queue
            </button>
            <button
              type="button"
              onClick={() => setSubmissionNotice(null)}
              className="p-1 text-violet-700 hover:text-violet-950"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Two-Column Rehearsal Layout (Figure 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Simulated Learner & Fresh Case (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Scenario Step Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setScenarioTab(1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  scenarioTab === 1
                    ? "bg-white text-violet-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Scenario 1 of 2 · Learner rehearsal
              </button>
              <button
                type="button"
                onClick={() => setScenarioTab(2)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  scenarioTab === 2
                    ? "bg-white text-violet-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Scenario 2 of 2 · Fresh case
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadOfflinePrompt}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-800 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download offline prompt</span>
            </button>
          </div>

          {scenarioTab === 1 ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">
                  {activeCase.subject} · {activeCase.gradeLevel} · {activeCase.topic}
                </p>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Simulated learner exchange
                </h2>
              </div>

              {/* Conversation Thread */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {activeCase.rehearsalMessages.map((msg) => {
                  const isStudent = msg.sender === "student";
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-xl p-4 border ${
                        isStudent
                          ? "bg-slate-50 border-slate-200"
                          : "bg-violet-50/70 border-violet-200 ml-4 sm:ml-8"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                        <span className="font-semibold text-slate-800">
                          {isStudent
                            ? `${activeCase.support.simulatedStudentPrompt.studentName} · Simulated ${activeCase.gradeLevel} learner`
                            : "Your classroom explanation"}
                          {msg.attachmentType === "voice-note" && " · Voice note transcript"}
                        </span>
                        <span className="tabular-nums">{msg.timestamp}</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">{msg.text}</p>
                    </div>
                  );
                })}

                {isSending && (
                  <div className="rounded-xl p-4 border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-700" />
                    <span>
                      {activeCase.support.simulatedStudentPrompt.studentName} is thinking about your explanation...
                    </span>
                  </div>
                )}
              </div>

              {rehearsalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800"
                >
                  {rehearsalError}
                </div>
              )}

              {/* Teacher Response Box */}
              <form onSubmit={handleSendToStudent} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="rehearsal-input"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Your response ({language === "en" ? "English" : language === "fil" ? "Filipino" : "Cebuano"})
                  </label>
                  <button
                    type="button"
                    onClick={() => setVoiceMode(!voiceMode)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                      voiceMode
                        ? "bg-violet-50 border-violet-300 text-violet-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{voiceMode ? "Voice note mode active" : "Record voice note"}</span>
                  </button>
                </div>

                <textarea
                  id="rehearsal-input"
                  rows={3}
                  value={teacherInput}
                  onChange={(e) => setTeacherInput(e.target.value)}
                  placeholder={
                    voiceMode
                      ? "Speak or dictate your short classroom explanation (15–30 seconds)..."
                      : "Type the explanation you would give in class..."
                  }
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Private review · Visible only to your assigned mentor</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSending || !teacherInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-violet-300 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 text-violet-900 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to simulated student</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitForMentorReview}
                      disabled={!hasTeacherTurn && !activeCase.baselineExplanation}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{copy.submitMentorBtn}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* Scenario 2: Revision & Independent Fresh Case (Section 2.3) */
            <form onSubmit={handleSubmitFreshCase} className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-violet-700 mb-1">
                  Independent application · Second comparable case
                </p>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Revise your lesson segment, then respond to a fresh case alone
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Applying your mentor&apos;s teaching move to a new scenario confirms the correction carries over before class.
                </p>
              </div>

              {activeCase.mentorReview.teachingMove && (
                <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
                  <p className="text-xs font-semibold text-violet-900 mb-1">
                    Mentor&apos;s practical teaching move to apply
                  </p>
                  <p className="text-sm text-slate-800">
                    {activeCase.mentorReview.teachingMove}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="revision-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  1. Your revised explanation for tomorrow&apos;s class
                </label>
                <textarea
                  id="revision-input"
                  rows={2}
                  value={revisionDraft}
                  onChange={(e) => setRevisionDraft(e.target.value)}
                  placeholder="Write the updated step or wording you plan to use with your students..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  2. Unfamiliar fresh case
                </p>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">
                  {activeCase.support.simulatedStudentPrompt.freshCasePrompt}
                </p>
              </div>

              <div>
                <label
                  htmlFor="fresh-case-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Your independent response (without model hints)
                </label>
                <textarea
                  id="fresh-case-input"
                  rows={3}
                  value={freshCaseDraft}
                  onChange={(e) => setFreshCaseDraft(e.target.value)}
                  placeholder="Write how you would answer this new student question accurately..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Status:{" "}
                  <strong className="text-slate-800 capitalize">
                    {activeCase.freshCaseStatus}
                  </strong>
                </span>
                <button
                  type="submit"
                  disabled={!freshCaseDraft.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit revision &amp; fresh case</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Rail: Review Target, Mentor & Coaching Note (4 cols, Figure 5) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Review Target Card */}
          <div className="rounded-2xl bg-[#31175B] text-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-purple-200/80 font-medium">Review target</p>
                <p className="font-display text-2xl font-bold mt-0.5 tabular-nums">
                  {formattedClassDate}
                </p>
              </div>
              <CalendarClock className="w-5 h-5 text-purple-200 shrink-0" />
            </div>

            <p className="text-xs text-purple-100/85 leading-relaxed">
              Target mentor reply within two school days and before your scheduled class.
            </p>

            <div className="pt-3 border-t border-white/15 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-200/80">Assigned mentor</span>
                <span className="font-semibold text-white">
                  {activeCase.mentorReview.mentorName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-200/80">Backup reviewer</span>
                <span className="text-purple-100">
                  {activeCase.mentorReview.backupMentorName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-200/80">Languages</span>
                <span className="text-purple-100 uppercase">
                  {activeCase.mentorReview.languagesCovered.join(" · ")}
                </span>
              </div>
            </div>
          </div>

          {/* Latest Coaching Note Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-violet-700">
                Latest coaching note
              </p>
              <span className="text-xs text-slate-500 tabular-nums">
                {activeCase.mentorReview.reviewedAt}
              </span>
            </div>

            {activeCase.mentorReview.status === "returned" ||
            activeCase.mentorReview.status === "completed" ? (
              <div className="space-y-3.5">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    One focused gap
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                    {activeCase.mentorReview.focusedGap}
                  </p>
                </div>

                <div className="rounded-xl bg-violet-50 border border-violet-100 p-3.5">
                  <p className="text-xs font-semibold text-violet-900 mb-1">
                    Practical teaching move
                  </p>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    {activeCase.mentorReview.teachingMove}
                  </p>
                </div>

                {activeCase.mentorReview.quickRefresher && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                    <p className="text-xs font-semibold text-amber-900 mb-1">
                      Quick content refresher
                    </p>
                    <p className="text-xs text-amber-950 leading-relaxed">
                      {activeCase.mentorReview.quickRefresher}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <p>
                    <strong className="text-slate-800">Mastered:</strong>{" "}
                    {activeCase.mentorReview.masteredSkill}
                  </p>
                  <p>
                    <strong className="text-slate-800">Needs practice:</strong>{" "}
                    {activeCase.mentorReview.practiceSkill}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setScenarioTab(2)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  Apply feedback on Scenario 2
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-slate-600">
                  <MessageSquare className="w-4 h-4 text-violet-700 mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    Your rehearsal is awaiting specialist review from{" "}
                    <strong className="text-slate-900">
                      {activeCase.mentorReview.mentorName}
                    </strong>
                    . You can continue using the Specialty Bridge and Improvised Activity immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToMentorQueue}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800"
                >
                  Preview as Subject Mentor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shared LAC / Peer Library Drawer Modal (Figure 6) */}
      {libraryOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="peer-library-title"
        >
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-violet-700">
                  Shared LAC / Peer Library
                </p>
                <h2
                  id="peer-library-title"
                  className="font-display text-xl font-bold text-slate-900 mt-0.5"
                >
                  Verified classroom ideas
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Close peer library"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Your work stays private.</strong>{" "}
                  Library items are mentor-approved and anonymized across participating schools.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="search"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search verified lessons or setups..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                  />
                </div>
                <select
                  value={librarySubject}
                  onChange={(e) =>
                    setLibrarySubject(e.target.value as "All" | SubjectName)
                  }
                  aria-label="Filter by subject"
                  className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                >
                  <option value="All">All subjects</option>
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredLibrary.map((item) => {
                  const expanded = expandedLibId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4 space-y-2.5 hover:border-violet-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-violet-700">
                              {item.subjectTag}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Mentor verified</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{item.saveCount} saves</span>
                          </div>
                          <h3 className="font-display text-sm font-bold text-slate-900 mt-1">
                            {item.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLibId(expanded ? null : item.id)
                          }
                          className="text-xs font-semibold text-violet-700 hover:underline whitespace-nowrap"
                        >
                          {expanded ? "Hide" : "Inspect"}
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.summary}
                      </p>

                      {expanded && (
                        <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                          <div className="text-xs text-slate-700">
                            <strong className="text-slate-900">
                              Verified explanation:
                            </strong>{" "}
                            {item.verifiedExplanation}
                          </div>
                          <div className="text-xs text-slate-700">
                            <strong className="text-slate-900">
                              Improvised setup:
                            </strong>{" "}
                            {item.improvisedSetup}
                          </div>
                          <button
                            type="button"
                            onClick={() => onSaveLibraryItem(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Save to my prep notes</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
