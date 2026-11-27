ALTER TABLE lesson_sessions ADD COLUMN backup_mentor_id TEXT REFERENCES users(id);
ALTER TABLE media_assets ADD COLUMN content BLOB;
ALTER TABLE media_assets ADD COLUMN content_type TEXT;
ALTER TABLE media_assets ADD COLUMN review_turn_id TEXT;
