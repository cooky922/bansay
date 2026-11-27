import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INITIAL_CASES } from "./src/data/bansayData.ts";
import { register, createSession } from "./src/server/auth.ts";
import { createLessonCaseRecord } from "./src/server/bansayRepo.ts";
import { openDatabase } from "./src/server/db.ts";

const temp = mkdtempSync(join(tmpdir(), "bansay-routing-"));
const dbPath = join(temp, "test.sqlite");
const db = openDatabase(dbPath);
const makeUser = (displayName, role, degree) => {
  const user = register(db, { email: randomUUID() + "@example.test", password: "fixture-password", degree, displayName, role });
  return { user, token: createSession(db, user.id) };
};
const teacher = makeUser("Fixture Teacher", "teacher", "Education");
const unrelated = makeUser("Math Reviewer", "mentor", "Mathematics");
const lesson = createLessonCaseRecord(db, teacher.user, {
  subject: "Science", topic: "Gas Laws", gradeLevel: "Grade 7", language: "en", teacherMajor: "Education", classDate: "2027-01-01",
  careerStage: "1", startingMaterial: "", baselineFirst: false, baselineExplanation: "", submissionFormat: "live-ai", usesLabEquipment: false,
  packStatus: "ai-draft", support: INITIAL_CASES[0].support,
});
assert.equal(lesson.mentorReview.mentorName, "");
assert.equal(lesson.mentorReview.backupMentorName, "");
const base = "http://127.0.0.1:48732";
const server = spawn(process.execPath, ["server.ts", "--preview"], {
  windowsHide:true, stdio:["ignore","inherit","inherit"],
  env: { ...process.env, PORT:"48732", BANSAY_DATABASE_PATH:dbPath, NODE_ENV:"production", DEMO_MODE:"true", OPENROUTER_API_KEY:"", GEMINI_API_KEY:"", VITE_BANSAY_PHASE_2:"true" },
});
try {
  for (let i = 0; i < 70; i++) {
    if (await fetch(base).then(r => r.ok).catch(() => false)) break;
    await new Promise(r => setTimeout(r,75));
  }
  async function request(route, actor = teacher, payload, method = payload ? "POST" : "GET", expected = 200) {
    const response = await fetch(base + "/api/bansay/" + route, {
      method, headers: { Authorization: "Bearer " + actor.token, "Content-Type": "application/json", Origin: base },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    assert.equal(response.status, expected, response.ok ? "" : await response.text());
    return response;
  }
  const submit = ids => request("cases/" + lesson.id + "/submit-review", teacher, { attachmentIds: ids });
  const turn = async (record, payload = {}) => (await (await request("rehearse", teacher, {
    caseId: lesson.id, requestId: randomUUID(), expectedCount: record.rehearsalMessages.length, language:"en", scripted:true, ...payload,
  })).json()).caseRecord;
  const workspace = async user => (await (await request("workspace", user)).json());
  assert.equal((await workspace(teacher)).rehearsalDemo, false);
  await request("cases/" + lesson.id + "/submit-review", teacher, {}, "POST", 409);
  let record = await turn(lesson);
  record = await turn(record, { teacherMessage: "The air pushes against the bottle." });
  const attachments = [];
  for (const [tier, type] of [["voice-note","audio/wav"], ["cot-video","video/mp4"]]) {
    const result = await request("cases/" + lesson.id + "/media", teacher, {
      tier, step:4, consentConfirmed:true, noStudentFacesConfirmed:true, label:tier, attachment:{ type, base64:"dGVzdA==" },
    }, "POST", 201);
    attachments.push((await result.json()).asset.id);
  }
  const media = "cases/" + lesson.id + "/media/";
  await request(media + attachments[0], unrelated, undefined, "GET", 404);
  record = (await (await submit(attachments)).json()).caseRecord;
  assert.equal(record.mentorReview.assignment, "waiting");
  assert.equal(record.mentorReview.mentorName, "");
  assert.match(record.rehearsalMessages.at(-1).text, /Thank you, Teacher Fixture Teacher!$/);
  const primary = makeUser("Science Reviewer", "mentor", "Science");
  const backup = makeUser("Science Backup", "mentor", "Physics");
  record = (await workspace(teacher)).cases[0];
  assert.equal(record.mentorReview.mentorName, primary.user.displayName);
  assert.equal(record.mentorReview.backupMentorName, backup.user.displayName);
  assert.equal((await workspace(unrelated)).cases.length, 0);
  assert.equal((await workspace(primary)).cases[0].mediaAssets.length, 2);
  const response = await request(media + attachments[0], backup);
  assert.equal(await response.text(), "test");
  const submittedLength = record.rehearsalMessages.length;
  record = await turn(record,{ restart:true });
  record = await turn(record,{ teacherMessage:"This is a private new rehearsal." });
  assert.ok(record.rehearsalMessages.length > submittedLength);
  assert.equal((await workspace(primary)).cases[0].rehearsalMessages.length, submittedLength);
  await request(media + attachments[0], teacher, undefined, "DELETE");
  await request(media + attachments[0], primary, undefined, "GET", 404);
  console.log("Verified no early assignment, production demo guard, waiting and rerouting, consented audio/video, reviewer isolation, locked transcript and purge.");
} finally { server.kill(); db.close(); }
