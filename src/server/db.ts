import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type BansayDatabase = Database.Database;

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(moduleDirectory, "migrations");

// Keep the default alongside the deployed app. This avoids a browser-sandboxed
// user-profile directory while still allowing production hosts to override it.
export function openDatabase(databasePath = process.env.BANSAY_DATABASE_PATH || path.join(process.cwd(), ".bansay", "data", "bansay.sqlite")): BansayDatabase {
  if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  if (databasePath !== ":memory:") database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.exec("CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set(database.prepare("SELECT filename FROM schema_migrations").all().map((row) => (row as { filename: string }).filename));
  for (const filename of fs.readdirSync(migrationsDirectory).filter((item) => item.endsWith(".sql")).sort()) {
    if (applied.has(filename)) continue;
    const migration = fs.readFileSync(path.join(migrationsDirectory, filename), "utf8");
    database.transaction(() => {
      database.exec(migration);
      database.prepare("INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)").run(filename, new Date().toISOString());
    })();
  }
  return database;
}
