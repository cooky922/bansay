import crypto from "crypto";
import {
  ENGINEERING_CONTROLS_TABLE,
  INITIAL_COHORT_SEATS,
  INITIAL_COMPETENCY_QUARTERS,
  INITIAL_EVIDENCE_ITEMS,
  INITIAL_CASES,
  INITIAL_PEER_LIBRARY,
  PILOT_BUDGET_ITEMS,
  PILOT_VALIDATION_METRICS_TABLE,
  UNIT_ECONOMICS_TABLE,
} from "../data/bansayData.ts";
import type {
  AuthUserProfile,
  BansayLanguage,
  CareerStage,
  ClassroomEvidenceItem,
  CohortSeat,
  CompetencyQuarter,
  EngineeringControlMetric,
  GeneratedLessonSupport,
  LeadTimeTier,
  LessonCase,
  MediaAssetRecord,
  MediaTier,
  PeerLibraryItem,
  PilotBudgetRow,
  PilotValidationMetric,
  RehearsalMessage,
  SubjectName,
  UnitEconomicsRow,
  ValidatedConceptPack,
} from "../types/bansay.ts";
import type { BansayDatabase } from "./db.ts";

export function computeDaysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 7;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 7;
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function mentorForSubject(subject: SubjectName) {
  if (subject === "Mathematics") {
    return { name: "Lourdes Tan", affiliation: "MSU-IIT Mathematics Education" };
  }
  if (subject === "English") {
    return { name: "Grace Bautista", affiliation: "MSU-IIT English Education" };
  }
  return { name: "Ramon Villamor", affiliation: "MSU-IIT Science Education" };
}

export function ensureInitialSharedLacPacks(db: BansayDatabase) {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM shared_lac_packs").get() as { count: number };
  if (countRow.count > 0) return;
  const insert = db.prepare(
    `INSERT INTO shared_lac_packs (
      id, subject_tag, subject, grade_level, title, summary,
      big_idea_summary, limitation_note, verified_explanation,
      improvised_setup, ppst_indicators_json, save_count, language, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const now = new Date().toISOString();
  for (const item of INITIAL_PEER_LIBRARY) {
    insert.run(
      item.id,
      item.subjectTag,
      item.subject,
      item.gradeLevel,
      item.title,
      item.summary,
      item.bigIdeaSummary,
      item.limitationNote,
      item.verifiedExplanation,
      item.improvisedSetup,
      JSON.stringify(item.ppstIndicators),
      item.saveCount,
      item.language,
      now
    );
  }
}

export function listSharedLacPacks(db: BansayDatabase): PeerLibraryItem[] {
  ensureInitialSharedLacPacks(db);
  const rows = db
    .prepare("SELECT * FROM shared_lac_packs ORDER BY save_count DESC, created_at DESC")
    .all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    subjectTag: String(row.subject_tag),
    subject: row.subject as SubjectName,
    gradeLevel: String(row.grade_level),
    title: String(row.title),
    summary: String(row.summary),
    bigIdeaSummary: String(row.big_idea_summary),
    limitationNote: String(row.limitation_note),
    verifiedExplanation: String(row.verified_explanation),
    improvisedSetup: String(row.improvised_setup),
    ppstIndicators: JSON.parse(String(row.ppst_indicators_json || "[]")) as string[],
    saveCount: Number(row.save_count || 0),
    language: row.language as BansayLanguage,
  }));
}

export function findMatchingLacPack(
  db: BansayDatabase,
  subject: SubjectName,
  topic: string
): PeerLibraryItem | null {
  const packs = listSharedLacPacks(db);
  const normalizedTopic = topic.trim().toLowerCase();
  if (!normalizedTopic) return null;
  const exact = packs.find(
    (item) => item.subject === subject && item.title.toLowerCase() === normalizedTopic
  );
  if (exact) return exact;
  const tokens = normalizedTopic.split(/\s+/).filter((t) => t.length >= 4);
  return (
    packs.find(
      (item) =>
        item.subject === subject &&
        tokens.some(
          (tok) =>
            item.title.toLowerCase().includes(tok) || item.summary.toLowerCase().includes(tok)
        )
    ) || null
  );
}

export function purgeExpiredMedia(db: BansayDatabase) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE media_assets
     SET status = 'purged'
     WHERE status IN ('active', 'stripped-from-portfolio')
       AND expires_at IS NOT NULL
       AND expires_at <= ?`
  ).run(now);
}

