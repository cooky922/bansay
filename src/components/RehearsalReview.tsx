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
  ShieldAlert,
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
  MediaTier,
  PeerLibraryItem,
  SubjectName,
} from "../types/bansay";
import { UI_COPY } from "../data/bansayData";
import type { LocalMentorRecording } from "../App";
import { CustomSelect } from "./CustomSelect";
import { Checkbox, FieldError, Tabs } from "./ui";

interface RehearsalReviewProps {
  language: BansayLanguage;
  activeCase?: LessonCase;
  onRehearseTurn: (payload: {
    caseId: string;
    teacherMessage: string;
    attachmentType: "text" | "voice-note" | "video-note" | "handwritten-photo";
  }) => Promise<{ ended?: boolean; demo?: boolean }>;
  onSubmitReview: (caseId: string) => Promise<void>;
  onSubmitFreshCase: (
    caseId: string,
    teacherRevision: string,
    freshCaseResponse: string
  ) => Promise<void>;
  onRegisterMedia: (
    caseId: string,
    payload: {
      tier: MediaTier;
      step: 2 | 4 | 7;
      consentConfirmed: boolean;
      noStudentFacesConfirmed: boolean;
      label: string;
    }
  ) => Promise<void>;
  onPurgeMedia: (caseId: string, mediaId: string) => Promise<void>;
  onPatchOfflineFallback: (caseId: string) => Promise<void>;
  peerLibrary: PeerLibraryItem[];
  onSaveLibraryItem: (id: string) => Promise<void>;
  mentorRecording?: LocalMentorRecording;
  onStoreMentorVideo: (caseId: string, recording: LocalMentorRecording) => void;
  onClearMentorVideo: (caseId: string) => void;
  isLessonReady: boolean;
  onPlanLesson: () => void;
}

