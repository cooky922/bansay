import "dotenv/config";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateOpenRouterJson, hasAnyAiProvider } from "./src/server/aiProviders.ts";
import {
  createSession,
  currentUser,
  login,
  logout,
  register,
  updateUserPreferences,
  validateSameOrigin,
  writeSession,
} from "./src/server/auth.ts";
import {
  addMediaMetadataRecord,
  buildPilotTables,
  computeDaysUntil,
  createLessonCaseRecord,
  findMatchingLacPack,
  getCachedConceptPack,
  saveCachedConceptPack,
  deleteCachedConceptPack,
  getAnySubmittedLessonCase,
  getOwnedLessonCase,
  listMentorReviewQueue,
  listSharedLacPacks,
  listTeacherCases,
  listTeacherEvidence,
  seedStarterDataForUser,
} from "./src/server/bansayRepo.ts";
import { generateValidatedConceptPack, languageName } from "./src/server/conceptPackEngine.ts";
import { shortFieldName } from "./src/server/conceptPackValidator.ts";
import { closingLearnerMessage, containsContactInfo, containsTopicTitle, currentRehearsal, isStudentName, MAX_REHEARSAL_REPLY_LENGTH, openingLearnerMessage, pickStudentName, rehearsalGradeLabel, rehearsalStudentName, REHEARSAL_LIMIT, scriptedClosing, scriptedLearnerReply, withoutOpeningGreeting } from "./src/lib/rehearsal.ts";
import { learnerModelRequest } from "./src/server/rehearsalLearner.ts";
import { assignReviewMentor, routeWaitingReviews } from "./src/server/mentorRouting.ts";
import { openDatabase } from "./src/server/db.ts";
import type {
  AuthUserProfile,
  BansayLanguage,
  CareerStage,
  ClassroomEvidenceItem,
  GeneratedLessonSupport,
  MediaTier,
  LessonCase,
  RehearsalMessage,
  SubjectName,
} from "./src/types/bansay.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const database = openDatabase();

function extractApiError(err: unknown): { status: number; message: string } {
  const errorObj = err as { status?: number; message?: string };
  const status = typeof errorObj?.status === "number" ? errorObj.status : 500;
  const rawMessage = errorObj?.message || "Unexpected server error while contacting AI provider.";
  return { status, message: rawMessage };
}

function rehearsalDemoEnabled() {
  return process.env.NODE_ENV !== "production" && !process.argv.includes("--preview") && process.env.DEMO_MODE === "true";
}

function isDemoMode(): boolean {
  return !hasAnyAiProvider();
}

const MENTOR_FEEDBACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    focusedGap: { type: "string" },
    teachingMove: { type: "string" },
    quickRefresher: { type: "string" },
    masteredSkill: { type: "string" },
    practiceSkill: { type: "string" },
  },
  required: ["focusedGap", "teachingMove", "quickRefresher", "masteredSkill", "practiceSkill"],
} as const;

const SUPPORTED_PACK_SUBJECTS = new Set(["Science", "Mathematics", "English"]);

function createDemoMentorFeedback(language: string) {
  if (language === "fil") {
    return {
      demo: true,
      focusedGap: "Malinaw ang halimbawa, ngunit kailangan munang ipasabi sa mag-aaral ang dahilan bago ibigay ang pormal na termino.",
      teachingMove: "Magtanong muna ng hula, paghambingin ang dalawang kaso, at saka iugnay ang mga ito sa konsepto.",
      quickRefresher: "",
      masteredSkill: "Gumamit ng pamilyar na halimbawa",
      practiceSkill: "Pagkuha ng pangangatwiran ng mag-aaral",
    };
  }
  if (language === "ceb") {
    return {
      demo: true,
      focusedGap: "Klaro ang pananglitan, apan kinahanglan una ipasulti sa estudyante ang rason sa dili pa ihatag ang pormal nga termino.",
      teachingMove: "Pangutan-a una ang tagna, itandi ang duha ka kaso, unya idugtong kini sa konsepto.",
      quickRefresher: "",
      masteredSkill: "Paggamit og pamilyar nga pananglitan",
      practiceSkill: "Pagkuha sa panghunahuna sa estudyante",
    };
  }
  return {
    demo: true,
    focusedGap: "The example is clear, but learners need a chance to state the causal why before hearing the formal term.",
    teachingMove: "Ask for a prediction, contrast the positive example and non-example, then connect their reasoning to the concept.",
    quickRefresher: "",
    masteredSkill: "Uses a familiar example",
    practiceSkill: "Eliciting learner causal reasoning",
  };
}

const app = express();
app.use(express.json({ limit: "8mb" }));

// CSRF protection for cookie-authenticated mutations
app.use("/api/bansay", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !validateSameOrigin(req)) {
    res.status(403).json({ error: "Cross-origin state-changing request rejected." });
    return;
  }
  next();
});

function requireAuth(req: express.Request, res: express.Response): AuthUserProfile | null {
  const user = currentUser(database, req);
  if (!user) {
    res.status(401).json({ error: "Sign in is required." });
    return null;
  }
  return user;
}

