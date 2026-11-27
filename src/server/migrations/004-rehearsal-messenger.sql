ALTER TABLE rehearsal_turns ADD COLUMN is_opening INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rehearsal_turns ADD COLUMN is_scripted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rehearsal_turns ADD COLUMN closing_reason TEXT;
ALTER TABLE rehearsal_turns ADD COLUMN shared_with_mentor INTEGER NOT NULL DEFAULT 0;
