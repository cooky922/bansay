import type { AuthUserProfile, BansayLanguage, LessonCase, RehearsalMessage } from "../types/bansay";
import {
  closingLearnerMessage, currentRehearsal, openingLearnerMessage, pickStudentName, REHEARSAL_LIMIT,
  rehearsalStudentName, scriptedClosing, scriptedLearnerReply, type RehearsalRequest,
} from "./rehearsal.ts";

export const DEMO_REVIEW_DELAY_MS = 6000;

export interface DemoReviewState {
  readyAt: number;
  reviewedAt?: string;
  transcript: RehearsalMessage[];
  sampleOnly?: boolean;
  aiGenerated?: boolean;
  response?: {
    focusedGap: string;
    teachingMove: string;
    quickRefresher: string;
    masteredSkill: string;
    practiceSkill: string;
  };
}

const fallback = {
  correction: "Make the condition for your explanation explicit. Show where the example stops applying.",
  move: "Ask the learner to predict what changes when you change one condition.",
  refresher: "Review the comparison and where it stops.",
  step: 2,
};

const fixtures: Record<string, typeof fallback> = {
  Science: { correction: "Separate what someone can observe from the explanation for it.", move: "Ask for a prediction, then ask what observation would support it.", refresher: "Review when the model applies and when it does not.", step: 1 },
  Mathematics: { correction: "State what each quantity represents before moving to the next calculation.", move: "Change one quantity and ask the learner to predict how the result changes.", refresher: "Review the worked example and compare each step.", step: 3 },
  English: { correction: "Separate the claim from the specific words that support it.", move: "Ask the learner to point to one phrase and explain what it contributes.", refresher: "Review the key terms and try an example in different words.", step: 0 },
};

export function demoReviewContent(lesson: LessonCase, transcript: RehearsalMessage[], response?: DemoReviewState["response"]) {
  const fixture = fixtures[lesson.subject] ?? fallback;
  const turns = transcript.filter((turn) => turn.sender === "teacher");
  return {
    ...fixture,
    ...(response ? {
      correction: response.focusedGap || fixture.correction,
      move: response.teachingMove || fixture.move,
      nextStep: response.teachingMove || fixture.move,
      refresher: response.quickRefresher || fixture.refresher,
      whatWorked: response.masteredSkill,
    } : {}),
    nextStep: response?.teachingMove || fixture.move,
    strong: turns[0],
    correctionTurn: turns.at(-1),
  };
}

export function demoMentors(subject: string) {
  return { mentor: `Sample Mentor (${subject})`, backup: `Sample Backup (${subject})` };
}

export function demoExchange(lesson: LessonCase, request: RehearsalRequest, teacher: AuthUserProfile): LessonCase {
  const { requestId, teacherMessage, restart, language } = request;
  const teacherName = teacher.displayName;
  const opening = teacherMessage === undefined;
  const round = currentRehearsal(lesson.rehearsalMessages);
  if (lesson.rehearsalMessages.some(({ id }) => id === `learner-${requestId}`) ||
      (opening && !restart && round[0]?.opening)) return lesson;
  const turn = opening ? 0 : round.filter((message) => message.sender === "teacher").length + 1;
  const openingName = opening ? request.studentName ?? pickStudentName(rehearsalStudentName(round)) : undefined;
  const closing = turn >= REHEARSAL_LIMIT ? "turn-limit" : undefined;
  const plain = scriptedLearnerReply(lesson, language, turn);
  const text = closing ? closingLearnerMessage(scriptedClosing(language), language, teacherName) :
    opening ? openingLearnerMessage(plain, teacherName) : plain;
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const messages: RehearsalMessage[] = teacherMessage
    ? [{ id: `teacher-${requestId}`, sender: "teacher", text: teacherMessage, timestamp }]
    : [];
  messages.push({ id: `learner-${requestId}`, sender: "student", text, timestamp, opening, studentName: openingName, closing, scripted: true });
  return { ...lesson, rehearsalMessages: [...(opening && !restart ? [] : lesson.rehearsalMessages), ...messages] };
}

export function finishDemoPractice(lesson: LessonCase, language: BansayLanguage, teacherName?: string): LessonCase {
  const round = currentRehearsal(lesson.rehearsalMessages);
  const last = round.at(-1);
  if (!last || last.sharedWithMentor || !round.some(({ sender }) => sender === "teacher")) return lesson;
  const rehearsalMessages: RehearsalMessage[] = last.closing
    ? lesson.rehearsalMessages.map((message) => message.id === last.id ? { ...message, sharedWithMentor: true } : message)
    : [...lesson.rehearsalMessages, {
      id: crypto.randomUUID(), sender: "student", timestamp: last.timestamp, closing: "finished", scripted: true,
      text: closingLearnerMessage(scriptedClosing(language), language, teacherName), sharedWithMentor: true,
    }];
  return { ...lesson, rehearsalMessages };
}
