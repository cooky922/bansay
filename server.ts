import "dotenv/config";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateOpenRouterJson, generateOpenRouterText, hasOpenRouterProvider } from "./src/server/aiProviders.ts";
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
  getAnySubmittedLessonCase,
  getOwnedLessonCase,
  listMentorReviewQueue,
  listSharedLacPacks,
  listTeacherCases,
  listTeacherEvidence,
  mentorForSubject,
  seedStarterDataForUser,
} from "./src/server/bansayRepo.ts";
import { generateValidatedConceptPack, languageName } from "./src/server/conceptPackEngine.ts";
import { openDatabase } from "./src/server/db.ts";
import type {
  AuthUserProfile,
  BansayLanguage,
  CareerStage,
  ClassroomEvidenceItem,
  GeneratedLessonSupport,
  MediaTier,
  SubjectName,
} from "./src/types/bansay.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const database = openDatabase();

function extractApiError(err: unknown): { status: number; message: string } {
  const errorObj = err as { status?: number; message?: string };
  const status = typeof errorObj?.status === "number" ? errorObj.status : 500;
  const rawMessage = errorObj?.message || "Unexpected server error while contacting OpenRouter API.";
  return { status, message: rawMessage };
}

function isDemoMode(): boolean {
  return !hasOpenRouterProvider();
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

const REHEARSAL_LANGUAGES = new Set(["en", "fil", "ceb"]);
const REHEARSAL_SUBJECTS = new Set(["Science", "Mathematics", "English"]);
const MAX_REHEARSAL_HISTORY = 13;
const MAX_REHEARSAL_FOLLOW_UPS = 5;
const MAX_REHEARSAL_MESSAGE_LENGTH = 2_000;
const MAX_REHEARSAL_REPLY_LENGTH = 600;

type RehearsalTurn = { sender: "student" | "teacher"; text: string };

function normalizeRehearsalText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, " ").trim();
}

function validateRehearsalHistory(history: unknown): RehearsalTurn[] | null {
  if (!Array.isArray(history) || history.length < 1 || history.length > MAX_REHEARSAL_HISTORY) {
    return null;
  }
  const turns: RehearsalTurn[] = [];
  for (let index = 0; index < history.length; index += 1) {
    const turn = history[index] as { sender?: unknown; text?: unknown };
    const expectedSender = index % 2 === 0 ? "student" : "teacher";
    if (
      turn?.sender !== expectedSender ||
      typeof turn.text !== "string" ||
      !turn.text.trim() ||
      turn.text.trim().length > MAX_REHEARSAL_MESSAGE_LENGTH
    ) {
      return null;
    }
    turns.push({ sender: expectedSender, text: turn.text.trim() });
  }
  return turns;
}

function isUnsafeOrOffRoleStudentReply(reply: string): boolean {
  const normalized = normalizeRehearsalText(reply);
  return (
    !normalized ||
    normalized.includes("as an ai") ||
    normalized.includes("system prompt") ||
    normalized.includes("teacher score") ||
    normalized.includes("you passed") ||
    normalized.includes("you failed")
  );
}

