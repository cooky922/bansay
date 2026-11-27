import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookMarked,
  CalendarClock,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
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
import { rehearsalGradeLabel, REHEARSAL_LIMIT, type RehearsalRequest } from "../lib/rehearsal";
import { useLearnerConversation } from "./useLearnerConversation";
import { DemoMentorReview } from "./DemoMentorReview";
import { demoMentors, demoReviewContent, type DemoReviewState } from "../lib/demoMentorReview";
import { CustomSelect } from "./CustomSelect";
import { Checkbox, FieldError } from "./ui";

interface RehearsalReviewProps {
  language: BansayLanguage;
  teacher: { id: string; displayName?: string };
  activeCase?: LessonCase;
  onRehearseTurn: (payload: RehearsalRequest) => Promise<LessonCase>;
  onSubmitReview: (caseId: string, attachmentIds: string[]) => Promise<void>;
  demo?: { review?: DemoReviewState; skip: () => void; reset: () => void; save: () => void; refresher: (step: number) => void };
  sampleReview?: DemoReviewState;
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
      attachment?: { type: string; base64: string };
    }
  ) => Promise<void>;
  onPurgeMedia: (caseId: string, mediaId: string) => Promise<void>;
  onPatchOfflineFallback: (caseId: string) => Promise<void>;
  peerLibrary: PeerLibraryItem[];
  onSaveLibraryItem: (id: string) => Promise<void>;
  isLessonReady: boolean;
  onPlanLesson: () => void;
}