app.post("/api/bansay/auth/register", (req, res) => {
  try {
    const user = register(database, req.body);
    seedStarterDataForUser(database, user);
    const sessionToken = createSession(database, user.id);
    writeSession(req, res, sessionToken);
    res.status(201).json({ user, sessionToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    if (message.includes("already uses this email")) {
      res.status(409).json({ error: message, code: "EMAIL_EXISTS" });
      return;
    }
    res.status(400).json({ error: message });
  }
});

app.post("/api/bansay/auth/login", (req, res) => {
  let user: AuthUserProfile;
  try {
    user = login(database, req.body);
  } catch {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  const expectedRole = (req.body as { expectedRole?: unknown })?.expectedRole;
  if (
    (expectedRole === "teacher" && user.role === "mentor") ||
    (expectedRole === "mentor" && user.role === "teacher")
  ) {
    const targetLabel = user.role === "mentor" ? "Mentor" : "Teacher";
    res.status(403).json({
      error: `This email belongs to a ${targetLabel} account. Switch to ${targetLabel} sign in.`,
      code: "ROLE_MISMATCH",
      actualRole: user.role,
    });
    return;
  }
  try {
    seedStarterDataForUser(database, user);
    const sessionToken = createSession(database, user.id);
    writeSession(req, res, sessionToken);
    res.json({ user, sessionToken });
  } catch (error) {
    console.error("Login session setup failed:", error);
    res.status(500).json({ error: "Unable to open your workspace session. Please try again." });
  }
});

app.get("/api/bansay/auth/me", (req, res) => {
  const user = currentUser(database, req);
  if (!user) {
    res.status(401).json({ error: "Sign in is required." });
    return;
  }
  res.json({ user });
});

app.patch("/api/bansay/auth/preferences", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  try {
    const updated = updateUserPreferences(database, user.id, req.body);
    res.json({ user: updated });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to update preferences." });
  }
});

app.post("/api/bansay/auth/logout", (req, res) => {
  logout(database, req, res);
  res.status(204).end();
});

app.get("/api/bansay/workspace", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (!rehearsalDemoEnabled()) routeWaitingReviews(database);
  const sharedLacLibrary = listSharedLacPacks(database);
  const pilotTables = buildPilotTables(database);
  const cases =
    user.role === "teacher"
      ? listTeacherCases(database, user.id)
      : user.role === "mentor"
      ? listMentorReviewQueue(database, user.id)
      : [];
  const evidenceItems = user.role === "teacher" ? listTeacherEvidence(database, user.id) : [];

  res.json({
    user,
    cases,
    sharedLacLibrary,
    evidenceItems,
    rehearsalDemo: user.role === "teacher" && rehearsalDemoEnabled(),
    ...pilotTables,
  });
});

app.get("/api/bansay/lac-library/match", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const subject = String(req.query.subject || "Science") as SubjectName;
  const topic = String(req.query.topic || "");
  const match = findMatchingLacPack(database, subject, topic);
  res.json({ match });
});

app.post("/api/bansay/lac-library/:id/save", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const id = String(req.params.id);
  const existing = database
    .prepare("SELECT * FROM shared_lac_packs WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: "Verified LAC pack not found." });
    return;
  }
  database
    .prepare("UPDATE shared_lac_packs SET save_count = save_count + 1 WHERE id = ?")
    .run(id);
  res.json({ sharedLacLibrary: listSharedLacPacks(database) });
});

app.post("/api/bansay/generate-support", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  try {
    const {
      subject,
      gradeLevel,
      topic,
      teacherMajor,
      language,
      careerStage,
      classDate,
      startingMaterial,
      baselineFirst,
      baselineExplanation,
      usesLabEquipment,
      uploadedImagePreview,
      factSheet,
    } = req.body as {
      subject: SubjectName;
      gradeLevel: string;
      topic: string;
      teacherMajor?: string;
      language?: BansayLanguage;
      careerStage?: CareerStage;
      classDate?: string;
      startingMaterial?: string;
      baselineFirst?: boolean;
      baselineExplanation?: string;
      usesLabEquipment?: boolean;
      uploadedImagePreview?: string;
      factSheet?: unknown;
    };

    const chosenMajor = (teacherMajor || user.major || user.degree || "MAPEH").trim();
    const chosenLanguage: BansayLanguage =
      language === "fil" || language === "ceb" ? language : user.preferredLanguage || "en";
    const chosenStage: CareerStage = ["1", "2", "3", "4"].includes(String(careerStage))
      ? (String(careerStage) as CareerStage)
      : user.careerStage || "2";
    const chosenDate = classDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

    if (!SUPPORTED_PACK_SUBJECTS.has(subject) || !topic?.trim() || !chosenMajor) {
      res.status(400).json({ error: "Subject, lesson topic, and teacher college major are required." });
      return;
    }

    const daysUntilClass = computeDaysUntil(chosenDate);
    const matchedLac = daysUntilClass < 3 ? findMatchingLacPack(database, subject, topic) : null;

    const generated = await generateValidatedConceptPack({
      subject,
      gradeLevel: gradeLevel || "Grade 7",
      topic: topic.trim(),
      teacherMajor: chosenMajor,
      teacherDegree: user.degree || "",
      language: chosenLanguage,
      careerStage: chosenStage,
      usesLabEquipment: Boolean(usesLabEquipment),
      customFactSheetInput: factSheet,
      cache: {
        get: (key) => getCachedConceptPack(database, key),
        set: (key, factSheetId, pack) => saveCachedConceptPack(database, key, factSheetId, pack),
        delete: (key) => deleteCachedConceptPack(database, key),
      },
    });

    const createdCase = createLessonCaseRecord(database, user, {
      subject,
      gradeLevel: gradeLevel || "Grade 7",
      topic: topic.trim(),
      teacherMajor: chosenMajor,
      classDate: chosenDate,
      language: chosenLanguage,
      careerStage: chosenStage,
      startingMaterial: startingMaterial || "",
      uploadedImagePreview,
      baselineFirst: Boolean(baselineFirst),
      baselineExplanation: (baselineExplanation || "").trim(),
      submissionFormat: user.lowDataMode ? "offline-fallback" : "live-ai",
      usesLabEquipment: Boolean(usesLabEquipment),
      packStatus: "ai-draft",
      matchedLacPackId: matchedLac?.id || null,
      support: generated.support,
    });

    res.json({
      caseRecord: createdCase,
      matchedLacPack: matchedLac,
      cacheHit: generated.cacheHit,
      ...generated.support,
    });
  } catch (err) {
    const { status, message } = extractApiError(err);
    res.status(status).json({ error: message });
  }
});