function hydrateLessonCase(db: BansayDatabase, row: Record<string, unknown>): LessonCase {
  const sessionId = String(row.id);
  const packRow = db
    .prepare("SELECT * FROM concept_packs WHERE session_id = ?")
    .get(sessionId) as Record<string, unknown> | undefined;
  const turnRows = db
    .prepare("SELECT * FROM rehearsal_turns WHERE session_id = ? ORDER BY turn_index ASC")
    .all(sessionId) as Array<Record<string, unknown>>;
  const reviewRow = db
    .prepare("SELECT * FROM mentor_reviews WHERE session_id = ?")
    .get(sessionId) as Record<string, unknown> | undefined;
  const mediaRows = db
    .prepare("SELECT * FROM media_assets WHERE session_id = ? ORDER BY created_at DESC")
    .all(sessionId) as Array<Record<string, unknown>>;

  const support = packRow
    ? (JSON.parse(String(packRow.current_json)) as GeneratedLessonSupport)
    : INITIAL_CASES[0].support;

  const rehearsalMessages: RehearsalMessage[] = turnRows.map((turn) => ({
    id: String(turn.id),
    sender: turn.sender as "student" | "teacher",
    text: String(turn.text),
    timestamp: String(turn.timestamp_label),
    attachmentType: turn.attachment_type as RehearsalMessage["attachmentType"],
  }));

  const mediaAssets: MediaAssetRecord[] = mediaRows.map((m) => ({
    id: String(m.id),
    caseId: String(m.session_id),
    tier: m.tier as MediaTier,
    step: Number(m.step) as 2 | 4 | 7,
    consentConfirmed: Boolean(m.consent_confirmed),
    noStudentFacesConfirmed: Boolean(m.no_student_faces_confirmed),
    retentionDays: Number(m.retention_days) as 0 | 7 | 14 | 30,
    expiresAt: m.expires_at ? String(m.expires_at) : null,
    portfolioIncluded: Boolean(m.portfolio_included),
    status: m.status as MediaAssetRecord["status"],
    label: String(m.label),
    createdAt: String(m.created_at),
  }));

  return {
    id: sessionId,
    subject: row.subject as SubjectName,
    gradeLevel: String(row.grade_level || "Grade 7"),
    topic: String(row.topic || ""),
    teacherName: String(row.teacher_name || "Teacher"),
    teacherMajor: String(row.teacher_major || "MAPEH"),
    classDate: String(row.class_date || new Date().toISOString().slice(0, 10)),
    careerStage: (row.career_stage || "2") as CareerStage,
    submittedAt: String(row.created_at).slice(0, 10),
    language: (row.ui_language || row.language || "en") as BansayLanguage,
    startingMaterial: String(row.starting_material || ""),
    uploadedImagePreview: row.uploaded_image_preview ? String(row.uploaded_image_preview) : undefined,
    baselineFirst: Boolean(row.baseline_first),
    baselineExplanation: String(row.baseline_explanation || ""),
    submissionFormat: (row.submission_format || "live-ai") as "live-ai" | "offline-fallback",
    packStatus: (row.pack_status || "ai-draft") as "ai-draft" | "mentor-verified",
    leadTimeTier: (row.lead_time_tier || "standard-sla") as LeadTimeTier,
    daysUntilClass: Number(row.days_until_class ?? 7),
    usesLabEquipment: Boolean(row.uses_lab_equipment),
    diagnosticCompleted: Boolean(row.diagnostic_completed),
    selfCheckScore: Number(row.self_check_score || 0),
    matchedLacPackId: row.matched_lac_pack_id ? String(row.matched_lac_pack_id) : null,
    postClassReflection: String(row.post_class_reflection || ""),
    support,
    rehearsalMessages,
    mediaAssets,
    mentorReview: reviewRow
      ? {
          mentorName: String(reviewRow.mentor_name),
          mentorAffiliation: String(reviewRow.mentor_affiliation),
          backupMentorName: String(reviewRow.backup_mentor_name),
          languagesCovered: JSON.parse(String(reviewRow.languages_covered_json || '["en"]')) as BansayLanguage[],
          reviewedAt: String(reviewRow.reviewed_at),
          focusedGap: String(reviewRow.focused_gap || ""),
          teachingMove: String(reviewRow.teaching_move || ""),
          quickRefresher: reviewRow.quick_refresher ? String(reviewRow.quick_refresher) : "",
          masteredSkill: String(reviewRow.mastered_skill || ""),
          practiceSkill: String(reviewRow.practice_skill || ""),
          status: reviewRow.status as "pending" | "returned" | "completed",
          reviewQueueLane: (reviewRow.review_queue_lane || "standard-sla") as LeadTimeTier,
          packAuditDurationSec:
            reviewRow.pack_audit_duration_sec !== null && reviewRow.pack_audit_duration_sec !== undefined
              ? Number(reviewRow.pack_audit_duration_sec)
              : undefined,
          transcriptReviewDurationSec:
            reviewRow.transcript_review_duration_sec !== null &&
            reviewRow.transcript_review_duration_sec !== undefined
              ? Number(reviewRow.transcript_review_duration_sec)
              : undefined,
          packSubstantiveRewrite: Boolean(reviewRow.pack_substantive_rewrite),
          packVerifiedAt: reviewRow.pack_verified_at ? String(reviewRow.pack_verified_at) : undefined,
        }
      : INITIAL_CASES[0].mentorReview,
    teacherRevision: String(row.teacher_revision || ""),
    freshCaseResponse: String(row.fresh_case_response || ""),
    freshCaseStatus: (row.fresh_case_status || "locked") as LessonCase["freshCaseStatus"],
    cachedOffline: Boolean(row.cached_offline),
  };
}

