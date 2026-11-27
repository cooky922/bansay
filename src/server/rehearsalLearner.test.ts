import assert from "node:assert/strict";
import test from "node:test";
import { INITIAL_CASES } from "../data/bansayData.ts";
import {
  closingLearnerMessage, currentRehearsal, MAX_REHEARSAL_REPLY_LENGTH, openingLearnerMessage,
  pickStudentName, rehearsalGradeLabel, rehearsalStudentName, scriptedClosing, STUDENT_NAMES,
} from "../lib/rehearsal.ts";
import type { BansayLanguage, RehearsalMessage } from "../types/bansay.ts";
import { learnerModelRequest } from "./rehearsalLearner.ts";

const teacherName = "Ana Dela Cruz";
const lesson = { ...INITIAL_CASES[0], gradeLevel: "Grade 7" };
const message = (id: string, text: string, extra?: Partial<RehearsalMessage>): RehearsalMessage =>
  ({ id, text, sender: "student", timestamp: "10:00", ...extra });

test("the next random name excludes the previous name and the opening fixes a name for the round", () => {
  for (const previous of STUDENT_NAMES) {
    const names = Array.from({ length: 5 }, (_, index) => pickStudentName(previous, () => (index + 0.5) / 5));
    assert.equal(new Set(names).size, 5);
    assert.ok(!names.includes(previous));
  }
  const opening = message("a", "Why?", { opening: true, studentName: "AK" });
  const replies = [message("b", "Here is how.", { sender: "teacher" }), message("c", "But why?")];
  assert.equal(rehearsalStudentName(currentRehearsal([opening, ...replies])), "AK");
  assert.equal(rehearsalStudentName(currentRehearsal([opening, ...replies, message("d", "Why?", {
    opening: true, studentName: "Iya",
  })])), "Iya");
});

test("opening greeting is app-only, including when a teacher name appears in transcript or input", () => {
  const greeting = openingLearnerMessage("Why does it happen?", teacherName);
  assert.equal(greeting, "Good day, Teacher Ana Dela Cruz! Why does it happen?");
  assert.equal(openingLearnerMessage("Why?"), "Good day, Teacher! Why?");
  assert.equal(openingLearnerMessage(greeting, teacherName), greeting);
  const round = [message("a", greeting, { opening: true, studentName: "Gold" })];
  for (const turn of [0, 1]) {
    const request = learnerModelRequest({
      lesson, gradeLabel: rehearsalGradeLabel(lesson.gradeLevel), studentName: "Gold",
      language: "en", turn, round, teacherName, teacherMessage: "An example from " + teacherName + ".",
    });
    assert.ok(!JSON.stringify(request).includes(teacherName));
    assert.ok(!request.input.includes("Good day, Teacher"));
    assert.match(request.instructions, /Your name is Gold\. Stay Gold for the whole rehearsal\./);
    assert.ok(request.instructions.includes(String(MAX_REHEARSAL_REPLY_LENGTH)));
    assert.ok(!request.instructions.includes("Grade Grade"));
  }
});

test("grade labels have one Grade prefix", () => {
  for (const value of ["7", "Grade 7", " Grade Grade 7 "]) {
    assert.equal(rehearsalGradeLabel(value), "Grade 7");
  }
});

const closings = [
  ["en", "I see how the pieces fit.", "Thanks so much, Teacher!", "Thank you, Teacher"],
  ["fil", "Naiintindihan ko na po ang halimbawa.", "Salamat po, guro!", "Salamat po, Teacher"],
  ["ceb", "Nasabtan na nako ang pananglitan.", "Salamat kaayo, maestra!", "Salamat kaayo, Teacher"],
] as const satisfies ReadonlyArray<readonly [BansayLanguage, string, string, string]>;

for (const [language, sentence, modelThanks, expected] of closings) {
  test(`closing adds exactly one localized thank-you in ${language}`, () => {
    for (const modelReply of [sentence, sentence + " " + modelThanks, modelThanks + " " + sentence]) {
      assert.equal(closingLearnerMessage(modelReply, language, teacherName), sentence + " " + expected + " " + teacherName + "!");
      assert.equal(closingLearnerMessage(modelReply, language), sentence + " " + expected + "!");
    }
    assert.ok(closingLearnerMessage(scriptedClosing(language), language, teacherName).endsWith(expected + " " + teacherName + "!"));
  });
}