app.patch("/api/bansay/cases/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const owned = getOwnedLessonCase(database, String(req.params.id), user.id);
  if (!owned) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }

  const data = req.body as Partial<{
    baselineExplanation: string;
    diagnosticCompleted: boolean;
    selfCheckScore: number;
    postClassReflection: string;
    cachedOffline: boolean;
    submissionFormat: "live-ai" | "offline-fallback";
  }>;

  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE lesson_sessions
       SET baseline_explanation = COALESCE(?, baseline_explanation),
           diagnostic_completed = COALESCE(?, diagnostic_completed),
           self_check_score = COALESCE(?, self_check_score),
           post_class_reflection = COALESCE(?, post_class_reflection),
           cached_offline = COALESCE(?, cached_offline),
           submission_format = COALESCE(?, submission_format),
           updated_at = ?
       WHERE id = ? AND teacher_id = ?`
    )
    .run(
      typeof data.baselineExplanation === "string" ? data.baselineExplanation.trim().slice(0, 2000) : null,
      typeof data.diagnosticCompleted === "boolean" ? (data.diagnosticCompleted ? 1 : 0) : null,
      typeof data.selfCheckScore === "number" ? Math.max(0, Math.min(3, Math.round(data.selfCheckScore))) : null,
      typeof data.postClassReflection === "string" ? data.postClassReflection.trim().slice(0, 2000) : null,
      typeof data.cachedOffline === "boolean" ? (data.cachedOffline ? 1 : 0) : null,
      data.submissionFormat || null,
      now,
      owned.id,
      user.id
    );

  res.json({ caseRecord: getOwnedLessonCase(database, owned.id, user.id) });
});

app.post("/api/bansay/cases/:id/media", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const owned = getOwnedLessonCase(database, String(req.params.id), user.id);
  if (!owned) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }

  try {
    const { tier, step, consentConfirmed, noStudentFacesConfirmed, label, attachment } = req.body as {
      tier: MediaTier;
      step: 2 | 4 | 7;
      consentConfirmed: boolean;
      noStudentFacesConfirmed: boolean;
      label: string;
      attachment?: { type?: unknown; base64?: unknown };
    };

    if (tier === "cot-video" && process.env.VITE_BANSAY_PHASE_2 !== "true") {
      res.status(403).json({ error: "Classroom clips are unavailable." });
      return;
    }

    const accepted = tier === "voice-note"
      ? ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/x-m4a", "audio/aac"]
      : tier === "cot-video" ? ["video/mp4", "video/webm", "video/quicktime"] : [];
    let content: Buffer | undefined;
    let contentType: string | undefined;
    if (accepted.length) {
      if (rehearsalDemoEnabled() || !attachment || typeof attachment.type !== "string" || !accepted.includes(attachment.type) ||
          typeof attachment.base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.base64) ||
          attachment.base64.length > Math.ceil(5 * 1024 * 1024 / 3) * 4) {
        throw new Error("Choose a supported audio or video file up to 5 MB outside Demo mode.");
      }
      content = Buffer.from(attachment.base64, "base64");
      if (!content.length || content.length > 5 * 1024 * 1024) throw new Error("Choose a file up to 5 MB.");
      contentType = attachment.type;
    }
    const asset = database.transaction(() => {
      const record = addMediaMetadataRecord(database, owned.id, user.id, {
      tier,
      step: step === 2 || step === 7 ? step : 4,
      consentConfirmed: Boolean(consentConfirmed),
      noStudentFacesConfirmed: Boolean(noStudentFacesConfirmed),
      label: label || tier,
      });
      if (content) database.prepare("UPDATE media_assets SET content = ?, content_type = ? WHERE id = ?").run(content, contentType, record.id);
      return record;
    })();

    res.status(201).json({ asset, caseRecord: getOwnedLessonCase(database, owned.id, user.id) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid media metadata." });
  }
});

app.delete("/api/bansay/cases/:id/media/:mediaId", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const owned = getOwnedLessonCase(database, String(req.params.id), user.id);
  if (!owned) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }
  database
    .prepare("UPDATE media_assets SET status = 'purged', expires_at = ?, content = NULL, content_type = NULL WHERE id = ? AND session_id = ? AND owner_id = ?")
    .run(new Date().toISOString(), String(req.params.mediaId), owned.id, user.id);
  res.json({ caseRecord: getOwnedLessonCase(database, owned.id, user.id) });
});

app.get("/api/bansay/cases/:id/media/:mediaId", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const caseId = String(req.params.id);
  const allowed = user.role === "mentor" ? getAnySubmittedLessonCase(database, caseId, user.id) : getOwnedLessonCase(database, caseId, user.id);
  if (!allowed?.mediaAssets.some((asset) => asset.id === req.params.mediaId && asset.hasContent && asset.status !== "purged")) {
    res.sendStatus(404);
    return;
  }
  const media = database.prepare("SELECT content, content_type FROM media_assets WHERE id = ? AND session_id = ? AND expires_at > ?")
    .get(String(req.params.mediaId), caseId, new Date().toISOString()) as { content: Buffer; content_type: string } | undefined;
  if (!media?.content) {
    res.sendStatus(404);
    return;
  }
  res.set({ "Content-Type": media.content_type, "Content-Disposition": "attachment", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.send(media.content);
});

async function learnerReply({
  lesson, user, studentName, language, turn, round, teacherMessage, scripted, finish = false,
}: {
  lesson: LessonCase;
  user: AuthUserProfile;
  studentName: string;
  language: BansayLanguage;
  turn: number;
  round: RehearsalMessage[];
  teacherMessage?: string;
  scripted?: boolean;
  finish?: boolean;
}) {
  const opening = !finish && turn === 0;
  let closing: RehearsalMessage["closing"] = finish ? "finished" : turn >= REHEARSAL_LIMIT ? "turn-limit" : undefined;
  let reply = closing ? scriptedClosing(language) : scriptedLearnerReply(lesson, language, turn);
  let isScripted = true;

  // Closing is application-controlled so the fifth teacher turn always ends
  // with the localized thank-you, regardless of the teacher's answer or model state.
  if (closing) {
    return { reply: closingLearnerMessage(reply, language, user.displayName), isScripted, closing };
  }

  if (!scripted && !isDemoMode()) {
    try {
      const output = await generateOpenRouterJson<{ reply: string; understood: boolean }>({
        name: "simulated_learner_reply",
        modelRole: "rehearsal",
        schema: {
          type: "object",
          properties: { reply: { type: "string" }, understood: { type: "boolean" } },
          required: ["reply", "understood"],
          additionalProperties: false,
        },
        ...learnerModelRequest({
          lesson, gradeLabel: rehearsalGradeLabel(lesson.gradeLevel), studentName,
          language, turn, round, teacherMessage, teacherName: user.displayName, finish,
        }),
      });
      const rawReply = output.reply?.trim();
      const candidate = rawReply && withoutOpeningGreeting(rawReply);
      const understood = turn >= 2 && output.understood === true;
      const questions = candidate?.match(/\?/g)?.length ?? 0;
      if (candidate && rawReply.length <= MAX_REHEARSAL_REPLY_LENGTH &&
          questions === (closing || understood ? 0 : 1) &&
          !containsTopicTitle(candidate, lesson.topic) && !containsContactInfo(candidate) &&
          !/system prompt|as an ai|you (passed|failed)|well done|great job/i.test(candidate) &&
          (opening || !round.some((message) => message.sender === "student" && withoutOpeningGreeting(message.text) === candidate))) {
        reply = candidate;
        isScripted = false;
        if (understood && !finish) closing = "understood";
      }
    } catch {
      // The script also works when the provider is unavailable.
    }
  }

  if (opening) reply = openingLearnerMessage(reply, user.displayName);
  return { reply, isScripted, closing };
}

app.post("/api/bansay/rehearse", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { caseId, requestId, teacherMessage, expectedCount, scripted, restart, language, studentName: proposedName } = req.body;
  if (typeof caseId !== "string" || typeof requestId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(requestId) ||
      !["en", "fil", "ceb"].includes(language) ||
      !Number.isInteger(expectedCount) ||
      (teacherMessage !== undefined && (typeof teacherMessage !== "string" ||
        !teacherMessage.trim() || teacherMessage.length > 2000 || containsContactInfo(teacherMessage)))) {
    res.status(400).json({ error: "Use a response under 2,000 characters without contact details." });
    return;
  }

  const lesson = getOwnedLessonCase(database, caseId, user.id);
  if (!lesson) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }
  const messages = lesson.rehearsalMessages;
  const opening = teacherMessage === undefined;
  const replyId = `learner-${requestId}`;
  const snapshot = () => ({ caseRecord: getOwnedLessonCase(database, caseId, user.id) });
  if (messages.some((message) => message.id === replyId)) {
    res.json(snapshot());
    return;
  }
  const round = currentRehearsal(messages);
  if (opening && !restart && (round[0]?.opening || round.length > 1)) {
    res.json(snapshot());
    return;
  }
  const completedTurns = round.filter((message) => message.sender === "teacher").length;
  if (messages.length !== expectedCount ||
      (!opening && (!round.length || (round.at(-1)?.closing || round.at(-1)?.sharedWithMentor) || completedTurns >= REHEARSAL_LIMIT)) ||
      (opening && restart && !round.at(-1)?.closing && !round.at(-1)?.sharedWithMentor && completedTurns < REHEARSAL_LIMIT)) {
    res.status(409).json({ error: "This rehearsal changed. Reopen the conversation before sending again." });
    return;
  }

  const mostRecentName = () => (database.prepare(
    "SELECT t.student_name FROM rehearsal_turns t JOIN lesson_sessions s ON s.id = t.session_id WHERE s.teacher_id = ? AND t.student_name IS NOT NULL ORDER BY t.rowid DESC LIMIT 1"
  ).get(user.id) as { student_name: string } | undefined)?.student_name;
  const previousName = opening ? mostRecentName() : undefined;
  const studentName = opening
    ? scripted === true && isStudentName(proposedName) && proposedName !== previousName
      ? proposedName
      : pickStudentName(previousName)
    : rehearsalStudentName(round) ?? pickStudentName();
  const { reply, isScripted, closing } = await learnerReply({
    lesson, user, studentName, language, turn: opening ? 0 : completedTurns + 1,
    round, teacherMessage: teacherMessage?.trim(), scripted,
  });

  const saved = database.transaction(() => {
    const latest = getOwnedLessonCase(database, caseId, user.id)?.rehearsalMessages ?? [];
    if (latest.some((message) => message.id === replyId)) return true;
    if (latest.length !== expectedCount || latest.at(-1)?.id !== messages.at(-1)?.id ||
        (opening && mostRecentName() === studentName)) return false;
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const insert = database.prepare(
      "INSERT INTO rehearsal_turns (id, session_id, turn_index, sender, text, attachment_type, timestamp_label, created_at, is_opening, is_scripted, closing_reason, student_name) VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?, ?, ?, ?)"
    );
    const replacesSeed = opening && !restart && messages.length === 1;
    let index = messages.length;
    if (replacesSeed) {
      database.prepare("DELETE FROM rehearsal_turns WHERE id = ?").run(messages[0].id);
      index = 0;
    }
    if (!opening) {
      insert.run(`teacher-${requestId}`, caseId, index++, "teacher", teacherMessage.trim(), timestamp, now.toISOString(), 0, 0, null, null);
    }
    insert.run(replyId, caseId, index, "student", reply, timestamp, now.toISOString(), Number(opening), Number(isScripted), closing ?? null, opening ? studentName : null);
    database.prepare("UPDATE lesson_sessions SET updated_at = ? WHERE id = ?").run(now.toISOString(), caseId);
    return true;
  })();
  if (!saved) {
    res.status(409).json({ error: "This rehearsal changed in another window. Reopen it to continue." });
    return;
  }
  res.json(snapshot());
});

app.post("/api/bansay/cases/:id/submit-review", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (rehearsalDemoEnabled() && user.role === "teacher") {
    res.status(409).json({ error: "Demo reviews run locally in your browser." });
    return;
  }
  const owned = getOwnedLessonCase(database, String(req.params.id), user.id);
  if (!owned) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }

  const round = currentRehearsal(owned.rehearsalMessages);
  const lastMessage = round.at(-1);
  if (!lastMessage || !round.some((message) => message.sender === "teacher")) {
    res.status(409).json({ error: "Complete a learner exchange before sending it to your mentor." });
    return;
  }
  if (lastMessage.sharedWithMentor) {
    res.json({ caseRecord: owned });
    return;
  }
  const language = user.preferredLanguage;
  const closingReply = lastMessage.closing ? undefined : await learnerReply({
    lesson: owned, user, studentName: rehearsalStudentName(round) ?? pickStudentName(),
    language, turn: round.filter((message) => message.sender === "teacher").length, round, finish: true,
  });
  const attachmentIds = Array.isArray(req.body?.attachmentIds) ? req.body.attachmentIds.filter((id: unknown): id is string => typeof id === "string") : [];
  const now = new Date().toISOString();

  const submitted = database.transaction(() => {
    const latest = getOwnedLessonCase(database, owned.id, user.id)?.rehearsalMessages.at(-1);
    if (latest?.id !== lastMessage.id) return latest?.sharedWithMentor === true;
    if (latest.sharedWithMentor) return true;
    let submissionTurnId = lastMessage.id;
    if (closingReply) {
      submissionTurnId = `msg-${crypto.randomUUID()}`;
      database.prepare(
        "INSERT INTO rehearsal_turns (id, session_id, turn_index, sender, text, attachment_type, timestamp_label, created_at, is_scripted, closing_reason, shared_with_mentor) VALUES (?, ?, ?, 'student', ?, 'text', ?, ?, ?, 'finished', 1)"
      ).run(
        submissionTurnId, owned.id, owned.rehearsalMessages.length, closingReply.reply,
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), now, Number(closingReply.isScripted),
      );
    } else {
      database.prepare("UPDATE rehearsal_turns SET shared_with_mentor = 1 WHERE id = ?").run(lastMessage.id);
    }
    database
      .prepare(
        `UPDATE mentor_reviews
         SET mentor_name = '', mentor_affiliation = '', backup_mentor_name = '', reviewed_at = ?, focused_gap = '', teaching_move = '', quick_refresher = '', mastered_skill = '', practice_skill = '',
             status = 'pending', review_queue_lane = ?, submitted_for_review = 1
         WHERE session_id = ?`
      )
      .run(now, owned.leadTimeTier, owned.id);
    database.prepare("UPDATE lesson_sessions SET updated_at = ?, mentor_id = NULL, backup_mentor_id = NULL WHERE id = ?").run(now, owned.id);
    const share = database.prepare("UPDATE media_assets SET review_turn_id = ? WHERE id = ? AND session_id = ? AND owner_id = ? AND consent_confirmed = 1 AND content IS NOT NULL AND review_turn_id IS NULL AND status <> 'purged' AND expires_at > ?");
    for (const id of attachmentIds) share.run(submissionTurnId, id, owned.id, user.id, now);
    assignReviewMentor(database, owned.id, owned.subject);
    return true;
  })();
  if (!submitted) {
    res.status(409).json({ error: "This rehearsal changed in another window. Try sending it again." });
    return;
  }

  res.json({ caseRecord: getOwnedLessonCase(database, owned.id, user.id) });
});

app.post("/api/bansay/cases/:id/sample-mentor-response", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (user.role !== "teacher") {
    res.status(403).json({ error: "Sample mentor responses are available in the teacher rehearsal." });
    return;
  }
  const lesson = getOwnedLessonCase(database, String(req.params.id), user.id);
  if (!lesson) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }

  const transcript = Array.isArray(req.body?.transcript) ? req.body.transcript : lesson.rehearsalMessages;
  const teacherWords = transcript
    .filter((message: unknown): message is { sender: string; text: string } => Boolean(
      message && typeof message === "object" && "sender" in message && "text" in message &&
      (message as { sender?: unknown }).sender === "teacher" && typeof (message as { text?: unknown }).text === "string"
    ))
    .map((message: { text: string }) => message.text.trim().slice(0, 1000))
    .filter(Boolean)
    .slice(-5);
  if (!teacherWords.length) {
    res.status(400).json({ error: "A teacher response is needed to generate sample feedback." });
    return;
  }

  try {
    const response = await generateOpenRouterJson({
      name: "sample_mentor_response",
      modelRole: "rehearsal",
      instructions: "Write a supportive sample mentor response for a teacher rehearsal. It is AI-generated demo feedback, never claim to be a real person or verified curriculum material. Return only JSON matching the schema. Do not include scores, grades, rankings, pass/fail language, URLs, curriculum codes, or invented facts. Do not include personal data.",
      input: `Subject: ${lesson.subject}\nGrade: ${lesson.gradeLevel}\nTopic: ${lesson.topic}\nLanguage: ${languageName(user.preferredLanguage)}\nConcept basis: ${lesson.support.bigIdea.summary}\nKnown misconceptions: ${JSON.stringify(lesson.support.validatedPack?.misconceptions.items ?? lesson.support.misconceptionAlerts)}\nTeacher's own words from the submitted rehearsal:\n${teacherWords.map((line, index) => `${index + 1}. ${line}`).join("\n")}\n\nCreate concise feedback for these fields: focusedGap (one careful correction tied to the supplied concept basis), teachingMove (one useful next step), quickRefresher (a short reminder supported by the concept basis, or empty), masteredSkill (one specific thing that worked, referring to the teacher's wording), practiceSkill (one short area to keep practicing). Use only the supplied context for content claims. Do not score or judge the teacher.`,
      schema: MENTOR_FEEDBACK_SCHEMA,
    });
    res.json({ response });
  } catch (error) {
    const { status, message } = extractApiError(error);
    res.status(status).json({ error: message });
  }
});

app.post("/api/bansay/cases/:id/fresh-case", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const owned = getOwnedLessonCase(database, String(req.params.id), user.id);
  if (!owned) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }

  const { teacherRevision, freshCaseResponse } = req.body as {
    teacherRevision?: string;
    freshCaseResponse?: string;
  };
  if (!freshCaseResponse?.trim()) {
    res.status(400).json({ error: "Fresh-case response is required." });
    return;
  }

  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE lesson_sessions
       SET teacher_revision = ?, fresh_case_response = ?, fresh_case_status = 'submitted', updated_at = ?
       WHERE id = ? AND teacher_id = ?`
    )
    .run(
      (teacherRevision || "").trim().slice(0, 2000),
      freshCaseResponse.trim().slice(0, 2000),
      now,
      owned.id,
      user.id
    );

  res.json({ caseRecord: getOwnedLessonCase(database, owned.id, user.id) });
});

