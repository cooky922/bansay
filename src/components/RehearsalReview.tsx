import { useEffect, useRef, useState, type FormEvent } from "react";
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
  Square,
  Trash2,
  UserCheck,
  Video,
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
import type { LocalMentorRecording } from "../App";
import { CustomSelect } from "./CustomSelect";
import { Tabs } from "./ui";

interface RehearsalReviewProps {
  language: BansayLanguage;
  activeCase: LessonCase;
  onUpdateCase: (updated: LessonCase) => void;
  peerLibrary: PeerLibraryItem[];
  onSaveLibraryItem: (id: string) => void;
  onSwitchToMentorQueue: () => void;
  mentorRecording?: LocalMentorRecording;
  onStoreMentorVideo: (caseId: string, recording: LocalMentorRecording) => void;
  onClearMentorVideo: (caseId: string) => void;
  isLessonReady: boolean;
  onPlanLesson: () => void;
}

function mentorForSubject(subject: SubjectName) {
  if (subject === "Mathematics") return { name: "Lourdes Tan", affiliation: "MSU-IIT Mathematics Education" };
  if (subject === "English") return { name: "Grace Bautista", affiliation: "MSU-IIT English Education" };
  return { name: "Ramon Villamor", affiliation: "MSU-IIT Science Education" };
}