export function createLessonCaseRecord(
  db: BansayDatabase,
  user: AuthUserProfile,
  params: {
    subject: SubjectName;
    gradeLevel: string;
    topic: string;
    teacherMajor: string;
    classDate: string;
    language: BansayLanguage;
    careerStage: CareerStage;
    startingMaterial: string;
    uploadedImagePreview?: string;
    baselineFirst: boolean;
    baselineExplanation: string;
    submissionFormat: "live-ai" | "offline-fallback";
    usesLabEquipment: boolean;
    packStatus: "ai-draft" | "mentor-verified";
    matchedLacPackId?: string | null;
    support: GeneratedLessonSupport;
  }
): LessonCase {
  const sessionId = `case-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const daysUntilClass = computeDaysUntil(params.classDate);
  const leadTimeTier: LeadTimeTier = daysUntilClass >= 3 ? "standard-sla" : "best-effort";
  const dbLang: "en" | "fil" = params.language === "fil" ? "fil" : "en";
  const mentor = mentorForSubject(params.subject);

  db.transaction(() => {
    db.prepare(
      `INSERT INTO lesson_sessions (
        id, teacher_id, subject, language, ui_language, grade_level, topic, class_date,
        baseline_first, baseline_explanation, pack_status, teacher_name, teacher_major,
        career_stage, curriculum_framework, lead_time_tier, days_until_class,
        starting_material, uploaded_image_preview, submission_format, uses_lab_equipment,
        diagnostic_completed, self_check_score, matched_lac_pack_id,
        fresh_case_status, cached_offline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'locked', 1, ?, ?)`
    ).run(
      sessionId,
      user.id,
      params.subject,
      dbLang,
      params.language,
      params.gradeLevel,
      params.topic,
      params.classDate,
      params.baselineFirst ? 1 : 0,
      params.baselineExplanation,
      params.packStatus,
      user.displayName,
      params.teacherMajor,
      params.careerStage,
      params.support.bigIdea.curriculumGrounding,
      leadTimeTier,
      daysUntilClass,
      params.startingMaterial,
      params.uploadedImagePreview || null,
      params.submissionFormat,
      params.usesLabEquipment ? 1 : 0,
      params.matchedLacPackId || null,
      now,
      now
    );

    const supportJson = JSON.stringify(params.support);
    db.prepare(
      `INSERT INTO concept_packs (
        session_id, initial_json, current_json, judge_report_json, substantive_rewrite
      ) VALUES (?, ?, ?, ?, 0)`
    ).run(sessionId, supportJson, supportJson, JSON.stringify(params.support.judgeReport));

    db.prepare(
      `INSERT INTO rehearsal_turns (
        id, session_id, turn_index, sender, text, attachment_type, timestamp_label, created_at
      ) VALUES (?, ?, 0, 'student', ?, 'text', ?, ?)`
    ).run(
      `msg-${crypto.randomUUID()}`,
      sessionId,
      params.support.simulatedStudentPrompt.openingQuestion,
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      now
    );

    db.prepare(
      `INSERT INTO mentor_reviews (
        session_id, mentor_name, mentor_affiliation, backup_mentor_name,
        languages_covered_json, reviewed_at, status, review_queue_lane, submitted_for_review
      ) VALUES (?, ?, ?, 'Elena Villanueva', ?, 'Pending rehearsal submission', 'pending', ?, 0)`
    ).run(
      sessionId,
      mentor.name,
      mentor.affiliation,
      JSON.stringify(["en", "fil", "ceb"]),
      leadTimeTier
    );

    db.prepare(
      `INSERT INTO pilot_audit_logs (id, event_type, session_id, actor_role, payload_json, created_at)
       VALUES (?, 'concept_pack_generated', ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      sessionId,
      user.role,
      JSON.stringify({
        judgePassed: params.support.judgeReport.passed,
        regenerationCount: params.support.judgeReport.regenerationCount,
        leadTimeTier,
        curriculumGrounding: params.support.bigIdea.curriculumGrounding,
      }),
      now
    );
  })();

  const row = db
    .prepare("SELECT * FROM lesson_sessions WHERE id = ?")
    .get(sessionId) as Record<string, unknown>;
  return hydrateLessonCase(db, row);
}

