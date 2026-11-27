import type { BansayDatabase } from "./db.ts";
import type { SubjectName } from "../types/bansay.ts";

const specialties: Record<SubjectName, RegExp> = {
  Science: /\b(science|biology|chemistry|physics)\b/i,
  Mathematics: /\b(math|maths|mathematics|statistics)\b/i,
  English: /\b(english|literature)\b/i,
};

export function assignReviewMentor(db: BansayDatabase, caseId: string, subject: SubjectName) {
  const candidates = db.prepare(`
    SELECT u.id, u.display_name, u.school_division, u.major, u.degree, COUNT(m.session_id) AS pending
    FROM users u
    LEFT JOIN lesson_sessions s ON s.mentor_id = u.id
    LEFT JOIN mentor_reviews m ON m.session_id = s.id AND m.submitted_for_review = 1 AND m.status = 'pending'
    WHERE u.role = 'mentor' GROUP BY u.id ORDER BY pending, u.created_at, u.id
  `).all() as Array<{ id: string; display_name: string; school_division: string; major: string; degree: string }>;
  const [mentor, backup] = candidates.filter((candidate) => specialties[subject]?.test(` ${candidate.major ?? ""} ${candidate.degree} `));
  if (!mentor) return;
  const result = db.prepare("UPDATE lesson_sessions SET mentor_id = ?, backup_mentor_id = ? WHERE id = ? AND mentor_id IS NULL")
    .run(mentor.id, backup?.id ?? null, caseId);
  if (result.changes) db.prepare("UPDATE mentor_reviews SET mentor_name = ?, mentor_affiliation = ?, backup_mentor_name = ? WHERE session_id = ? AND submitted_for_review = 1")
    .run(mentor.display_name, mentor.school_division || mentor.major || mentor.degree, backup?.display_name ?? "", caseId);
}

export function routeWaitingReviews(db: BansayDatabase) {
  const waiting = db.prepare(`
    SELECT s.id, s.subject FROM lesson_sessions s JOIN mentor_reviews m ON m.session_id = s.id
    WHERE s.mentor_id IS NULL AND m.submitted_for_review = 1 AND m.status = 'pending'
    ORDER BY m.reviewed_at, s.id
  `).all() as Array<{ id: string; subject: SubjectName }>;
  if (waiting.length) db.transaction(() => {
    for (const lesson of waiting) assignReviewMentor(db, lesson.id, lesson.subject);
  })();
}