export function RehearsalReview({
  language,
  activeCase,
  onUpdateCase,
  peerLibrary,
  onSaveLibraryItem,
  onSwitchToMentorQueue,
  mentorRecording,
  onStoreMentorVideo,
  onClearMentorVideo,
  isLessonReady,
  onPlanLesson,
}: RehearsalReviewProps) {
  const copy = UI_COPY[language];
  const [scenarioTab, setScenarioTab] = useState<1 | 2>(
    activeCase.mentorReview.status === "returned" ? 1 : 1
  );
  const [teacherInput, setTeacherInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingKind, setRecordingKind] = useState<"voice" | "video">("video");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [rehearsalError, setRehearsalError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState(false);

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const recordedVideoUrl = voiceUrl || mentorRecording?.url;
  const recordedKind = voiceUrl ? recordingKind : mentorRecording?.kind;

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const clearVoiceNote = () => {
    setVoiceUrl(null);
    setVoiceTranscript("");
    transcriptRef.current = "";
    onClearMentorVideo(activeCase.id);
  };

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) {
      conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
    }
  }, [activeCase.rehearsalMessages.length, isSending]);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop?.();
    clearRecordingTimer();
    setIsRecording(false);
  };

  const startRecording = async () => {
    setRehearsalError(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRehearsalError("Voice recording is not supported in this browser. Please type your explanation instead.");
      return;
    }

    try {
      clearVoiceNote();
      const stream = await navigator.mediaDevices.getUserMedia(
        recordingKind === "video"
          ? { audio: true, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } }
          : { audio: true }
      );
      mediaStreamRef.current = stream;
      const preferredMimeType = recordingKind === "video" && MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : recordingKind === "video"
        ? "video/webm"
        : "audio/webm;codecs=opus";
      const recorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
      videoChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const clip = new Blob(videoChunksRef.current, { type: recorder.mimeType || (recordingKind === "video" ? "video/webm" : "audio/webm") });
        if (clip.size > 0) {
          const nextUrl = URL.createObjectURL(clip);
          setVoiceUrl(nextUrl);
          onStoreMentorVideo(activeCase.id, { url: nextUrl, kind: recordingKind });
        }
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === "fil" ? "fil-PH" : language === "ceb" ? "en-PH" : "en-PH";
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let index = 0; index < event.results.length; index += 1) {
            transcript += event.results[index][0].transcript;
          }
          transcriptRef.current = transcript.trim();
          setVoiceTranscript(transcript.trim());
          setTeacherInput(transcript.trim());
        };
        recognition.onerror = (event: any) => {
          if (event.error !== "no-speech" && event.error !== "aborted") {
            setRehearsalError("Your voice note was recorded, but browser transcription was unavailable. You can type the explanation before sending.");
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setRehearsalError("Your voice note will be recorded locally. Type a short transcript before sending because this browser does not provide speech-to-text.");
      }

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000
      );
    } catch {
      setRehearsalError("Camera and microphone access were not granted. Check your browser permission and try again.");
    }
  };

  const handleSendToStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacherInput.trim() || isSending) return;

    if (isRecording) stopRecording();
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
      attachmentType: recordedVideoUrl ? (recordedKind === "video" ? "video-note" : "voice-note") : "text",
    };

    const nextMessages = [...activeCase.rehearsalMessages, userMsg];
    onUpdateCase({
      ...activeCase,
      rehearsalMessages: nextMessages,
    });
    setTeacherInput("");
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

      setDemoNotice(Boolean(data.demo));

      if (data.ended) {
        setSubmissionNotice(
          "This practice exchange has reached its question limit. Review your explanation or send it for mentor feedback."
        );
        return;
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
    const mentor = mentorForSubject(activeCase.subject);
    onUpdateCase({
      ...activeCase,
      mentorReview: {
        ...activeCase.mentorReview,
        mentorName: mentor.name,
        mentorAffiliation: mentor.affiliation,
        status: "pending",
        reviewedAt: "Submitted · Target within 2 school days",
      },
    });
    setSubmissionNotice(
      `Your rehearsal has been routed privately to ${mentor.name} for Concept Pack and transcript review.`
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

  const hasCompletedOpeningExchange = activeCase.rehearsalMessages.length >= 3;
  const rehearsalStatus = activeCase.mentorReview.status === "pending" && activeCase.mentorReview.reviewedAt.startsWith("Submitted")
    ? "Waiting for mentor"
    : activeCase.mentorReview.status === "returned"
      ? "Mentor correction ready"
      : "Private practice";
  const freshCaseUnlocked = activeCase.freshCaseStatus !== "locked";

  if (!isLessonReady) {
    return (
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">Plan a lesson first</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Choose a subject, grade level, topic, and class date in Lesson Prep, then build the AI Draft before starting rehearsal.</p>
        <button type="button" onClick={onPlanLesson} className="mt-6 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800">Go to Lesson Prep</button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            {copy.rehearsalTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900">{rehearsalStatus}</span>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-violet-600"
        >
          <BookMarked className="w-4 h-4 text-violet-700" />
          <span>{copy.openPeerLibraryBtn}</span>
        </button>
        </div>
      </div>

      {submissionNotice && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-violet-950 leading-relaxed">{submissionNotice}</p>
          <div className="flex items-center gap-2 shrink-0">
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

      {demoNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Demo mode · This simulated learner reply is a local sample response. Add an OpenRouter key to use live AI rehearsal.
        </div>
      )}

      {/* Two-Column Rehearsal Layout (Figure 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Simulated Learner & Fresh Case (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Scenario Step Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="w-full sm:w-auto sm:min-w-[25rem]"><Tabs value={scenarioTab} onChange={setScenarioTab} label="Rehearsal scenarios" items={[{ value: 1, label: "1 · Learner rehearsal" }, { value: 2, label: freshCaseUnlocked ? "2 · Fresh case" : "2 · Awaiting feedback", disabled: !freshCaseUnlocked }]} /></div>

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
              <div ref={conversationRef} className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
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
                          {msg.attachmentType === "video-note" && " · Video response transcript"}
                          {msg.attachmentType === "voice-note" && " · Voice response transcript"}
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
                  <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Recording format">
                    <button type="button" onClick={() => setRecordingKind("voice")} disabled={isRecording} className={`rounded-md px-2 py-1 text-[11px] font-medium ${recordingKind === "voice" ? "bg-white text-violet-900 shadow-sm" : "text-slate-600"}`}>Voice only</button>
                    <button type="button" onClick={() => setRecordingKind("video")} disabled={isRecording} className={`rounded-md px-2 py-1 text-[11px] font-medium ${recordingKind === "video" ? "bg-white text-violet-900 shadow-sm" : "text-slate-600"}`}>Video + voice</button>
                  </div>
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                      isRecording
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : recordingKind === "video" ? <Video className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecording ? `Stop recording · ${recordingSeconds}s` : recordingKind === "video" ? "Record video response" : "Record voice response"}</span>
                  </button>
                  </div>
                </div>

                {(isRecording || recordedVideoUrl) && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-violet-950">
                        {isRecording ? `Recording ${recordingKind === "video" ? "video" : "voice"} response…` : `${recordedKind === "video" ? "Video" : "Voice"} response ready for private self-review`}
                      </p>
                      {recordedVideoUrl && !isRecording && (
                        <button
                          type="button"
                          onClick={clearVoiceNote}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear
                        </button>
                      )}
                    </div>
                    {recordedVideoUrl && (recordedKind === "video" ? <video controls playsInline src={recordedVideoUrl} className="aspect-video w-full rounded-lg bg-slate-950" /> : <audio controls src={recordedVideoUrl} className="h-9 w-full" />)}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This {recordedKind === "video" ? "video" : "voice recording"} stays in this browser session for private self-review. Your confirmed text transcript is sent for mentor review.
                    </p>
                    {voiceTranscript && (
                      <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-700 leading-relaxed">
                        {voiceTranscript}
                      </p>
                    )}
                  </div>
                )}

                <textarea
                  id="rehearsal-input"
                  rows={3}
                  value={teacherInput}
                  onChange={(e) => setTeacherInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendToStudent(event as unknown as FormEvent);
                    }
                  }}
                  placeholder={
                    isRecording || recordedVideoUrl
                      ? "Your voice transcript appears here. You can correct it before sending..."
                      : "Type the explanation you would give in class..."
                  }
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
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
                      disabled={!hasCompletedOpeningExchange}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{hasCompletedOpeningExchange ? copy.submitMentorBtn : "Complete the opening exchange"}</span>
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
          <div className="w-full max-w-lg bg-white h-[100dvh] shadow-2xl flex flex-col border-l border-slate-200">
            <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-200 flex items-start justify-between gap-4">
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

            <div className="px-4 py-4 sm:px-6 space-y-4 overflow-y-auto flex-1">
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
                <CustomSelect value={librarySubject} onChange={setLibrarySubject} options={[{ value: "All", label: "All subjects" }, { value: "Science", label: "Science" }, { value: "Mathematics", label: "Mathematics" }, { value: "English", label: "English" }]} ariaLabel="Filter by subject" className="w-full sm:w-40 text-xs" />
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
