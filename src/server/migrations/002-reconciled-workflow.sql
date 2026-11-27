ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'mentor', 'coordinator'));
ALTER TABLE users ADD COLUMN ui_language TEXT NOT NULL DEFAULT 'en' CHECK (ui_language IN ('en', 'fil', 'ceb'));
ALTER TABLE users ADD COLUMN low_data_mode INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN biological_sex TEXT NOT NULL DEFAULT 'prefer-not-to-say';

ALTER TABLE lesson_sessions ADD COLUMN teacher_name TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_sessions ADD COLUMN teacher_major TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_sessions ADD COLUMN ui_language TEXT NOT NULL DEFAULT 'en' CHECK (ui_language IN ('en', 'fil', 'ceb'));
ALTER TABLE lesson_sessions ADD COLUMN career_stage TEXT NOT NULL DEFAULT '2' CHECK (career_stage IN ('1', '2', '3', '4'));
ALTER TABLE lesson_sessions ADD COLUMN curriculum_framework TEXT NOT NULL DEFAULT 'MATATAG (K-9)';
ALTER TABLE lesson_sessions ADD COLUMN lead_time_tier TEXT NOT NULL DEFAULT 'standard-sla' CHECK (lead_time_tier IN ('standard-sla', 'best-effort'));
ALTER TABLE lesson_sessions ADD COLUMN days_until_class INTEGER NOT NULL DEFAULT 7;
ALTER TABLE lesson_sessions ADD COLUMN starting_material TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_sessions ADD COLUMN uploaded_image_preview TEXT;
ALTER TABLE lesson_sessions ADD COLUMN submission_format TEXT NOT NULL DEFAULT 'live-ai';
ALTER TABLE lesson_sessions ADD COLUMN uses_lab_equipment INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lesson_sessions ADD COLUMN diagnostic_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lesson_sessions ADD COLUMN self_check_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lesson_sessions ADD COLUMN matched_lac_pack_id TEXT;
ALTER TABLE lesson_sessions ADD COLUMN teacher_revision TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_sessions ADD COLUMN fresh_case_response TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_sessions ADD COLUMN fresh_case_status TEXT NOT NULL DEFAULT 'locked' CHECK (fresh_case_status IN ('locked', 'ready', 'submitted', 'verified'));
ALTER TABLE lesson_sessions ADD COLUMN post_class_reflection TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_sessions ADD COLUMN cached_offline INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS concept_packs (
  session_id TEXT PRIMARY KEY REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  initial_json TEXT NOT NULL,
  current_json TEXT NOT NULL,
  judge_report_json TEXT NOT NULL,
  substantive_rewrite INTEGER NOT NULL DEFAULT 0,
  verified_by TEXT,
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS rehearsal_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  turn_index INTEGER NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('student', 'teacher')),
  text TEXT NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'text',
  timestamp_label TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS rehearsal_turns_session ON rehearsal_turns(session_id, turn_index);

CREATE TABLE IF NOT EXISTS mentor_reviews (
  session_id TEXT PRIMARY KEY REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  mentor_name TEXT NOT NULL,
  mentor_affiliation TEXT NOT NULL,
  backup_mentor_name TEXT NOT NULL,
  languages_covered_json TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  focused_gap TEXT NOT NULL DEFAULT '',
  teaching_move TEXT NOT NULL DEFAULT '',
  quick_refresher TEXT NOT NULL DEFAULT '',
  mastered_skill TEXT NOT NULL DEFAULT '',
  practice_skill TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'returned', 'completed')),
  review_queue_lane TEXT NOT NULL DEFAULT 'standard-sla',
  submitted_for_review INTEGER NOT NULL DEFAULT 0,
  pack_audit_duration_sec INTEGER,
  transcript_review_duration_sec INTEGER,
  pack_substantive_rewrite INTEGER NOT NULL DEFAULT 0,
  pack_verified_at TEXT
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES lesson_sessions(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('local-webcam', 'cot-video', 'voice-note', 'setup-photo')),
  step INTEGER NOT NULL CHECK (step IN (2, 4, 7)),
  consent_confirmed INTEGER NOT NULL DEFAULT 0,
  no_student_faces_confirmed INTEGER NOT NULL DEFAULT 0,
  retention_days INTEGER NOT NULL,
  expires_at TEXT,
  portfolio_included INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('local-only', 'active', 'stripped-from-portfolio', 'purged')),
  label TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS media_assets_session ON media_assets(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS classroom_evidence (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  date TEXT NOT NULL,
  revision_used TEXT NOT NULL,
  classroom_outcome TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  photo_retention_notice TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS classroom_evidence_teacher ON classroom_evidence(teacher_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shared_lac_packs (
  id TEXT PRIMARY KEY,
  subject_tag TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('Science', 'Mathematics', 'English')),
  grade_level TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  big_idea_summary TEXT NOT NULL,
  limitation_note TEXT NOT NULL,
  verified_explanation TEXT NOT NULL,
  improvised_setup TEXT NOT NULL,
  ppst_indicators_json TEXT NOT NULL,
  save_count INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL CHECK (language IN ('en', 'fil', 'ceb')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pilot_audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT,
  actor_role TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