export function RehearsalReview({
  language,
  teacher,
  activeCase,
  onRehearseTurn,
  onSubmitReview,
  demo,
  sampleReview,
  onSubmitFreshCase,
  onRegisterMedia,
  onPurgeMedia,
  onPatchOfflineFallback,
  peerLibrary,
  onSaveLibraryItem,
  isLessonReady,
  onPlanLesson,
}: RehearsalReviewProps) {
  const copy = UI_COPY[language];
  const [scenarioTab, setScenarioTab] = useState<1 | 2>(1);
  const [teacherInput, setTeacherInput] = useState("");
  const queuedResponses = useRef<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingKind, setRecordingKind] = useState<"voice" | "video">("video");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const chat = useLearnerConversation(isLessonReady ? activeCase : undefined, language, teacher, onRehearseTurn, Boolean(demo));
  const studentName = chat.studentName ?? "Learner";
  const initials = chat.studentName === "AK" ? "AK" : studentName[0];
  const [mediaMenu, setMediaMenu] = useState<"attachments" | null>(null);
  const phase2 = import.meta.env.VITE_BANSAY_PHASE_2 === "true";
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [revising, setRevising] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [rehearsalError, setRehearsalError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (chat.sending || chat.needsOpening || !queuedResponses.current.length) return;
    if (chat.closing || chat.shared) {
      const remaining = queuedResponses.current.splice(0);
      setTeacherInput((draft) => [...remaining, draft].filter(Boolean).join("\n"));
      return;
    }
    const next = queuedResponses.current.shift();
    if (next) void chat.send(next).then((sent) => {
      if (!sent) setTeacherInput((draft) => [next, draft].filter(Boolean).join("\n"));
    });
  }, [chat.sending, chat.needsOpening, chat.closing, chat.shared, chat.send]);

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
  const [mediaFile, setMediaFile] = useState<File>();
  const [savingAttachment, setSavingAttachment] = useState(false);
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
  const recordingUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const recordedVideoUrl = voiceUrl;
  const recordedKind = recordingKind;

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
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      clearRecordingTimer();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) {
      conversation.scrollTo({ top: conversation.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }, [scenarioTab, chat.messages.length, chat.typing, chat.closing]);

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
    clearRecordingTimer();
    setIsRecording(false);
  };

  const startRecording = async (kind: "voice" | "video") => {
    if (mediaStreamRef.current) return;
    setRecordingKind(kind);
    setMediaMenu(null);
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
        kind === "video"
          ? { audio: true, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } }
          : { audio: true }
      );
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const preferredMimeType =
        kind === "video" && MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : kind === "video"
          ? "video/webm"
          : "audio/webm;codecs=opus";
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(preferredMimeType) ? { mimeType: preferredMimeType } : undefined);
      videoChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const clip = new Blob(videoChunksRef.current, {
          type:
            recorder.mimeType ||
            (kind === "video" ? "video/webm" : "audio/webm"),
        });
        if (clip.size > 0 && mountedRef.current) {
          const nextUrl = URL.createObjectURL(clip);
          setVoiceUrl(nextUrl);
          recordingUrlRef.current = nextUrl;
        }
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000
      );
    } catch {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setRehearsalError(
        "Camera or microphone access was not granted. Check browser permission or type your explanation."
      );
    }
  };

  const handleSendToStudent = async (event: FormEvent) => {
    event.preventDefault();
    const message = teacherInput.trim();
    if (!message) return;
    if (isRecording) stopRecording();
    setTeacherInput("");
    if (chat.sending || chat.needsOpening) {
      queuedResponses.current.push(message);
      return;
    }
    if (!(await chat.send(message))) setTeacherInput((draft) => draft || message);
  };

  const handleSubmitForMentorReview = async () => {
    if (!chat.turns || isSubmittingReview) return;
    reviewDialog.current?.close();
    setIsSubmittingReview(true);
    setRehearsalError(null);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
      await onSubmitReview(activeCase.id, attachmentsToShare.map(({ id }) => id));
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
    setMediaMenu(null);
    setConsentModalTier(tier);
    setMediaFile(undefined);
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
    if (!mediaFile || !mediaFile.size || mediaFile.size > 5 * 1024 * 1024) {
      setConsentError("Choose an audio or video file up to 5 MB.");
      return;
    }
    setSavingAttachment(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(mediaFile);
      });
      await onRegisterMedia(activeCase.id, {
        tier: consentModalTier,
        step: 4,
        consentConfirmed: true,
        noStudentFacesConfirmed:
          consentModalTier === "cot-video" ? noStudentFacesChecked : false,
        label: mediaLabel.trim() || consentModalTier,
        attachment: { type: mediaFile.type, base64 },
      });
      setConsentModalTier(null);
      setSubmissionNotice(
        consentModalTier === "cot-video"
          ? "Classroom clip attached for mentor submission."
          : "Voice note attached for mentor submission."
      );
    } catch (err) {
      setConsentError(
        err instanceof Error ? err.message : "Unable to save your attachment."
      );
    } finally {
      setSavingAttachment(false);
    }
  };

  const handleDownloadOfflinePrompt = async () => {
    const promptTxt = [
      `BANSAY OFFLINE REHEARSAL PROMPT`,
      `Topic: ${activeCase.topic} (${activeCase.subject} · ${gradeLabel})`,
      `Class Date: ${activeCase.classDate}`,

      ``,
      `Simulated Learner (${studentName}) asks:`,
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

  const gradeLabel = rehearsalGradeLabel(activeCase.gradeLevel);
  const feedback = sampleReview ?? demo?.review;
  const freshCaseUnlocked = Boolean(feedback?.reviewedAt) || activeCase.freshCaseStatus !== "locked";
  const hasSampleFeedback = Boolean(feedback);
  const submitted = chat.shared && (hasSampleFeedback || Boolean(activeCase.mentorReview.submittedForReview));
  const assigned = submitted && (hasSampleFeedback || activeCase.mentorReview.assignment === "assigned");
  const ready = feedback ? Boolean(feedback.reviewedAt) : submitted && activeCase.mentorReview.status !== "pending";
  const reviewTime = hasSampleFeedback ? "Temporary sample feedback will be ready shortly." : activeCase.leadTimeTier === "standard-sla"
    ? "Target within 2 school days after assignment." : "Best effort. Feedback may arrive after class.";
  const progress = revising ? 3 : ready || assigned ? 2 : submitted || isSubmittingReview ? 1 : 0;
  const activeMediaAssets = activeCase.mediaAssets.filter((m) => m.status !== "purged" && (phase2 || m.tier !== "cot-video"));
  const attachmentsToShare = activeMediaAssets.filter((asset) => asset.hasContent && asset.consentConfirmed && !asset.sharedForReview);
  if (reviewOpen && feedback?.reviewedAt) {
    return <DemoMentorReview lesson={activeCase} review={feedback} onBack={() => setReviewOpen(false)}
      onFreshCase={() => { setReviewOpen(false); setRevising(true); setScenarioTab(2); }}
      onSave={demo?.save ?? (() => undefined)} onRefresher={demo?.refresher ?? (() => undefined)} />;
  }


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
          {demo && <span className="mt-1 inline-block rounded-full bg-bansay-tint px-2 py-1 text-xs font-semibold text-bansay-strong">Demo mode</span>}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Rehearsal & Fresh Case (8 cols) */}
        <div className="min-w-0 lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            {scenarioTab === 2 && (
              <button type="button" onClick={() => setScenarioTab(1)} className="text-xs font-semibold text-bansay-strong hover:underline">
                Back to conversation
              </button>
            )}

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
            <section aria-label="Simulated learner exchange" className="flex h-[min(44rem,80dvh)] min-h-[26rem] flex-col rounded-2xl border border-bansay-line bg-white">
              <header className="relative z-10 flex shrink-0 items-start gap-2.5 rounded-t-2xl border-b border-bansay-line bg-white px-3 py-3 sm:items-center sm:px-4">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-bansay-deep font-bold text-white">{initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold text-bansay-deep">{studentName} &middot; Simulated {gradeLabel} learner</span>
                  </div>
                  <p className="text-xs text-slate-600 wrap-anywhere">{activeCase.topic}</p>
                  <p className="text-xs font-semibold text-bansay-strong">Turn {Math.min((chat.closing || chat.shared) ? chat.turns : chat.turns + 1, REHEARSAL_LIMIT)} of {REHEARSAL_LIMIT}</p>
                </div>
              </header>

              {chat.offline && <p role="status" className="shrink-0 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">Offline. {studentName} uses scripted questions from your pack. Messages sync when you reconnect.</p>}
              <div ref={conversationRef} role="log" aria-label="Conversation" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-bansay-canvas p-3 sm:p-4">
                {chat.messages.map((message, index) => {
                  const learner = message.sender === "student";
                  const previous = chat.messages[index - 1];
                  return (
                    <div key={message.id}>
                      {previous?.timestamp !== message.timestamp && (
                        <p className="my-2 text-center text-xs text-slate-600 tabular-nums">{message.timestamp}</p>
                      )}
                      <div className={learner ? "flex items-end gap-2" : "flex justify-end"}>
                        {learner && <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-bansay-deep text-xs font-bold text-white">{initials}</span>}
                        <div className={`min-w-0 max-w-[85%] ${learner ? "" : "text-right"}`}>
                          {learner && <p className="mb-0.5 pl-2 text-xs font-semibold text-bansay-deep">{studentName}</p>}
                          <div className={`inline-block rounded-2xl px-3 py-2 text-left text-sm leading-relaxed ${learner ? "rounded-bl-sm border border-bansay-line bg-white text-slate-900" : "rounded-br-sm bg-bansay-action text-white"}`}>
                            <p className="whitespace-pre-wrap wrap-anywhere">{message.text}</p>
                            {message.scripted && <p className="mt-1 text-xs font-semibold text-bansay-strong">Scripted</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {chat.typing && (
                  <p role="status" className="ml-9 inline-flex items-center gap-2 rounded-2xl border border-bansay-line bg-white px-3 py-2 text-xs text-slate-700">
                    <span aria-hidden="true" className="size-2 rounded-full bg-bansay-action motion-safe:animate-pulse" />
                    {studentName} is typing...
                  </p>
                )}
                {(chat.closing || chat.shared) && !chat.sending && (
                  <div className="rounded-xl border border-bansay-line bg-white p-3">
                    <p className="font-bold text-bansay-deep">{chat.shared ? "Sent to mentor" : "Rehearsal complete"}</p>
                    <p className="mt-1 text-sm text-slate-700">{chat.closing === "understood" ? `${studentName} restated the idea in their own words.` : chat.closing === "turn-limit" ? "You reached five turns." : "Your mentor can now review this conversation."}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!chat.shared && <button type="button" className="ui-button ui-button-primary" disabled={!chat.turns || isSubmittingReview || (!demo && (chat.offline || chat.pending))} onClick={() => reviewDialog.current?.showModal()}>Submit to mentor</button>}
                      <button type="button" className="ui-button ui-button-secondary" onClick={() => void chat.send(undefined, true)}>{chat.shared ? "Start another practice" : "Keep practicing"}</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-10 shrink-0 rounded-b-2xl border-t border-bansay-line bg-white p-2 sm:p-3">
                {(rehearsalError || chat.error) && <p role="alert" className="mb-2 text-xs text-rose-800">{rehearsalError || chat.error} {chat.pending && !chat.offline && <button type="button" className="font-semibold underline" onClick={chat.retrySync}>Retry sync</button>}</p>}
                {!demo && (chat.offline || chat.pending) && chat.turns > 0 && <p className="mb-2 text-xs text-slate-600">Mentor submission is available after the conversation syncs.</p>}
                {(isRecording || recordedVideoUrl) && <details open={isRecording || undefined} className="mb-2 max-h-40 overflow-auto">
                  <summary className="text-xs font-semibold text-bansay-strong">{isRecording ? "Recording controls" : "Review local recording"}</summary>
                {(isRecording || recordedVideoUrl) && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-violet-950">
                        {isRecording
                          ? `Recording ${recordingKind === "video" ? "camera clip" : "voice note"}…`
                          : recordedKind === "video"
                          ? "Camera clip ready (stays only on this device)"
                          : "Voice note ready for self-review"}
                      </p>
                      {isRecording && <button type="button" onClick={stopRecording} className="ui-button ui-button-secondary">Stop ({recordingSeconds}s)</button>}
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
                        : "This recording stays on this device."}
                    </p>
                  </div>
                )}


                </details>}
                {!chat.closing && !chat.shared && (
                  <form onSubmit={handleSendToStudent} className="flex items-end gap-1.5">
                    <button type="button" className="icon-button min-h-11 min-w-9" aria-label="Attachments" aria-expanded={mediaMenu === "attachments"} onClick={() => setMediaMenu(mediaMenu === "attachments" ? null : "attachments")}><Paperclip size={20} /></button>
                    <textarea aria-label="Your response" rows={1} maxLength={2000} value={teacherInput}
                      onChange={(event) => setTeacherInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Write a message..."
                      className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 [field-sizing:content]" />
                    <button type="submit" aria-label="Send message" disabled={!teacherInput.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-bansay-action text-white hover:bg-bansay-strong disabled:opacity-50"><Send size={18} /></button>
                  </form>
                )}
                {chat.closing && !chat.shared && (
                    <button type="button" className="icon-button min-h-11 min-w-9" aria-label="Attachments" aria-expanded={mediaMenu === "attachments"} onClick={() => setMediaMenu(mediaMenu === "attachments" ? null : "attachments")}><Paperclip size={20} /></button>
                )}
                {mediaMenu === "attachments" && (
                  <div className="absolute bottom-full left-2 right-2 z-20 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-bansay-line bg-white p-3 shadow-lg sm:right-auto sm:w-80">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs leading-relaxed text-slate-700">Mentor attachments require consent. Voice notes expire after 14 days{phase2 ? " and classroom clips after 7 days" : ""}. Both stay out of portfolio exports.{demo && " Demo mode keeps recordings local."}</p>
                      <button type="button" className="icon-button" aria-label="Close attachments" onClick={() => setMediaMenu(null)}><X size={16} /></button>
                    </div>
                    <button type="button" className="ui-button ui-button-secondary" disabled={chat.offline || Boolean(demo)} onClick={() => openMediaConsentModal("voice-note")}>Attach audio</button>
                    <button type="button" className="ui-button ui-button-secondary" disabled={isRecording} onClick={() => void startRecording("voice")}>Record a local voice note</button>
                    <button type="button" className="ui-button ui-button-secondary" disabled={isRecording} onClick={() => void startRecording("video")}>Self-review camera (stays on this device)</button>
                    {phase2 && <button type="button" className="ui-button ui-button-secondary" disabled={chat.offline} onClick={() => openMediaConsentModal("cot-video")}>Attach video</button>}
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
                )}
                {chat.turns > 0 && !chat.closing && !chat.shared && !chat.sending && (
                  <button type="button" className="ui-button ui-button-secondary mt-2" disabled={isSubmittingReview || chat.offline || chat.pending} onClick={() => reviewDialog.current?.showModal()}>
                    {isSubmittingReview ? "Finding a mentor..." : "Submit to mentor"}
                  </button>
                )}
              </div>
            </section>

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

              <div className="rounded-xl border border-bansay-line bg-bansay-tint p-4">
                <p className="text-sm font-semibold text-bansay-strong">Practice the revision with the AI learner</p>
                <p className="mt-1 text-sm text-slate-700">Start a fresh simulation, then teach the revised explanation in your own words.</p>
                <button type="button" className="ui-button ui-button-primary mt-3" disabled={chat.sending || chat.pending}
                  onClick={() => { setScenarioTab(1); void chat.send(undefined, true); }}>
                  {chat.sending ? <><Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />Starting practice…</> : "Practice revised explanation"}
                </button>
              </div>

              {(feedback ? demoMentors(activeCase.subject).mentor : activeCase.mentorReview.teachingMove) && (
                <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
                  <p className="text-xs font-semibold text-violet-900 mb-1">
                    {feedback ? "Sample mentor feedback to apply" : "Mentor&apos;s practical teaching move to apply"}
                  </p>
                  <p className="text-sm text-slate-800">
                    {feedback ? demoReviewContent(activeCase, feedback.transcript).move : activeCase.mentorReview.teachingMove}
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

        <aside className="space-y-4 lg:col-span-4" aria-label="Review timeline">
          <div className="space-y-4 rounded-2xl bg-bansay-deep p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-purple-100">Class date &amp; review timeline</p>
                <p className="mt-0.5 text-2xl font-bold">{formattedClassDate}</p>
              </div>
              <CalendarClock className="size-5 shrink-0 text-purple-200" aria-hidden="true" />
            </div>
            <button type="button" disabled={!ready || isSubmittingReview} onClick={() => setReviewOpen((open) => !open)}
              className={`ui-button w-full ${ready && !isSubmittingReview ? "ui-button-primary" : "ui-button-secondary"}`}>
              {isSubmittingReview ? "Finding a mentor..." : ready ? feedback?.sampleOnly ? "View sample feedback" : demo ? "View demo review" : "View mentor review" : assigned ? "Preparing sample feedback" : submitted ? "Waiting for a mentor" : "Practice"}
            </button>
            <p className="text-sm text-purple-100" role="status">
              {isSubmittingReview ? "Finding a mentor..." : !submitted ? "A mentor will be assigned when you submit." : !assigned ? "No mentor is available yet. We'll notify you when one is assigned." : reviewTime}
            </p>
            {assigned && !isSubmittingReview && (
              <dl className="space-y-2 border-t border-white/25 pt-3 text-sm">
                <div><dt className="text-purple-100">Assigned mentor {(demo || hasSampleFeedback) && <span className="font-bold">Sample</span>}</dt><dd className="wrap-anywhere font-semibold">{hasSampleFeedback ? demoMentors(activeCase.subject).mentor : activeCase.mentorReview.mentorName}</dd></div>
                <div><dt className="text-purple-100">Backup reviewer {(demo || hasSampleFeedback) && <span className="font-bold">Sample</span>}</dt><dd className="wrap-anywhere font-semibold">{hasSampleFeedback ? demoMentors(activeCase.subject).backup : activeCase.mentorReview.backupMentorName || "No backup available yet"}</dd></div>
              </dl>
            )}
            <span className="inline-block rounded-full bg-white/15 px-2 py-1 text-xs font-semibold">{feedback?.reviewedAt ? "Sample feedback" : activeCase.packStatus === "mentor-verified" ? "Mentor verified" : "Unverified AI draft"}</span>
            <ol aria-label="Review progress" className="space-y-1 border-t border-white/25 pt-3">
              {["Practice", "Submitted", "Mentor review", "Revise"].map((step, index) => {
                const complete = index === 0 ? submitted : index === 1 ? submitted && !isSubmittingReview : index === 2 ? ready : activeCase.freshCaseStatus === "submitted" || activeCase.freshCaseStatus === "verified";
                const loading = index === 0 ? chat.sending || chat.typing : index === 1 ? isSubmittingReview : index === 2 ? submitted && !ready : isSavingFresh || (revising && chat.sending);
                const StepIcon = loading ? Loader2 : complete ? CheckCircle2 : Circle;
                return <li key={step} aria-current={index === progress ? "step" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${index === progress ? "bg-white font-semibold text-bansay-deep" : "text-purple-100"}`}>
                <StepIcon className={`size-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />{step}
              </li>;
              })}
            </ol>
          </div>
          {demo && <details className="rounded-xl border border-bansay-line bg-white p-3">
            <summary className="cursor-pointer font-semibold text-bansay-strong">Demo controls</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={!demo.review || ready || isSubmittingReview} onClick={demo.skip} className="ui-button ui-button-secondary">Skip to review</button>
              <button type="button" disabled={isSubmittingReview || chat.sending} onClick={() => { demo.reset(); setReviewOpen(false); setRevising(false); setScenarioTab(1); setTeacherInput(""); setSubmissionNotice(null); }} className="ui-button ui-button-secondary">Reset demo</button>
            </div>
          </details>}
          {!demo && ready && reviewOpen && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-label="Mentor review">
              <h2>Mentor review</h2>
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

                {freshCaseUnlocked && <button
                  type="button"
                  onClick={() => { setRevising(true); setScenarioTab(2); }}
                  className="w-full py-2 px-3 rounded-xl bg-bansay-action hover:bg-bansay-strong text-white text-xs font-semibold transition-colors"
                >
                  Apply feedback on a new example
                </button>}
              </div>

            </section>
          )}
        </aside>
      </div>

      <dialog ref={reviewDialog} aria-labelledby="confirm-review-title" className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-bansay-line bg-white p-5 text-slate-900 backdrop:bg-slate-950/45">
        <h2 id="confirm-review-title">Submit to mentor</h2>
        <p className="mt-3 text-sm">Your chat transcript will be shared with the assigned mentor. The submitted transcript will be locked.</p>
        {attachmentsToShare.length > 0 ? <div className="mt-2 text-sm">
          <p>Attachments you agreed to share</p>
          <ul className="list-disc pl-5">{attachmentsToShare.map((asset) => <li key={asset.id}>{asset.label}</li>)}</ul>
        </div> : <p className="mt-2 text-sm">There are no consented audio or video attachments to share.</p>}
        <p className="mt-2 text-sm"><strong>Expected review time.</strong> {reviewTime}</p>
        <form method="dialog" className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="submit" autoFocus className="ui-button ui-button-secondary">Cancel</button>
          <button type="button" disabled={!chat.turns || isSubmittingReview || chat.sending} onClick={() => void handleSubmitForMentorReview()} className="ui-button ui-button-primary">Submit to mentor</button>
        </form>
      </dialog>

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
              <label className="block text-sm font-semibold">
                {consentModalTier === "cot-video" ? "Video clip" : "Audio file"} (up to 5 MB)
                <input type="file" required accept={consentModalTier === "cot-video" ? "video/mp4,video/webm,video/quicktime" : "audio/*"} className="ui-input mt-1"
                  onChange={(event) => setMediaFile(event.target.files?.[0])} />
              </label>

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
                  I consent to temporary private retention (
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
                  {savingAttachment ? "Attaching..." : "Attach with consent"}
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
