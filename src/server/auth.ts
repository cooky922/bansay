import crypto from "crypto";
import type { Request, Response } from "express";
import type { BansayDatabase } from "./db.ts";

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

type UserRow = { id: string; email: string; display_name: string; degree: string; major: string | null; school_division: string; preferred_language: "en" | "fil"; career_stage: "1" | "2" | "3" | "4"; password_salt: string; password_hash: string; created_at: string };
export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  degree: string;
  major: string | null;
  schoolDivision: string;
  preferredLanguage: "en" | "fil";
  careerStage: "1" | "2" | "3" | "4";
  created_at: string;
};

function profile(row: UserRow): UserProfile {
  return { id: row.id, email: row.email, displayName: row.display_name, degree: row.degree, major: row.major, schoolDivision: row.school_division, preferredLanguage: row.preferred_language, careerStage: row.career_stage, created_at: row.created_at };
}
function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function readCookie(req: Request, name: string) {
  return req.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}
function writeSession(res: Response, rawToken: string) {
  res.setHeader("Set-Cookie", `bansay_session=${rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(sessionLifetimeMs / 1000)}`);
}
function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function register(db: BansayDatabase, body: unknown) {
  const data = body as Record<string, unknown>;
  const email = clean(data.email, 254).toLowerCase();
  const password = typeof data.password === "string" ? data.password : "";
  const displayName = clean(data.displayName, 120);
  const degree = clean(data.degree, 200);
  const major = clean(data.major, 200) || null;
  const schoolDivision = clean(data.schoolDivision, 200);
  const preferredLanguage = data.preferredLanguage === "fil" ? "fil" : data.preferredLanguage === "en" ? "en" : "";
  const careerStage = ["1", "2", "3", "4"].includes(String(data.careerStage)) ? String(data.careerStage) as "1" | "2" | "3" | "4" : "2";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || password.length > 128 || !displayName || !degree || !preferredLanguage) throw new Error("Enter a valid email, password, name, degree, and language.");
  const id = crypto.randomUUID(); const salt = crypto.randomBytes(16).toString("hex"); const createdAt = new Date().toISOString();
  try {
    db.prepare("INSERT INTO users (id, email, display_name, degree, major, school_division, preferred_language, career_stage, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, email, displayName, degree, major, schoolDivision, preferredLanguage, careerStage, salt, hashPassword(password, salt), createdAt);
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new Error("An account already uses this email.");
    throw error;
  }
  return profile(db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow);
}

export function login(db: BansayDatabase, body: unknown) {
  const data = body as Record<string, unknown>; const email = clean(data.email, 254).toLowerCase(); const password = typeof data.password === "string" ? data.password : "";
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!row || !crypto.timingSafeEqual(Buffer.from(row.password_hash, "hex"), Buffer.from(hashPassword(password, row.password_salt), "hex"))) throw new Error("Invalid email or password.");
  return profile(row);
}

export function createSession(db: BansayDatabase, userId: string) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const now = new Date(); const expiry = new Date(now.getTime() + sessionLifetimeMs);
  db.prepare("INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(tokenHash(rawToken), userId, now.toISOString(), expiry.toISOString());
  return rawToken;
}

export function currentUser(db: BansayDatabase, req: Request) {
  const token = readCookie(req, "bansay_session"); if (!token) return null;
  const row = db.prepare("SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?").get(tokenHash(token), new Date().toISOString()) as UserRow | undefined;
  return row ? profile(row) : null;
}

export function logout(db: BansayDatabase, req: Request, res: Response) {
  const token = readCookie(req, "bansay_session"); if (token) db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(tokenHash(token));
  res.setHeader("Set-Cookie", "bansay_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}
export { writeSession };