export function seedStarterDataForUser(db: BansayDatabase, _user: AuthUserProfile) {
  ensureInitialSharedLacPacks(db);
}

export function getCachedConceptPack(db: BansayDatabase, cacheKey: string): unknown | undefined {
  const row = db
    .prepare("SELECT pack_json FROM concept_pack_topic_cache WHERE cache_key = ?")
    .get(cacheKey) as { pack_json: string } | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(row.pack_json) as unknown;
  } catch {
    db.prepare("DELETE FROM concept_pack_topic_cache WHERE cache_key = ?").run(cacheKey);
    return undefined;
  }
}

export function saveCachedConceptPack(
  db: BansayDatabase,
  cacheKey: string,
  factSheetId: string,
  pack: ValidatedConceptPack
): void {
  db.prepare(
    `INSERT INTO concept_pack_topic_cache (cache_key, fact_sheet_id, pack_json, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET pack_json = excluded.pack_json, created_at = excluded.created_at`
  ).run(cacheKey, factSheetId, JSON.stringify(pack), new Date().toISOString());
}

export function deleteCachedConceptPack(db: BansayDatabase, cacheKey: string): void {
  db.prepare("DELETE FROM concept_pack_topic_cache WHERE cache_key = ?").run(cacheKey);
}

export function listTeacherCases(db: BansayDatabase, teacherId: string): LessonCase[] {
  purgeExpiredMedia(db);
  const rows = db
    .prepare("SELECT * FROM lesson_sessions WHERE teacher_id = ? ORDER BY updated_at DESC")
    .all(teacherId) as Array<Record<string, unknown>>;
  return rows.map((row) => hydrateLessonCase(db, row));
}

export function listMentorReviewQueue(db: BansayDatabase): LessonCase[] {
  purgeExpiredMedia(db);
  const rows = db
    .prepare(
      `SELECT s.*
       FROM lesson_sessions s
       JOIN mentor_reviews m ON m.session_id = s.id
       WHERE m.submitted_for_review = 1
       ORDER BY CASE WHEN s.lead_time_tier = 'standard-sla' THEN 0 ELSE 1 END,
                s.class_date ASC,
                s.updated_at DESC`
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map((row) => hydrateLessonCase(db, row));
}

export function getOwnedLessonCase(
  db: BansayDatabase,
  sessionId: string,
  teacherId: string
): LessonCase | null {
  const row = db
    .prepare("SELECT * FROM lesson_sessions WHERE id = ? AND teacher_id = ?")
    .get(sessionId, teacherId) as Record<string, unknown> | undefined;
  return row ? hydrateLessonCase(db, row) : null;
}

export function getAnySubmittedLessonCase(
  db: BansayDatabase,
  sessionId: string
): LessonCase | null {
  const row = db
    .prepare(
      `SELECT s.*
       FROM lesson_sessions s
       JOIN mentor_reviews m ON m.session_id = s.id
       WHERE s.id = ? AND m.submitted_for_review = 1`
    )
    .get(sessionId) as Record<string, unknown> | undefined;
  return row ? hydrateLessonCase(db, row) : null;
}

export function listTeacherEvidence(
  db: BansayDatabase,
  teacherId: string
): ClassroomEvidenceItem[] {
  const rows = db
    .prepare("SELECT * FROM classroom_evidence WHERE teacher_id = ? ORDER BY created_at DESC")
    .all(teacherId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    subject: String(row.subject),
    date: String(row.date),
    revisionUsed: String(row.revision_used),
    classroomOutcome: String(row.classroom_outcome),
    evidenceType: row.evidence_type as ClassroomEvidenceItem["evidenceType"],
    verificationStatus: row.verification_status as ClassroomEvidenceItem["verificationStatus"],
    photoRetentionNotice: row.photo_retention_notice ? String(row.photo_retention_notice) : undefined,
  }));
}

