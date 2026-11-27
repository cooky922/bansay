import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INITIAL_CASES } from "./src/data/bansayData.ts";
import { createSession, register } from "./src/server/auth.ts";
import { createLessonCaseRecord } from "./src/server/bansayRepo.ts";
import { openDatabase } from "./src/server/db.ts";

const temporary = mkdtempSync(join(tmpdir(), "bansay-rehearsal-"));
const dbPath = join(temporary, "fixtures.sqlite");
const database = openDatabase(dbPath);
const displayName = "Ana Dela Cruz";
const user = register(database, { email: "rehearsal@example.test", displayName, degree: "Education", password: "fixture-password" });
const token = createSession(database, user.id);
const lesson = createLessonCaseRecord(database, user, {
  subject: "Science", topic: "Gas Laws", gradeLevel: "Grade 7", language: "en",
  teacherMajor: "", classDate: "2027-01-01", careerStage: "1", startingMaterial: "",
  baselineFirst: false, baselineExplanation: "", submissionFormat: "live-ai", usesLabEquipment: false,
  packStatus: "ai-draft", support: INITIAL_CASES[0].support,
});
database.close();

const seen = [];
const provider = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  seen.push(body);
  const request = JSON.parse(body);
  const input = JSON.parse(request.messages.at(-1).content);
  const reply = input.finish ? "I see why the air pushes harder. Thank you, teacher!" :
    input.turn === 0 ? "Why did the sealed bottle feel firmer in the sun?" :
    input.turn === 1 ? "But why does that change with a loose lid?" : "Air can escape when the lid is loose. Thanks!";
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reply, understood: input.turn === 2 }) } }] }));
});
await new Promise(resolve => provider.listen(0, "127.0.0.1", resolve));
const server = spawn(process.execPath, ["server.ts"], {
  windowsHide: true, stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, NODE_ENV: "production", PORT: "48723", BANSAY_DATABASE_PATH: dbPath,
    OPENROUTER_ENDPOINT: "http://127.0.0.1:" + provider.address().port, OPENROUTER_API_KEY: "fixture",
    OPENROUTER_REHEARSAL_MODEL: "fixture/model", GEMINI_API_KEY: "" },
});
try {
  const base = "http://127.0.0.1:48723";
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await fetch(base).then(response => response.ok).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  async function post(route, payload) {
    const response = await fetch(base + route, {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data.caseRecord.rehearsalMessages;
  }
  const exchange = (messages, data = {}) => post("/api/bansay/rehearse", {
    caseId: lesson.id, requestId: randomUUID(), expectedCount: messages.length, language: "en", ...data,
  });
  const submit = () => post("/api/bansay/cases/" + lesson.id + "/submit-review");
  let messages = await exchange(lesson.rehearsalMessages, { studentName: "Gold" });
  const firstName = messages[0].studentName;
  assert.ok(firstName);
  assert.match(messages[0].text, /^Good day, Teacher Ana Dela Cruz! Why/);
  messages = await exchange(messages, { teacherMessage: "Ana Dela Cruz thinks air stays inside." });
  assert.equal(messages[0].studentName, firstName);
  assert.ok(!messages.at(-1).text.includes("Good day"));
  messages = await submit();
  assert.equal(messages.at(-1).closing, "finished");
  assert.equal(messages.at(-1).text, "I see why the air pushes harder. Thank you, Teacher Ana Dela Cruz!");
  assert.deepEqual(await submit(), messages);
  messages = await exchange(messages, { restart: true, studentName: firstName });
  assert.notEqual(messages.at(-1).studentName, firstName);
  assert.match(messages.at(-1).text, /^Good day, Teacher Ana Dela Cruz!/);
  const name = messages.at(-1).studentName;
  messages = await exchange(messages, { teacherMessage: "Air stays inside." });
  messages = await exchange(messages, { teacherMessage: "With a loose lid, air escapes." });
  assert.equal(messages.at(-1).closing, "understood");
  assert.equal(messages.at(-1).text, "Air can escape when the lid is loose. Thank you, Teacher Ana Dela Cruz!");
  assert.equal((await submit()).length, messages.length);
  assert.ok(seen.some(body => body.includes("Your name is " + name)));
  assert.ok(seen.every(body => !body.includes(displayName) && !body.includes("Grade Grade")));
  messages = await exchange(messages, { restart: true, scripted: true, language: "ceb" });
  for (let turn = 1; turn <= 5; turn++) {
    messages = await exchange(messages, { teacherMessage: "Sample explanation " + turn, scripted: true, language: "ceb" });
  }
  assert.equal(messages.at(-1).closing, "turn-limit");
  assert.ok(messages.at(-1).text.endsWith("Salamat kaayo, Teacher Ana Dela Cruz!"));
  console.log("API checked stable names, non-repeat, private payloads, restart, early close and idempotent submit, paraphrase, and scripted fifth turn.");
} finally {
  server.kill();
  provider.close();
  await new Promise(resolve => setTimeout(resolve, 300));
  try { rmSync(temporary, { recursive: true, force: true }); } catch {}
}