app.post("/api/bansay/mentor-assist", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (user.role !== "mentor") {
    res.status(403).json({ error: "Only subject mentors can generate mentor coaching drafts." });
    return;
  }
  try {
    const { subject, topic, teacherMajor, language, teacherResponse, freshCaseResponse } = req.body as {
      subject: string;
      topic: string;
      teacherMajor: string;
      language: string;
      teacherResponse: string;
      freshCaseResponse?: string;
    };
    if (!teacherResponse?.trim()) {
      res.status(400).json({ error: "Teacher rehearsal response is required to draft coaching feedback." });
      return;
    }
    if (isDemoMode()) {
      res.json(createDemoMentorFeedback(language));
      return;
    }

    const targetLang = languageName(language || "en");
    const prompt = `Subject: ${subject}
Topic: ${topic}
Teacher's Field Background: ${shortFieldName(teacherMajor || "General Education")}
Output Language: ${targetLang}

Teacher's Initial Rehearsal Explanation:
${teacherResponse}

${freshCaseResponse ? `Teacher's Independent Fresh-Case Response:\n${freshCaseResponse}` : ""}

Draft concise, encouraging, non-punitive specialist mentor feedback strictly in ${targetLang}:
- focusedGap: Identify ONE important conceptual or pedagogical gap (1-2 sentences).
- teachingMove: Suggest ONE practical teaching move the teacher can use immediately in tomorrow's class (1-2 sentences).
- quickRefresher: Optional brief content refresher if the explanation showed topic confusion, or empty string if accurate.
- masteredSkill: One short phrase naming what the teacher did well.
- practiceSkill: One short phrase naming what still needs practice.`;
    const parsed = await generateOpenRouterJson({
      name: "mentor_feedback",
      instructions:
        "Draft concise, encouraging, non-punitive specialist mentor feedback. Return only the schema-compliant JSON object in the requested language.",
      input: prompt,
      schema: MENTOR_FEEDBACK_SCHEMA,
      modelRole: "rehearsal",
    });
    res.json(parsed);
  } catch (err) {
    const { status, message } = extractApiError(err);
    if (status === 402 || status === 429 || status >= 500) {
      const { language } = req.body as { language: string };
      res.json({ ...createDemoMentorFeedback(language), providerFallback: true });
      return;
    }
    res.status(status).json({ error: message });
  }
});

app.post("/api/bansay/cases/:id/verify-pack", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (user.role !== "mentor") {
    res.status(403).json({ error: "Only subject mentors can verify Concept Packs." });
    return;
  }
  const caseRecord = getAnySubmittedLessonCase(database, String(req.params.id), user.id);
  if (!caseRecord) {
    res.status(404).json({ error: "Submitted case not found in mentor queue." });
    return;
  }

  const {
    bigIdeaSummary,
    bridgeExplanation,
    limitationNote,
    packAuditDurationSec,
    publishToLac,
  } = req.body as {
    bigIdeaSummary?: string;
    bridgeExplanation?: string;
    limitationNote?: string;
    packAuditDurationSec?: number;
    publishToLac?: boolean;
  };

  const packRow = database
    .prepare("SELECT * FROM concept_packs WHERE session_id = ?")
    .get(caseRecord.id) as { initial_json: string; current_json: string } | undefined;
  const initialPack = JSON.parse(packRow?.initial_json || JSON.stringify(caseRecord.support)) as GeneratedLessonSupport;
  const updatedLimitation = (limitationNote ?? caseRecord.support.specialtyBridge.limitationNote).trim();
  const updatedPack: GeneratedLessonSupport = {
    ...caseRecord.support,
    validatedPack: caseRecord.support.validatedPack
      ? {
          ...caseRecord.support.validatedPack,
          connect: {
            ...caseRecord.support.validatedPack.connect,
            where_comparison_stops: updatedLimitation,
          },
        }
      : undefined,
    bigIdea: {
      ...caseRecord.support.bigIdea,
      summary: (bigIdeaSummary ?? caseRecord.support.bigIdea.summary).trim(),
    },
    specialtyBridge: {
      ...caseRecord.support.specialtyBridge,
      explanation: (bridgeExplanation ?? caseRecord.support.specialtyBridge.explanation).trim(),
      limitationNote: updatedLimitation,
    },
  };

  const substantiveRewrite =
    updatedPack.bigIdea.summary !== initialPack.bigIdea.summary ||
    updatedPack.specialtyBridge.explanation !== initialPack.specialtyBridge.explanation;
  const now = new Date().toISOString();
  const auditSec = Math.max(15, Math.min(900, Math.round(Number(packAuditDurationSec || 110))));

  database.transaction(() => {
    database
      .prepare(
        `UPDATE concept_packs
         SET current_json = ?, substantive_rewrite = ?, verified_by = ?, verified_at = ?
         WHERE session_id = ?`
      )
      .run(JSON.stringify(updatedPack), substantiveRewrite ? 1 : 0, user.id, now, caseRecord.id);

    database
      .prepare("UPDATE lesson_sessions SET pack_status = 'mentor-verified', updated_at = ? WHERE id = ?")
      .run(now, caseRecord.id);

    database
      .prepare(
        `UPDATE mentor_reviews
         SET pack_audit_duration_sec = ?, pack_substantive_rewrite = ?, pack_verified_at = ?
         WHERE session_id = ?`
      )
      .run(auditSec, substantiveRewrite ? 1 : 0, now, caseRecord.id);

    if (publishToLac) {
      database
        .prepare(
          `INSERT INTO shared_lac_packs (
            id, subject_tag, subject, grade_level, title, summary,
            big_idea_summary, limitation_note, verified_explanation,
            improvised_setup, ppst_indicators_json, save_count, language, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .run(
          `lib-${crypto.randomUUID()}`,
          `${caseRecord.subject} ${caseRecord.gradeLevel.replace("Grade ", "")}`,
          caseRecord.subject,
          caseRecord.gradeLevel,
          caseRecord.topic,
          updatedPack.specialtyBridge.title,
          updatedPack.bigIdea.summary,
          updatedPack.specialtyBridge.limitationNote,
          updatedPack.specialtyBridge.explanation,
          `${updatedPack.improvisedActivity.title}: ${updatedPack.improvisedActivity.materials.join(", ")}`,
          JSON.stringify(updatedPack.bigIdea.ppstIndicators),
          caseRecord.language,
          now
        );
    }
  })();

  res.json({
    caseRecord: getAnySubmittedLessonCase(database, caseRecord.id, user.id),
    sharedLacLibrary: listSharedLacPacks(database),
    ...buildPilotTables(database),
  });
});

