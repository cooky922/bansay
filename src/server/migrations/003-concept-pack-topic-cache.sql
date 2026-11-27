CREATE TABLE IF NOT EXISTS concept_pack_topic_cache (
  cache_key TEXT PRIMARY KEY,
  fact_sheet_id TEXT NOT NULL,
  pack_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
