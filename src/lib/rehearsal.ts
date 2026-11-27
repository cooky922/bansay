import type { BansayLanguage, LessonCase, RehearsalMessage } from "../types/bansay";

export const REHEARSAL_LIMIT = 5;
export const MAX_REHEARSAL_REPLY_LENGTH = 240;
export const STUDENT_NAMES = ["Gold", "Kenji", "Calvyn", "Sean", "AK", "Iya"] as const;

const OPENING_GREETING = "Good day, Teacher";
// Review the Filipino and Cebuano wording with native speakers.
const CLOSING_THANK_YOU = {
  en: "Thank you, Teacher",
  fil: "Salamat po, Teacher",
  ceb: "Salamat kaayo, Teacher",
};

export function pickStudentName(previous?: string, random = Math.random) {
  const available = STUDENT_NAMES.filter((name) => name !== previous);
  return available[Math.floor(random() * available.length)];
}

export function rehearsalStudentName(round: RehearsalMessage[]) {
  const first = round[0];
  if (first?.studentName) return first.studentName;
  if (!first) return undefined;
  const index = Array.from(first.id).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return STUDENT_NAMES[index % STUDENT_NAMES.length];
}

export function isStudentName(value: unknown): value is (typeof STUDENT_NAMES)[number] {
  return STUDENT_NAMES.some((name) => name === value);
}

export function rehearsalGradeLabel(grade: string) {
  const level = grade.trim().replace(/^(?:grade\s+)+/i, "").trim();
  return /^grade\b/i.test(level) ? level : `Grade ${level || "7"}`;
}

function addressTeacher(prefix: string, teacherName?: string) {
  const name = teacherName?.trim();
  return `${prefix}${name ? ` ${name}` : ""}!`;
}

export function withoutOpeningGreeting(text: string) {
  return text.replace(/^Good day, Teacher(?: .*?)?!\s*/i, "").trim();
}

export function openingLearnerMessage(reply: string, teacherName?: string) {
  return `${addressTeacher(OPENING_GREETING, teacherName)} ${withoutOpeningGreeting(reply)}`.trimEnd();
}

const gratitude = /\b(?:thank\s+you|thanks|salamat)(?:\s+(?:so much|very much|a lot|po|kaayo|gud|uli|again))*[^.!?]*(?:[.!?]+|$)/giu;

export function closingLearnerMessage(reply: string, language: BansayLanguage, teacherName?: string) {
  const content = reply.replace(gratitude, "").trim();
  const first = content.match(/^[^.!?]+[.!?]?/)?.[0].trim() ?? "";
  const sentence = first.endsWith("?") ? "" : first;
  return [sentence, addressTeacher(CLOSING_THANK_YOU[language], teacherName)].filter(Boolean).join(" ");
}

export function scriptedClosing(language: BansayLanguage) {
  return lines[language].close;
}

const lines = {
  en: {
    opening: "Why does that happen in the example from class?",
    probe: "What if I changed one thing in that example. Would I still get the same result?",
    check: "How could I tell if the same thing would happen in a different example?",
    close: "I still need to think about what would happen in a different example.",
  },
  fil: {
    opening: "Bakit po nangyayari iyon sa halimbawa natin sa klase?",
    probe: "Kung may babaguhin po ako sa halimbawa, pareho pa rin ba ang mangyayari?",
    check: "Paano ko po malalaman kung ganoon din ang mangyayari sa ibang halimbawa?",
    close: "Pag-iisipan ko pa po kung ano ang mangyayari sa ibang halimbawa.",
  },
  ceb: {
    opening: "Ngano man nga nahitabo to sa atong pananglitan sa klase?",
    probe: "Kon usbon nako ang usa ka butang sa pananglitan, pareho ra ba ang mahitabo?",
    check: "Unsaon nako pagkahibalo kon pareho ra ang mahitabo sa laing pananglitan?",
    close: "Hunahunaan pa nako unsay mahitabo sa laing pananglitan.",
  },
};

function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function containsTopicTitle(text: string, topic: string) {
  const title = normalize(topic);
  return Boolean(title && (text.toLowerCase().includes(topic.trim().toLowerCase()) || ` ${normalize(text)} `.includes(` ${title} `)));
}

export function containsContactInfo(text: string) {
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\d[\s().+-]*){8,}|https?:\/\//i.test(text);
}

export function currentRehearsal(messages: RehearsalMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].opening) return messages.slice(index);
  }
  return messages;
}

export function scriptedLearnerReply(
  lesson: Pick<LessonCase, "support" | "language" | "topic">,
  language: BansayLanguage,
  turn: number,
) {
  const { support, topic } = lesson;
  const pack = support.validatedPack;
  const candidates = turn === 0
    ? [support.simulatedStudentPrompt.openingQuestion, pack?.teach_it.activity.observe_prompt, pack?.misconceptions.prediction_prompt]
    : turn === 1
      ? [pack?.misconceptions.prediction_prompt, ...support.misconceptionAlerts.map((item) => item.question)]
      : [pack?.teach_it.activity.explain_prompt, ...(pack?.self_check.questions.map((item) => item.question) ?? [])];
  if (turn > 0 && turn < REHEARSAL_LIMIT) {
    candidates.push(support.misconceptionDiagnostic.prompt);
  }
  if (turn < REHEARSAL_LIMIT && lesson.language === language) {
    const question = candidates
      .map((candidate) => candidate?.trim())
      .find((candidate) => candidate && candidate.length <= MAX_REHEARSAL_REPLY_LENGTH &&
        (candidate.match(/\?/g)?.length === 1) && candidate.endsWith("?") &&
        !containsTopicTitle(candidate, topic) && !containsContactInfo(candidate));
    if (question) return question;
  }

  const { opening, probe, check, close } = lines[language];
  const fallback = turn === 0 ? opening : turn === 1 ? probe : turn >= REHEARSAL_LIMIT ? close : check;
  const alternate = language === "en"
    ? "Could you show me an example?"
    : language === "fil" ? "May halimbawa po ba?" : "Naa kay pananglitan?";
  return [fallback, alternate, "...?"].find((candidate) => !containsTopicTitle(candidate, topic)) ?? "...?";
}

export interface RehearsalRequest {
  caseId: string;
  requestId: string;
  expectedCount: number;
  language: BansayLanguage;
  teacherMessage?: string;
  restart?: boolean;
  scripted?: boolean;
  studentName?: string;
}