app.post("/api/bansay/cases/:id/review", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (user.role !== "mentor") {
    res.status(403).json({ error: "Only subject mentors can submit coaching reviews." });
    return;
  }
  const caseRecord = getAnySubmittedLessonCase(database, String(req.params.id), user.id);
  if (!caseRecord) {
    res.status(404).json({ error: "Submitted case not found in mentor queue." });
    return;
  }

  const {
    focusedGap,
    teachingMove,
    quickRefresher,
    masteredSkill,
    practiceSkill,
    transcriptReviewDurationSec,
  } = req.body as {
    focusedGap: string;
    teachingMove: string;
    quickRefresher?: string;
    masteredSkill?: string;
    practiceSkill?: string;
    transcriptReviewDurationSec?: number;
  };

  if (!focusedGap?.trim() || !teachingMove?.trim()) {
    res.status(400).json({ error: "Focused gap and practical teaching move are required." });
    return;
  }

  const nextStatus = caseRecord.freshCaseStatus === "submitted" ? "completed" : "returned";
  const nextFreshStatus =
    caseRecord.freshCaseStatus === "submitted"
      ? "verified"
      : caseRecord.freshCaseStatus === "locked"
      ? "ready"
      : caseRecord.freshCaseStatus;
  const reviewSec = Math.max(15, Math.min(900, Math.round(Number(transcriptReviewDurationSec || 210))));
  const now = new Date().toISOString();

  database.transaction(() => {
    database
      .prepare(
        `UPDATE mentor_reviews
         SET mentor_name = ?,
             reviewed_at = ?,
             focused_gap = ?,
             teaching_move = ?,
             quick_refresher = ?,
             mastered_skill = ?,
             practice_skill = ?,
             status = ?,
             transcript_review_duration_sec = ?
         WHERE session_id = ?`
      )
      .run(
        user.displayName,
        now,
        focusedGap.trim().slice(0, 1500),
        teachingMove.trim().slice(0, 1500),
        (quickRefresher || "").trim().slice(0, 1000),
        (masteredSkill || "Clear, supportive tone").trim().slice(0, 300),
        (practiceSkill || "Checking conceptual reasoning").trim().slice(0, 300),
        nextStatus,
        reviewSec,
        caseRecord.id
      );

    database
      .prepare("UPDATE lesson_sessions SET fresh_case_status = ?, updated_at = ? WHERE id = ?")
      .run(nextFreshStatus, now, caseRecord.id);
  })();

  res.json({
    caseRecord: getAnySubmittedLessonCase(database, caseRecord.id, user.id),
    ...buildPilotTables(database),
  });
});