export function addMediaMetadataRecord(
  db: BansayDatabase,
  sessionId: string,
  ownerId: string,
  input: {
    tier: MediaTier;
    step: 2 | 4 | 7;
    consentConfirmed: boolean;
    noStudentFacesConfirmed: boolean;
    label: string;
  }
): MediaAssetRecord {
  if (input.tier === "local-webcam") {
    throw new Error("Core rehearsal webcam video stays browser-local and is never uploaded.");
  }
  if (!input.consentConfirmed) {
    throw new Error("Explicit consent is required before recording media retention metadata.");
  }
  if ((input.tier === "cot-video" || input.tier === "setup-photo") && !input.noStudentFacesConfirmed) {
    throw new Error("Confirm that only the teacher or materials appear (no student faces).");
  }

  const retentionDays: 7 | 14 | 30 =
    input.tier === "cot-video" ? 7 : input.tier === "voice-note" ? 14 : 30;
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const portfolioIncluded = input.tier === "setup-photo";
  const status: MediaAssetRecord["status"] =
    input.tier === "cot-video" || input.tier === "voice-note"
      ? "stripped-from-portfolio"
      : "active";
  const id = `media-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO media_assets (
      id, session_id, owner_id, tier, step, consent_confirmed,
      no_student_faces_confirmed, retention_days, expires_at,
      portfolio_included, status, label, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    sessionId,
    ownerId,
    input.tier,
    input.step,
    input.noStudentFacesConfirmed ? 1 : 0,
    retentionDays,
    expiresAt,
    portfolioIncluded ? 1 : 0,
    status,
    input.label.slice(0, 160),
    now
  );

  return {
    id,
    caseId: sessionId,
    tier: input.tier,
    step: input.step,
    consentConfirmed: true,
    noStudentFacesConfirmed: input.noStudentFacesConfirmed,
    retentionDays,
    expiresAt,
    portfolioIncluded,
    status,
    label: input.label.slice(0, 160),
    createdAt: now,
  };
}

export function buildPilotTables(db: BansayDatabase): {
  cohortSeats: CohortSeat[];
  quarters: CompetencyQuarter[];
  engineeringControls: EngineeringControlMetric[];
  pilotMetrics: PilotValidationMetric[];
  pilotBudget: PilotBudgetRow[];
  unitEconomics: UnitEconomicsRow[];
  directMentorMinutesLogged: number;
} {
  const verifiedPacks = db
    .prepare("SELECT COUNT(*) as total, SUM(pack_substantive_rewrite) as rewrites FROM mentor_reviews WHERE pack_verified_at IS NOT NULL")
    .get() as { total: number; rewrites: number | null };
  const transcriptDurations = db
    .prepare("SELECT transcript_review_duration_sec FROM mentor_reviews WHERE transcript_review_duration_sec IS NOT NULL")
    .all() as Array<{ transcript_review_duration_sec: number }>;

  const liveRewriteRate =
    verifiedPacks.total > 0
      ? Math.round(((verifiedPacks.rewrites || 0) / verifiedPacks.total) * 100)
      : 12.5;
  const medianTranscriptMin = transcriptDurations.length
    ? (
        transcriptDurations
          .map((d) => d.transcript_review_duration_sec)
          .sort((a, b) => a - b)[Math.floor(transcriptDurations.length / 2)] / 60
      ).toFixed(1)
    : "3.6";
  const directMentorMinutesLogged = 160 + transcriptDurations.length * 4;

  const pilotMetrics = PILOT_VALIDATION_METRICS_TABLE.map((metric) => {
    if (metric.id === "met-1" && verifiedPacks.total > 0) {
      return {
        ...metric,
        currentValue: `${verifiedPacks.rewrites || 0} / ${verifiedPacks.total} (${liveRewriteRate}%)`,
        meetsThreshold: liveRewriteRate <= 20,
      };
    }
    if (metric.id === "met-3" && transcriptDurations.length > 0) {
      return {
        ...metric,
        currentValue: `${medianTranscriptMin} min median · ${transcriptDurations.length} logged`,
        meetsThreshold: Number(medianTranscriptMin) <= 4.0,
      };
    }
    return metric;
  });

  return {
    cohortSeats: INITIAL_COHORT_SEATS,
    quarters: INITIAL_COMPETENCY_QUARTERS,
    engineeringControls: ENGINEERING_CONTROLS_TABLE,
    pilotMetrics,
    pilotBudget: PILOT_BUDGET_ITEMS,
    unitEconomics: UNIT_ECONOMICS_TABLE,
    directMentorMinutesLogged,
  };
}
