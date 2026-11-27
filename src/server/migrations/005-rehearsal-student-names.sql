ALTER TABLE rehearsal_turns ADD COLUMN student_name TEXT;

CREATE INDEX rehearsal_student_name_history
  ON rehearsal_turns (created_at, turn_index)
  WHERE student_name IS NOT NULL;