function demoRehearsalReply({
  language,
  studentName,
  topic,
  teacherMessage,
  followUpCount,
}: {
  language: string;
  studentName: string;
  topic: string;
  teacherMessage: string;
  followUpCount: number;
}) {
  const understandsDissolving =
    /still.*sugar|dissolved|molecule|particle|spread|not.*disappear|hindi.*nawala|wala.*nawala|dili.*nawala/i.test(
      teacherMessage
    );
  const understandsFiltration =
    /strainer|filter|mesh|sand|cloth|salain|salaan|sal-a|panala/i.test(teacherMessage);
  const understandsInertia =
    /inertia|stay(?:s|ing)? (?:at )?(?:rest|still|in motion)|body (?:tries to )?stay|resist(?:s|ing)? change/i.test(
      teacherMessage
    );
  const topicIsSugar = /sugar|asukal|dissolv|solution|mixture/i.test(topic);
  const topicIsInertia = /inertia|newton|motion|jeepney|force/i.test(topic);
  const name = studentName || "Jessa";

  if (language === "fil") {
    if (topicIsInertia && understandsInertia) {
      return "Naiintindihan ko na po kung bakit nananatiling nasa dating galaw ang katawan ko. Handa na po akong magbigay ng sarili kong halimbawa.";
    }
    if (topicIsSugar && understandsDissolving && !understandsFiltration) {
      return `Salamat po, ${name} ito. Kung ang asukal ay nandoon pa rin, bakit nakakalusot ito sa salaan samantalang naiwan ang buhangin?`;
    }
    if (topicIsSugar && understandsDissolving && understandsFiltration) {
      return "Naiintindihan ko na po: hindi nawala ang asukal at mas maliit ito kaysa sa butas ng salaan. Paano natin mapapatunayang naroon pa rin ito?";
    }
    return `Naiintindihan ko ang halimbawa, pero alin ang nagbago at alin ang hindi nagbago sa ${topic}?`;
  }

  if (language === "ceb") {
    if (topicIsInertia && understandsInertia) {
      return "Nasabtan nako nganong magpabilin sa daang lihok ang akong lawas. Andam na ko mohatag og akong kaugalingong pananglitan.";
    }
    if (topicIsSugar && understandsDissolving && !understandsFiltration) {
      return `Salamat, si ${name} ni. Kung naa pa gihapon ang asukal, nganong makalusot man kini sa salaan apan mabilin ang balas?`;
    }
    if (topicIsSugar && understandsDissolving && understandsFiltration) {
      return "Nasabtan nako: wala mawala ang asukal ug mas gamay kini kaysa mga lungag sa salaan. Unsaon nato pagpamatuod nga naa pa kini?";
    }
    return `Nasabtan nako ang pananglitan, apan unsa man ang nausab ug unsa ang nagpabilin sa ${topic}?`;
  }

  if (topicIsSugar && understandsDissolving && !understandsFiltration) {
    return "Thanks. I understand that the sugar is still there. Why does it pass through the strainer while sand stays behind?";
  }
  if (topicIsSugar && understandsDissolving && understandsFiltration) {
    return "I understand that the sugar did not disappear and is smaller than the strainer spaces. How could we show that it is still in the water?";
  }
  if (topicIsInertia && understandsInertia) {
    return "I understand why my body keeps its earlier motion now. I am ready to give my own example.";
  }
  if (followUpCount > 0) {
    return `I hear the example, but I am still unsure about the reason. What evidence would show why ${topic} works that way?`;
  }
  return `I understand the example, but what changed and what stayed the same in ${topic}? How could we check that?`;
}

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
  const sharedLacLibrary = listSharedLacPacks(database);
  const pilotTables = buildPilotTables(database);
  const cases =
    user.role === "teacher"
      ? listTeacherCases(database, user.id)
      : user.role === "mentor"
      ? listMentorReviewQueue(database)
      : [];
  const evidenceItems = user.role === "teacher" ? listTeacherEvidence(database, user.id) : [];

  res.json({
    user,
    cases,
    sharedLacLibrary,
    evidenceItems,
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
      imageData,
      uploadedImagePreview,
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
      imageData?: { mimeType: string; data: string };
      uploadedImagePreview?: string;
    };

    const chosenMajor = (teacherMajor || user.major || user.degree || "MAPEH").trim();
    const chosenLanguage: BansayLanguage =
      language === "fil" || language === "ceb" ? language : user.preferredLanguage || "en";
    const chosenStage: CareerStage = ["1", "2", "3", "4"].includes(String(careerStage))
      ? (String(careerStage) as CareerStage)
      : user.careerStage || "2";
    const chosenDate = classDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

    if (!REHEARSAL_SUBJECTS.has(subject) || !topic?.trim() || !chosenMajor) {
      res.status(400).json({ error: "Subject, DepEd topic, and teacher college major are required." });
      return;
    }

    const daysUntilClass = computeDaysUntil(chosenDate);
    const matchedLac = daysUntilClass < 3 ? findMatchingLacPack(database, subject, topic) : null;

    const generated = await generateValidatedConceptPack({
      subject,
      gradeLevel: gradeLevel || "Grade 7",
      topic: topic.trim(),
      teacherMajor: chosenMajor,
      language: chosenLanguage,
      careerStage: chosenStage,
      startingMaterial,
      usesLabEquipment: Boolean(usesLabEquipment),
      imageData,
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
      demo: generated.demo,
      providerFallback: Boolean(generated.providerFallback),
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
    const { tier, step, consentConfirmed, noStudentFacesConfirmed, label } = req.body as {
      tier: MediaTier;
      step: 2 | 4 | 7;
      consentConfirmed: boolean;
      noStudentFacesConfirmed: boolean;
      label: string;
    };

    const asset = addMediaMetadataRecord(database, owned.id, user.id, {
      tier,
      step: step === 2 || step === 7 ? step : 4,
      consentConfirmed: Boolean(consentConfirmed),
      noStudentFacesConfirmed: Boolean(noStudentFacesConfirmed),
      label: label || tier,
    });

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
    .prepare("UPDATE media_assets SET status = 'purged', expires_at = ? WHERE id = ? AND session_id = ? AND owner_id = ?")
    .run(new Date().toISOString(), String(req.params.mediaId), owned.id, user.id);
  res.json({ caseRecord: getOwnedLessonCase(database, owned.id, user.id) });
});

app.post("/api/bansay/rehearse", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  try {
    const {
      caseId,
      subject,
      gradeLevel,
      topic,
      language,
      studentName,
      history,
      teacherMessage,
      attachmentType,
    } = req.body as {
      caseId?: string;
      subject: string;
      gradeLevel: string;
      topic: string;
      language: string;
      studentName: string;
      history: Array<{ sender: "student" | "teacher"; text: string }>;
      teacherMessage: string;
      attachmentType?: "text" | "voice-note" | "video-note" | "handwritten-photo";
    };

    const canonicalHistory = validateRehearsalHistory(history);
    const trimmedTeacherMessage = typeof teacherMessage === "string" ? teacherMessage.trim() : "";

    if (
      typeof subject !== "string" ||
      typeof language !== "string" ||
      typeof gradeLevel !== "string" ||
      typeof topic !== "string" ||
      typeof studentName !== "string" ||
      !REHEARSAL_SUBJECTS.has(subject) ||
      !REHEARSAL_LANGUAGES.has(language) ||
      !gradeLevel.trim() ||
      gradeLevel.length > 40 ||
      !topic.trim() ||
      topic.length > 300 ||
      !studentName.trim() ||
      studentName.length > 60 ||
      !trimmedTeacherMessage ||
      trimmedTeacherMessage.length > MAX_REHEARSAL_MESSAGE_LENGTH ||
      !canonicalHistory
    ) {
      res.status(400).json({ error: "The rehearsal request is incomplete or has an invalid conversation history." });
      return;
    }

    const ownedCase = caseId ? getOwnedLessonCase(database, caseId, user.id) : null;
    if (caseId && !ownedCase) {
      res.status(404).json({ error: "Lesson session not found." });
      return;
    }

    const followUpCount = canonicalHistory.filter((turn) => turn.sender === "student").length - 1;
    if (followUpCount >= MAX_REHEARSAL_FOLLOW_UPS) {
      res.json({ ended: true, reason: "turn-limit", reply: "", demo: isDemoMode() });
      return;
    }

    const persistTurns = (studentReplyText: string) => {
      if (!ownedCase) return;
      const now = new Date().toISOString();
      const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const baseIndex = ownedCase.rehearsalMessages.length;
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO rehearsal_turns (id, session_id, turn_index, sender, text, attachment_type, timestamp_label, created_at)
             VALUES (?, ?, ?, 'teacher', ?, ?, ?, ?)`
          )
          .run(
            `msg-${crypto.randomUUID()}`,
            ownedCase.id,
            baseIndex,
            trimmedTeacherMessage,
            attachmentType || "text",
            timeLabel,
            now
          );
        database
          .prepare(
            `INSERT INTO rehearsal_turns (id, session_id, turn_index, sender, text, attachment_type, timestamp_label, created_at)
             VALUES (?, ?, ?, 'student', ?, 'text', ?, ?)`
          )
          .run(
            `msg-${crypto.randomUUID()}`,
            ownedCase.id,
            baseIndex + 1,
            studentReplyText,
            timeLabel,
            now
          );
        database
          .prepare("UPDATE lesson_sessions SET updated_at = ? WHERE id = ?")
          .run(now, ownedCase.id);
      })();
    };

    if (isDemoMode()) {
      const reply = demoRehearsalReply({
        language,
        studentName,
        topic,
        teacherMessage: trimmedTeacherMessage,
        followUpCount,
      });
      persistTurns(reply);
      res.json({
        demo: true,
        state: followUpCount >= MAX_REHEARSAL_FOLLOW_UPS - 1 ? "turn-limit" : "probing",
        reply,
        caseRecord: ownedCase ? getOwnedLessonCase(database, ownedCase.id, user.id) : undefined,
      });
      return;
    }

    const targetLang = languageName(language || "en");
    const transcript = canonicalHistory
      .slice(-8)
      .map((m) => `${m.sender === "student" ? studentName : "Teacher"}: ${m.text}`)
      .join("\n");

    const instructions = `You are roleplaying as a real Filipino secondary school student (${studentName || "Jessa"}) in ${gradeLevel || "Grade 7"} in Iligan City during a teacher's lesson rehearsal.
Speak strictly in ${targetLang} in a natural, respectful classroom tone using 1 to 2 short conversational sentences. Match the vocabulary and background knowledge to ${gradeLevel}. Never supply the correct explanation, answer your own question, or act like a tutor/evaluator. Keep the reply under ${MAX_REHEARSAL_REPLY_LENGTH} characters.`;
    const input = `Trusted lesson context:
Subject: ${subject}
Grade: ${gradeLevel}
Topic: ${topic}
Language: ${targetLang}
Follow-up number: ${followUpCount + 1} of ${MAX_REHEARSAL_FOLLOW_UPS}

Canonical conversation:
${transcript}

<teacher-message>
${trimmedTeacherMessage}
</teacher-message>

Respond only as ${studentName}, the simulated learner.`;

    const reply = await generateOpenRouterText({ instructions, input });
    const trimmedReply = reply.trim();
    const hasRepeatedReply = canonicalHistory.some(
      (turn) => turn.sender === "student" && normalizeRehearsalText(turn.text) === normalizeRehearsalText(trimmedReply)
    );
    if (
      trimmedReply.length > MAX_REHEARSAL_REPLY_LENGTH ||
      isUnsafeOrOffRoleStudentReply(trimmedReply) ||
      hasRepeatedReply
    ) {
      res.status(502).json({ error: "The simulated learner response was not usable. Please try again." });
      return;
    }

    persistTurns(trimmedReply);
    res.json({
      reply: trimmedReply,
      state: followUpCount >= MAX_REHEARSAL_FOLLOW_UPS - 1 ? "turn-limit" : "probing",
      caseRecord: ownedCase ? getOwnedLessonCase(database, ownedCase.id, user.id) : undefined,
    });
  } catch (err) {
    const { status, message } = extractApiError(err);
    if (status === 402 || status === 429 || status >= 500) {
      const { caseId, language, studentName, topic, teacherMessage, history, attachmentType } = req.body as {
        caseId?: string;
        language: string;
        studentName: string;
        topic: string;
        teacherMessage: string;
        history: RehearsalTurn[];
        attachmentType?: "text" | "voice-note" | "video-note" | "handwritten-photo";
      };
      const followUpCount = Array.isArray(history) ? history.filter((turn) => turn.sender === "student").length - 1 : 0;
      const fallbackReply = demoRehearsalReply({ language, studentName, topic, teacherMessage, followUpCount });
      const owned = caseId ? getOwnedLessonCase(database, caseId, user.id) : null;
      if (owned) {
        const now = new Date().toISOString();
        const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const baseIndex = owned.rehearsalMessages.length;
        database.transaction(() => {
          database.prepare(
            `INSERT INTO rehearsal_turns (id, session_id, turn_index, sender, text, attachment_type, timestamp_label, created_at)
             VALUES (?, ?, ?, 'teacher', ?, ?, ?, ?)`
          ).run(`msg-${crypto.randomUUID()}`, owned.id, baseIndex, teacherMessage.trim(), attachmentType || "text", timeLabel, now);
          database.prepare(
            `INSERT INTO rehearsal_turns (id, session_id, turn_index, sender, text, attachment_type, timestamp_label, created_at)
             VALUES (?, ?, ?, 'student', ?, 'text', ?, ?)`
          ).run(`msg-${crypto.randomUUID()}`, owned.id, baseIndex + 1, fallbackReply, timeLabel, now);
          database.prepare("UPDATE lesson_sessions SET updated_at = ? WHERE id = ?").run(now, owned.id);
        })();
      }
      res.json({
        demo: true,
        providerFallback: true,
        state: followUpCount >= MAX_REHEARSAL_FOLLOW_UPS - 1 ? "turn-limit" : "probing",
        reply: fallbackReply,
        caseRecord: owned ? getOwnedLessonCase(database, owned.id, user.id) : undefined,
      });
      return;
    }
    res.status(status).json({ error: message });
  }
});

app.post("/api/bansay/cases/:id/submit-review", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const owned = getOwnedLessonCase(database, String(req.params.id), user.id);
  if (!owned) {
    res.status(404).json({ error: "Lesson session not found." });
    return;
  }

  const mentor = mentorForSubject(owned.subject);
  const queueLabel =
    owned.leadTimeTier === "standard-sla"
      ? "Submitted · Target within 2 school days"
      : "Submitted · Best-effort / Post-class verification queue";
  const now = new Date().toISOString();

  database.transaction(() => {
    database
      .prepare(
        `UPDATE mentor_reviews
         SET mentor_name = ?, mentor_affiliation = ?, reviewed_at = ?,
             status = 'pending', review_queue_lane = ?, submitted_for_review = 1
         WHERE session_id = ?`
      )
      .run(mentor.name, mentor.affiliation, queueLabel, owned.leadTimeTier, owned.id);
    database.prepare("UPDATE lesson_sessions SET updated_at = ? WHERE id = ?").run(now, owned.id);
  })();

  res.json({ caseRecord: getOwnedLessonCase(database, owned.id, user.id) });
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
Teacher's College Major: ${teacherMajor}
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
  const caseRecord = getAnySubmittedLessonCase(database, String(req.params.id));
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
  const updatedPack: GeneratedLessonSupport = {
    ...caseRecord.support,
    bigIdea: {
      ...caseRecord.support.bigIdea,
      summary: (bigIdeaSummary ?? caseRecord.support.bigIdea.summary).trim(),
    },
    specialtyBridge: {
      ...caseRecord.support.specialtyBridge,
      explanation: (bridgeExplanation ?? caseRecord.support.specialtyBridge.explanation).trim(),
      limitationNote: (limitationNote ?? caseRecord.support.specialtyBridge.limitationNote).trim(),
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
      .prepare("UPDATE lesson_sessions SET pack_status = 'mentor-verified', mentor_id = ?, updated_at = ? WHERE id = ?")
      .run(user.id, now, caseRecord.id);

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
    caseRecord: getAnySubmittedLessonCase(database, caseRecord.id),
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
  const caseRecord = getAnySubmittedLessonCase(database, String(req.params.id));
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
             reviewed_at = 'Returned just now',
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
      .prepare("UPDATE lesson_sessions SET fresh_case_status = ?, mentor_id = ?, updated_at = ? WHERE id = ?")
      .run(nextFreshStatus, user.id, now, caseRecord.id);
  })();

  res.json({
    caseRecord: getAnySubmittedLessonCase(database, caseRecord.id),
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
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
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