export function RehearsalReview({
  language,
  activeCase,
  onRehearseTurn,
  onSubmitReview,
  onSubmitFreshCase,
  onRegisterMedia,
  onPurgeMedia,
  onPatchOfflineFallback,
  peerLibrary,
  onSaveLibraryItem,
  mentorRecording,
  onStoreMentorVideo,
  onClearMentorVideo,
  isLessonReady,
  onPlanLesson,
}: RehearsalReviewProps) {
  const copy = UI_COPY[language];
  const [scenarioTab, setScenarioTab] = useState<1 | 2>(1);
  const [teacherInput, setTeacherInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingKind, setRecordingKind] = useState<"voice" | "video">("video");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [rehearsalError, setRehearsalError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState(false);

  // Scenario 2 state
  const [revisionDraft, setRevisionDraft] = useState(activeCase?.teacherRevision || "");
  const [freshCaseDraft, setFreshCaseDraft] = useState(activeCase?.freshCaseResponse || "");
  const [isSavingFresh, setIsSavingFresh] = useState(false);

  // Media consent modals (Tier 2 COT Video & Tier 3 Opt-In Voice Note)
  const [consentModalTier, setConsentModalTier] = useState<"voice-note" | "cot-video" | null>(
    null
  );
  const [consentChecked, setConsentChecked] = useState(false);
  const [noStudentFacesChecked, setNoStudentFacesChecked] = useState(false);
  const [mediaLabel, setMediaLabel] = useState("");
  const [consentError, setConsentError] = useState<string | null>(null);

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

  useEffect(() => {
    setRevisionDraft(activeCase?.teacherRevision || "");
    setFreshCaseDraft(activeCase?.freshCaseResponse || "");
  }, [activeCase?.id, activeCase?.teacherRevision, activeCase?.freshCaseResponse]);

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
    if (activeCase) onClearMentorVideo(activeCase.id);
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
  }, [activeCase?.rehearsalMessages.length, isSending]);

  if (!isLessonReady || !activeCase) {
    return (
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Plan a lesson first
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Build your 10-Minute Concept Pack in Lesson Prep Studio before starting rehearsal.
        </p>
        <button
          type="button"
          onClick={onPlanLesson}
          className="mt-6 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"
        >
          Go to Lesson Prep
        </button>
      </section>
    );
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop?.();
    clearRecordingTimer();
    setIsRecording(false);
  };

  const startRecording = async () => {
    setRehearsalError(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRehearsalError(
        "Voice/video recording is not supported in this browser. Type your explanation instead."
      );
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
      const preferredMimeType =
        recordingKind === "video" && MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
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
        const clip = new Blob(videoChunksRef.current, {
          type:
            recorder.mimeType ||
            (recordingKind === "video" ? "video/webm" : "audio/webm"),
        });
        if (clip.size > 0) {
          const nextUrl = URL.createObjectURL(clip);
          setVoiceUrl(nextUrl);
          onStoreMentorVideo(activeCase.id, { url: nextUrl, kind: recordingKind });
        }
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === "fil" ? "fil-PH" : "en-PH";
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let index = 0; index < event.results.length; index += 1) {
            transcript += event.results[index][0].transcript;
          }
          transcriptRef.current = transcript.trim();
          setVoiceTranscript(transcript.trim());
          setTeacherInput(transcript.trim());
        };
        recognition.start();
        recognitionRef.current = recognition;
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
      setRehearsalError(
        "Camera or microphone access was not granted. Check browser permission or type your explanation."
      );
    }
  };

  const handleSendToStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacherInput.trim() || isSending) return;
    if (isRecording) stopRecording();

    setRehearsalError(null);
    const messageText = teacherInput.trim();
    const attachmentType = recordedVideoUrl
      ? recordedKind === "video"
        ? "video-note"
        : "voice-note"
      : "text";

    setTeacherInput("");
    setIsSending(true);
    try {
      const result = await onRehearseTurn({
        caseId: activeCase.id,
        teacherMessage: messageText,
        attachmentType,
      });
      setDemoNotice(Boolean(result.demo));
      if (result.ended) {
        setSubmissionNotice(
          "This rehearsal reached its 5-follow-up limit. Submit your transcript to your mentor or revise your response."
        );
      }
    } catch (err) {
      setTeacherInput(messageText);
      setRehearsalError(
        err instanceof Error
          ? err.message
          : "Unable to reach simulated learner right now."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitForMentorReview = async () => {
    setIsSubmittingReview(true);
    setRehearsalError(null);
    try {
      await onSubmitReview(activeCase.id);
      setSubmissionNotice(
        activeCase.leadTimeTier === "standard-sla"
          ? `Sent privately to ${activeCase.mentorReview.mentorName} for feedback before class.`
          : `Sent privately to ${activeCase.mentorReview.mentorName}. Because class is under 3 days away, feedback may arrive after class.`
      );
    } catch (err) {
      setRehearsalError(
        err instanceof Error ? err.message : "Unable to submit rehearsal for review."
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitFreshCase = async (e: FormEvent) => {
    e.preventDefault();
    if (!freshCaseDraft.trim()) return;
    setIsSavingFresh(true);
    setRehearsalError(null);
    try {
      await onSubmitFreshCase(
        activeCase.id,
        revisionDraft.trim(),
        freshCaseDraft.trim()
      );
      setSubmissionNotice(
        "Your revised explanation and new-example response have been saved."
      );
    } catch (err) {
      setRehearsalError(
        err instanceof Error ? err.message : "Unable to submit fresh-case response."
      );
    } finally {
      setIsSavingFresh(false);
    }
  };

  const openMediaConsentModal = (tier: "voice-note" | "cot-video") => {
    setConsentModalTier(tier);
    setConsentChecked(false);
    setNoStudentFacesChecked(tier === "voice-note");
    setMediaLabel(
      tier === "cot-video"
        ? `Classroom clip (${activeCase.subject})`
        : `Voice explanation (${activeCase.subject})`
    );
    setConsentError(null);
  };

  const handleConfirmMediaConsent = async (e: FormEvent) => {
    e.preventDefault();
    if (!consentModalTier) return;
    if (!consentChecked) {
      setConsentError("Please confirm upload and auto-deletion consent.");
      return;
    }
    if (consentModalTier === "cot-video" && !noStudentFacesChecked) {
      setConsentError(
        "Confirm that the video shows only you and your materials, with no student faces."
      );
      return;
    }
    try {
      await onRegisterMedia(activeCase.id, {
        tier: consentModalTier,
        step: 4,
        consentConfirmed: true,
        noStudentFacesConfirmed:
          consentModalTier === "cot-video" ? noStudentFacesChecked : false,
        label: mediaLabel.trim() || consentModalTier,
      });
      setConsentModalTier(null);
      setSubmissionNotice(
        consentModalTier === "cot-video"
          ? "Classroom clip consent saved (auto-deleted after 7 days; excluded from portfolio exports)."
          : "Voice note consent saved (auto-deleted after 14 days; excluded from portfolio exports)."
      );
    } catch (err) {
      setConsentError(
        err instanceof Error ? err.message : "Unable to save media consent."
      );
    }
  };

  const handleDownloadOfflinePrompt = async () => {
    const promptTxt = [
      `BANSAY OFFLINE REHEARSAL PROMPT`,
      `Topic: ${activeCase.topic} (${activeCase.subject} · ${activeCase.gradeLevel})`,
      `Class Date: ${activeCase.classDate}`,
      `Assigned Mentor: ${activeCase.mentorReview.mentorName}`,
      ``,
      `Simulated Learner (${activeCase.support.simulatedStudentPrompt.studentName}) asks:`,
      activeCase.support.simulatedStudentPrompt.openingQuestion,
      ``,
      `Write your 3-5 sentence classroom explanation or record a short voice note, then submit once connected.`,
    ].join("\n");

    const blob = new Blob([promptTxt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bansay-rehearsal-prompt-${activeCase.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    await onPatchOfflineFallback(activeCase.id);
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

  const formattedClassDate = new Date(
    activeCase.classDate + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const hasCompletedOpeningExchange = activeCase.rehearsalMessages.length >= 3;
  const freshCaseUnlocked = activeCase.freshCaseStatus !== "locked";
  const activeMediaAssets = activeCase.mediaAssets.filter((m) => m.status !== "purged");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-violet-700 mb-1">
            Classroom Practice &amp; Mentor Feedback
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            {copy.rehearsalTitle}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0"
        >
          <BookMarked className="w-4 h-4 text-violet-700" />
          <span>{copy.openPeerLibraryBtn}</span>
        </button>
      </div>

      {submissionNotice && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-violet-950 leading-relaxed">{submissionNotice}</p>
          <button
            type="button"
            onClick={() => setSubmissionNotice(null)}
            className="p-1 text-violet-700 hover:text-violet-950"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {demoNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Demo mode · Local simulated learner response active until an OpenRouter API key is configured.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Rehearsal & Fresh Case (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="w-full sm:w-auto sm:min-w-[24rem]">
              <Tabs
                value={scenarioTab}
                onChange={setScenarioTab}
                label="Rehearsal scenarios"
                items={[
                  { value: 1, label: "1 · Practice with a student" },
                  {
                    value: 2,
                    label: freshCaseUnlocked
                      ? "2 · Try a new example"
                      : "2 · Unlocks after mentor note",
                    disabled: !freshCaseUnlocked,
                  },
                ]}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleDownloadOfflinePrompt()}
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

              <div
                ref={conversationRef}
                className="space-y-3 max-h-[380px] overflow-y-auto pr-1"
              >
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
                          {msg.attachmentType === "video-note" &&
                            " · Local webcam self-review"}
                          {msg.attachmentType === "voice-note" && " · Voice transcript"}
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

              {/* Teacher Response + 4-Tier Media Capture Controls */}
              <form onSubmit={handleSendToStudent} className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="rehearsal-input"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Your response (
                    {language === "en"
                      ? "English"
                      : language === "fil"
                      ? "Filipino"
                      : "Cebuano"}
                    )
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
                      role="group"
                      aria-label="Recording format"
                    >
                      <button
                        type="button"
                        onClick={() => setRecordingKind("voice")}
                        disabled={isRecording}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                          recordingKind === "voice"
                            ? "bg-white text-violet-900 shadow-sm"
                            : "text-slate-600"
                        }`}
                      >
                        Voice note
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordingKind("video")}
                        disabled={isRecording}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                          recordingKind === "video"
                            ? "bg-white text-violet-900 shadow-sm"
                            : "text-slate-600"
                        }`}
                      >
                        Camera practice (device only)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                        isRecording
                          ? "bg-rose-50 border-rose-300 text-rose-800"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : recordingKind === "video" ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isRecording
                          ? `Stop · ${recordingSeconds}s`
                          : recordingKind === "video"
                          ? "Self-review webcam"
                          : "Record voice"}
                      </span>
                    </button>
                  </div>
                </div>

                {(isRecording || recordedVideoUrl) && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-violet-950">
                        {isRecording
                          ? `Recording ${recordedKind === "video" ? "camera clip" : "voice note"}…`
                          : recordedKind === "video"
                          ? "Camera clip ready (stays only on this device)"
                          : "Voice note ready for self-review"}
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
                    {recordedVideoUrl &&
                      (recordedKind === "video" ? (
                        <video
                          controls
                          playsInline
                          src={recordedVideoUrl}
                          className="aspect-video w-full rounded-lg bg-slate-950"
                        />
                      ) : (
                        <audio controls src={recordedVideoUrl} className="h-9 w-full" />
                      ))}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {recordedKind === "video"
                        ? "Camera clips stay on this device only and are cleared when you close the tab."
                        : "Use the optional voice note button below if you want to share audio with your mentor."}
                    </p>
                    {voiceTranscript && (
                      <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-700">
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
                  placeholder="Type or dictate the explanation you would give in class..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSending || !teacherInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-violet-300 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 text-violet-900 text-xs font-semibold whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to simulated student</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSubmitForMentorReview()}
                      disabled={!hasCompletedOpeningExchange || isSubmittingReview}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>
                        {isSubmittingReview
                          ? "Submitting…"
                          : hasCompletedOpeningExchange
                          ? copy.submitMentorBtn
                          : "Complete 1+ exchange first"}
                      </span>
                    </button>
                  </div>
                </div>
              </form>

              {/* 4-Tier Opt-In Media & Retention Controls */}
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Optional audio or video for your mentor
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Only shared if you agree below, auto-deleted on schedule, and never included in portfolio exports.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openMediaConsentModal("voice-note")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap"
                    >
                      <Mic className="w-3.5 h-3.5 text-violet-700" />
                      <span>Voice note (14 days)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openMediaConsentModal("cot-video")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50/70 hover:bg-violet-100 text-xs font-semibold text-violet-900 whitespace-nowrap"
                    >
                      <Video className="w-3.5 h-3.5 text-violet-700" />
                      <span>Classroom clip (7 days)</span>
                    </button>
                  </div>
                </div>

                {activeMediaAssets.length > 0 && (
                  <div className="space-y-2">
                    {activeMediaAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {asset.label}
                          </p>
                          <p className="text-[11px] text-slate-600 tabular-nums">
                            Deleted after {asset.retentionDays} days (
                            {asset.expiresAt?.slice(0, 10) || "session"}) ·{" "}
                            {asset.portfolioIncluded
                              ? "Kept private"
                              : "Excluded from portfolio exports"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void onPurgeMedia(activeCase.id, asset.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Purge now</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Scenario 2: Revision & Independent Fresh Case (Step 6) */
            <form onSubmit={handleSubmitFreshCase} className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-violet-700 mb-1">
                  Apply Feedback &amp; Try a New Example
                </p>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Revise your lesson segment, then respond to a fresh case alone
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Applying your mentor&apos;s teaching move to a new scenario confirms conceptual transfer before class.
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
                  1. Your revised explanation for class
                </label>
                <textarea
                  id="revision-input"
                  rows={2}
                  value={revisionDraft}
                  onChange={(e) => setRevisionDraft(e.target.value)}
                  placeholder="Write the updated step or wording you plan to use..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
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
                  placeholder="Write how you would answer this new learner question accurately..."
                  className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
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
                  disabled={!freshCaseDraft.trim() || isSavingFresh}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSavingFresh ? "Submitting…" : "Submit revision & fresh case"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Rail: Review SLA, Mentor & Coaching Note (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl bg-[#31175B] text-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-purple-200/80 font-medium">Class date &amp; review timeline</p>
                <p className="font-display text-2xl font-bold mt-0.5 tabular-nums">
                  {formattedClassDate}
                </p>
              </div>
              <CalendarClock className="w-5 h-5 text-purple-200 shrink-0" />
            </div>

            <p className="text-xs text-purple-100/85 leading-relaxed">
              {activeCase.leadTimeTier === "standard-sla"
                ? "Class is 3+ school days away, so mentor feedback is aimed before class."
                : "Class is under 3 school days away; mentor feedback may arrive after class."}
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
                <span className="text-purple-200/80">Pack status</span>
                <span className="text-purple-100 capitalize">
                  {activeCase.packStatus.replace("-", " ")}
                </span>
              </div>
            </div>
          </div>

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
              <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-violet-700 mt-0.5 shrink-0" />
                  <p>
                    Sent privately to{" "}
                    <strong className="text-slate-900">
                      {activeCase.mentorReview.mentorName}
                    </strong>{" "}
                    for feedback. Your coaching note will appear here once reviewed.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Consent Modal (Tier 2 COT Video Exception / Tier 3 Opt-in Voice Note) */}
      {consentModalTier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-consent-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-violet-700">
                  {consentModalTier === "cot-video"
                    ? "Optional Classroom Clip"
                    : "Optional Voice Note"}
                </p>
                <h2
                  id="media-consent-title"
                  className="font-display text-lg font-bold text-slate-900 mt-0.5"
                >
                  Permission &amp; auto-deletion
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConsentModalTier(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close consent dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmMediaConsent} className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  {consentModalTier === "cot-video"
                    ? "Classroom clips are deleted automatically after 7 days and are never included in portfolio exports."
                    : "Voice notes are deleted automatically after 14 days, seen only by your mentor, and never included in portfolio exports."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clip description
                </label>
                <input
                  type="text"
                  value={mediaLabel}
                  onChange={(e) => setMediaLabel(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              {consentModalTier === "cot-video" && (
                <label className="flex items-start gap-2 text-xs text-slate-800">
                  <Checkbox
                    checked={noStudentFacesChecked}
                    onChange={(e) => setNoStudentFacesChecked(e.target.checked)}
                  />
                  <span>
                    I confirm this video shows only the teacher and board/materials (zero student faces or minor learners in frame).
                  </span>
                </label>
              )}

              <label className="flex items-start gap-2 text-xs text-slate-800">
                <Checkbox
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                />
                <span>
                  I consent to temporary encrypted retention (
                  {consentModalTier === "cot-video" ? "7 days" : "14 days"}) for private mentor review only.
                </span>
              </label>

              {consentError && <FieldError>{consentError}</FieldError>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConsentModalTier(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold"
                >
                  Confirm consent &amp; log metadata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared LAC Peer Library Drawer Modal */}
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
                  Mentor-Verified Concept Packs
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
                  All Shared LAC packs are anonymized and mentor-verified before publishing.
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
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900"
                  />
                </div>
                <CustomSelect
                  value={librarySubject}
                  onChange={setLibrarySubject}
                  options={[
                    { value: "All", label: "All subjects" },
                    { value: "Science", label: "Science" },
                    { value: "Mathematics", label: "Mathematics" },
                    { value: "English", label: "English" },
                  ]}
                  ariaLabel="Filter by subject"
                  className="w-full sm:w-40 text-xs"
                />
              </div>

              <div className="space-y-3">
                {filteredLibrary.map((item) => {
                  const expanded = expandedLibId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-violet-700">
                              {item.subjectTag}
                            </span>
                            <span>·</span>
                            <span>Mentor verified</span>
                            <span>·</span>
                            <span className="tabular-nums">{item.saveCount} saves</span>
                          </div>
                          <h3 className="font-display text-sm font-bold text-slate-900 mt-1">
                            {item.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedLibId(expanded ? null : item.id)}
                          className="text-xs font-semibold text-violet-700 hover:underline whitespace-nowrap"
                        >
                          {expanded ? "Hide" : "Inspect"}
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.summary}
                      </p>

                      {expanded && (
                        <div className="pt-2.5 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                          <p>
                            <strong className="text-slate-900">Big Idea:</strong>{" "}
                            {item.bigIdeaSummary}
                          </p>
                          <p>
                            <strong className="text-slate-900">
                              Verified explanation:
                            </strong>{" "}
                            {item.verifiedExplanation}
                          </p>
                          <p>
                            <strong className="text-slate-900">Improvised setup:</strong>{" "}
                            {item.improvisedSetup}
                          </p>
                          <button
                            type="button"
                            onClick={() => void onSaveLibraryItem(item.id)}
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
