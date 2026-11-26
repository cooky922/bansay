CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  degree TEXT NOT NULL,
  major TEXT,
  school_division TEXT NOT NULL DEFAULT '',
  preferred_language TEXT NOT NULL CHECK (preferred_language IN ('en', 'fil')),
  career_stage TEXT NOT NULL DEFAULT '2' CHECK (career_stage IN ('1', '2', '3', '4')),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS lesson_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('Science', 'Mathematics', 'English')),
  language TEXT NOT NULL CHECK (language IN ('en', 'fil')),
  grade_level TEXT,
  topic TEXT,
  class_date TEXT,
  baseline_first INTEGER NOT NULL DEFAULT 0,
  baseline_explanation TEXT NOT NULL DEFAULT '',
  pack_status TEXT NOT NULL DEFAULT 'ai-draft' CHECK (pack_status IN ('ai-draft', 'mentor-verified')),
  mentor_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS lesson_sessions_teacher ON lesson_sessions(teacher_id, updated_at DESC);