app.post("/api/bansay/evidence", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const {
    title,
    subject,
    revisionUsed,
    classroomOutcome,
    evidenceType,
    colleagueObserved,
    hasPhotoAttachment,
    noStudentFacesConfirmed,
  } = req.body as {
    title: string;
    subject: string;
    revisionUsed: string;
    classroomOutcome?: string;
    evidenceType: ClassroomEvidenceItem["evidenceType"];
    colleagueObserved?: boolean;
    hasPhotoAttachment?: boolean;
    noStudentFacesConfirmed?: boolean;
  };

  if (!title?.trim() || !revisionUsed?.trim()) {
    res.status(400).json({ error: "Evidence title and revision used are required." });
    return;
  }
  if (hasPhotoAttachment && !noStudentFacesConfirmed) {
    res.status(400).json({ error: "Confirm that setup photos contain no student faces or personal learner data." });
    return;
  }

  const id = `ev-${crypto.randomUUID()}`;
  const date = new Date().toISOString().slice(0, 10);
  const verificationStatus: ClassroomEvidenceItem["verificationStatus"] = colleagueObserved
    ? "Colleague observed"
    : "Teacher logged";
  const photoNotice = hasPhotoAttachment
    ? "Tier 4 Private Vault photo (no learner faces; purged within 30 days of deletion/expiry)"
    : null;

  database
    .prepare(
      `INSERT INTO classroom_evidence (
        id, teacher_id, title, subject, date, revision_used, classroom_outcome,
        evidence_type, verification_status, photo_retention_notice, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      user.id,
      title.trim().slice(0, 160),
      (subject || "Lesson Implementation").trim().slice(0, 160),
      date,
      revisionUsed.trim().slice(0, 1000),
      (classroomOutcome || "Applied revised explanation during class discussion.").trim().slice(0, 1000),
      evidenceType || "Classroom Reflection",
      verificationStatus,
      photoNotice,
      new Date().toISOString()
    );

  res.status(201).json({ evidenceItems: listTeacherEvidence(database, user.id) });
});

app.post("/api/bansay/portfolio/export-log", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { exportType } = req.body as { exportType?: string };
  database
    .prepare(
      `INSERT INTO pilot_audit_logs (id, event_type, session_id, actor_role, payload_json, created_at)
       VALUES (?, 'teacher_custody_export', NULL, ?, ?, ?)`
    )
    .run(
      crypto.randomUUID(),
      user.role,
      JSON.stringify({
        exportType: exportType === "pmes-annex-a" ? "pmes-annex-a" : "cpd-summary",
        teacherCustodyOnly: true,
        strippedVoiceAndCotMedia: true,
      }),
      new Date().toISOString()
    );
  res.status(201).json({ ok: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.argv.includes("--preview")) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configLoader: "native",
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BANSAY server running on http://localhost:${PORT}`);
  });
}

startServer();
