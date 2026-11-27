import { useEffect, useRef, useState } from "react";
import type { BansayLanguage, LessonCase, RehearsalMessage } from "../types/bansay";
import { closingLearnerMessage, containsContactInfo, containsTopicTitle, currentRehearsal, openingLearnerMessage, pickStudentName, rehearsalStudentName, REHEARSAL_LIMIT, scriptedLearnerReply, withoutOpeningGreeting, type RehearsalRequest } from "../lib/rehearsal";

type PendingExchange = { request: RehearsalRequest; messages: RehearsalMessage[] };

function readPending(key: string): PendingExchange[] {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

export function useLearnerConversation(
  lesson: LessonCase | undefined,
  language: BansayLanguage,
  teacher: { id: string; displayName?: string },
  exchange: (request: RehearsalRequest) => Promise<LessonCase>,
  demo = false,
) {
  const key = `bansay-rehearsal-${demo ? "demo-" : ""}${lesson?.id}`;
  const [pending, setPending] = useState(() => readPending(key));
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const previousNameKey = `bansay-last-rehearsal-student-${teacher.id}`;
  const [incomingName, setIncomingName] = useState<string>();
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [optimistic, setOptimistic] = useState<RehearsalMessage>();
  const [revealed, setRevealed] = useState<RehearsalMessage[]>();
  const [error, setError] = useState("");
  const busy = useRef(false);
  const openingStarted = useRef(false);
  const syncing = useRef(false);
  const persisted = revealed ?? lesson?.rehearsalMessages ?? [];
  const unsynced = pending.filter(({ messages }) => !persisted.some(({ id }) => id === messages.at(-1)?.id));
  const combined = unsynced.reduce((thread, entry) => {
    const replace = entry.messages[0]?.opening && !entry.request.restart && thread.length === 1;
    return [...(replace ? [] : thread), ...entry.messages];
  }, persisted);
  const round = currentRehearsal(combined);
  const turns = round.filter((message) => message.sender === "teacher").length;
  const shared = Boolean(round.at(-1)?.sharedWithMentor);
  const closing = round.at(-1)?.closing ?? (turns >= REHEARSAL_LIMIT ? "turn-limit" : undefined);
  const needsOpening = !round[0]?.opening && round.length <= 1;
  const studentName = incomingName ?? (needsOpening ? undefined : rehearsalStudentName(round));
  const visibleRound = needsOpening ? [] : round.map((message, index) => {
    if (index === 0 && lesson) {
      const question = withoutOpeningGreeting(message.text);
      const needsScript = containsTopicTitle(question, lesson.topic);
      if (!message.studentName || needsScript) return {
        ...message,
        text: openingLearnerMessage(needsScript ? scriptedLearnerReply(lesson, language, 0) : question, teacher.displayName),
        scripted: needsScript || message.scripted,
      };
    }
    if (message.closing && !round[0]?.studentName) {
      return { ...message, text: closingLearnerMessage(message.text, language, teacher.displayName) };
    }
    return message;
  });
  const messages = [...visibleRound, ...(optimistic ? [optimistic] : [])];

  function savePending(next: PendingExchange[]) {
    setPending(next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      // The current conversation remains available in memory.
    }
  }

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (offline || sending || !pending.length || syncing.current) return;
    syncing.current = true;
    let remaining = pending;
    void (async () => {
      try {
        for (const entry of pending) {
          await exchange(entry.request);
          remaining = remaining.slice(1);
          savePending(remaining);
        }
        setError("");
      } catch (cause) {
        setError(cause instanceof TypeError
          ? "The connection is unavailable. Scripted replies are still available."
          : cause instanceof Error ? cause.message : "Unable to sync this conversation.");
      } finally {
        syncing.current = false;
      }
    })();
  }, [offline, sending, pending, exchange, syncAttempt]);

  async function send(text?: string, restart = false) {
    if (!lesson || busy.current || syncing.current || (text && (needsOpening || closing || shared))) return false;
    if (text && containsContactInfo(text)) {
      setError("Remove contact details before sending your explanation.");
      return false;
    }
    busy.current = true;
    setError("");
    setRevealed(persisted);
    setSending(true);
    let proposedName: string | undefined;
    if (!text) {
      let previous = rehearsalStudentName(round);
      try {
        previous = localStorage.getItem(previousNameKey) ?? previous;
      } catch {
        // The current round still supplies a previous name.
      }
      proposedName = pickStudentName(previous);
    }
    const request: RehearsalRequest = {
      caseId: lesson.id,
      requestId: crypto.randomUUID(),
      expectedCount: combined.length,
      language,
      teacherMessage: text,
      restart,
      studentName: proposedName,
    };
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const teacherTurn: RehearsalMessage | undefined = text
      ? { id: `teacher-${request.requestId}`, sender: "teacher", text, timestamp }
      : undefined;
    setOptimistic(teacherTurn);
    try {
      let scripted = !demo && (offline || pending.length > 0);
      if (!scripted) {
        try {
          const record = await exchange(request);
          if (!text) proposedName = rehearsalStudentName(currentRehearsal(record.rehearsalMessages));
        } catch (cause) {
          if (!(cause instanceof TypeError)) throw cause;
          scripted = true;
        }
      }
      if (proposedName) {
        setIncomingName(proposedName);
        try {
          localStorage.setItem(previousNameKey, proposedName);
        } catch {
          // The name is still persisted with its opening message.
        }
      }
      setTyping(true);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1250));
      if (scripted) {
        const turn = text ? turns + 1 : 0;
        const learner: RehearsalMessage = {
          id: `learner-${request.requestId}`,
          sender: "student",
          text: turn === 0
            ? openingLearnerMessage(scriptedLearnerReply(lesson, language, turn), teacher.displayName)
            : turn >= REHEARSAL_LIMIT
              ? closingLearnerMessage(scriptedLearnerReply(lesson, language, turn), language, teacher.displayName)
              : scriptedLearnerReply(lesson, language, turn),
          timestamp,
          opening: !text,
          studentName: proposedName,
          scripted: true,
          closing: turn >= REHEARSAL_LIMIT ? "turn-limit" : undefined,
        };
        savePending([...pending, { request: { ...request, scripted: true }, messages: teacherTurn ? [teacherTurn, learner] : [learner] }]);
      }
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to continue this conversation.");
      return false;
    } finally {
      setIncomingName(undefined);
      setOptimistic(undefined);
      setRevealed(undefined);
      setTyping(false);
      setSending(false);
      busy.current = false;
    }
  }

  useEffect(() => {
    if (!needsOpening) { openingStarted.current = false; return; }
    if (!lesson || openingStarted.current) return;
    openingStarted.current = true;
    void send();
  }, [lesson, needsOpening]);

  return { messages, studentName, turns, closing, shared, offline, pending: pending.length > 0, typing, sending, needsOpening, error, send, retrySync: () => setSyncAttempt((attempt) => attempt + 1) };
}
