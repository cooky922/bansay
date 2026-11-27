import crypto from "crypto";
import type { Request, Response } from "express";
import type { BansayDatabase } from "./db.ts";
import type { AuthUserProfile, BansayLanguage, CareerStage, UserRole } from "../types/bansay.ts";

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  degree: string;
  major: string | null;
  school_division: string;
  preferred_language: "en" | "fil";
  ui_language?: "en" | "fil" | "ceb";
  career_stage: CareerStage;
  role?: UserRole;
  low_data_mode?: number;
  biological_sex?: "female" | "male" | "prefer-not-to-say";
  password_salt: string;
  password_hash: string;
  created_at: string;
};

function profile(row: UserRow): AuthUserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    degree: row.degree,
    major: row.major,
    schoolDivision: row.school_division,
    preferredLanguage: (row.ui_language || row.preferred_language || "en") as BansayLanguage,
    careerStage: (row.career_stage || "2") as CareerStage,
    role: (row.role || "teacher") as UserRole,
    lowDataMode: Boolean(row.low_data_mode),
    biologicalSex: row.biological_sex || "prefer-not-to-say",
    createdAt: row.created_at,
  };
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function readCookie(req: Request, name: string) {
  return req.headers.cookie
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function readBearerToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (typeof auth !== "string") return undefined;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const origin = String(req.headers.origin || "");
  const referer = String(req.headers.referer || "");
  return Boolean(
    req.secure ||
      forwardedProto === "https" ||
      origin.startsWith("https://") ||
      referer.startsWith("https://")
  );
}

function cookieFlags(req: Request, maxAgeSeconds: number): string {
  const base = `Path=/; HttpOnly; Max-Age=${maxAgeSeconds}`;
  if (isHttpsRequest(req)) {
    return `${base}; Secure; SameSite=None; Partitioned`;
  }
  return `${base}; SameSite=Lax`;
}

export function writeSession(req: Request, res: Response, rawToken: string) {
  res.setHeader(
    "Set-Cookie",
    `bansay_session=${rawToken}; ${cookieFlags(req, Math.floor(sessionLifetimeMs / 1000))}`
  );
}

export function validateSameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function register(db: BansayDatabase, body: unknown): AuthUserProfile {
  const data = body as Record<string, unknown>;
  const email = clean(data.email, 254).toLowerCase();
  const password = typeof data.password === "string" ? data.password : "";
  const displayName = clean(data.displayName, 120);
  const degree = clean(data.degree, 200);
  const major = clean(data.major, 200) || degree || null;
  const schoolDivision = clean(data.schoolDivision, 200);
  const uiLanguage: BansayLanguage =
    data.preferredLanguage === "fil"
      ? "fil"
      : data.preferredLanguage === "ceb"
      ? "ceb"
      : "en";
  const dbPreferredLang: "en" | "fil" = uiLanguage === "fil" ? "fil" : "en";
  const careerStage: CareerStage = ["1", "2", "3", "4"].includes(String(data.careerStage))
    ? (String(data.careerStage) as CareerStage)
    : "2";
  const role: UserRole =
    data.role === "mentor" || data.role === "coordinator" ? data.role : "teacher";
  const lowDataMode = data.lowDataMode ? 1 : 0;
  const biologicalSex =
    data.biologicalSex === "female" || data.biologicalSex === "male"
      ? data.biologicalSex
      : "prefer-not-to-say";

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128 || !displayName || !degree) {
    throw new Error("Enter a valid email, password (at least 8 characters), name, and college degree.");
  }

  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  const createdAt = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO users (
        id, email, display_name, degree, major, school_division,
        preferred_language, ui_language, career_stage, role,
        low_data_mode, biological_sex, password_salt, password_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      email,
      displayName,
      degree,
      major,
      schoolDivision,
      dbPreferredLang,
      uiLanguage,
      careerStage,
      role,
      lowDataMode,
      biologicalSex,
      salt,
      hashPassword(password, salt),
      createdAt
    );
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new Error("An account already uses this email.");
    }
    throw error;
  }

  return profile(db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow);
}

export function login(db: BansayDatabase, body: unknown): AuthUserProfile {
  const data = body as Record<string, unknown>;
  const email = clean(data.email, 254).toLowerCase();
  const password = typeof data.password === "string" ? data.password : "";
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (
    !row ||
    !crypto.timingSafeEqual(
      Buffer.from(row.password_hash, "hex"),
      Buffer.from(hashPassword(password, row.password_salt), "hex")
    )
  ) {
    throw new Error("Invalid email or password.");
  }
  return profile(row);
}

export function createSession(db: BansayDatabase, userId: string): string {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expiry = new Date(now.getTime() + sessionLifetimeMs);
  db.prepare(
    "INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(tokenHash(rawToken), userId, now.toISOString(), expiry.toISOString());
  return rawToken;
}

export function currentUser(db: BansayDatabase, req: Request): AuthUserProfile | null {
  const token = readCookie(req, "bansay_session") || readBearerToken(req);
  if (!token) return null;
  const row = db
    .prepare(
      "SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"
    )
    .get(tokenHash(token), new Date().toISOString()) as UserRow | undefined;
  return row ? profile(row) : null;
}

export function updateUserPreferences(
  db: BansayDatabase,
  userId: string,
  body: unknown
): AuthUserProfile {
  const data = body as Record<string, unknown>;
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  if (!existing) throw new Error("Account not found.");

  const nextUiLanguage: BansayLanguage =
    data.preferredLanguage === "fil" || data.preferredLanguage === "ceb" || data.preferredLanguage === "en"
      ? data.preferredLanguage
      : (existing.ui_language || existing.preferred_language || "en");
  const nextDbLang: "en" | "fil" = nextUiLanguage === "fil" ? "fil" : "en";
  const nextCareerStage: CareerStage = ["1", "2", "3", "4"].includes(String(data.careerStage))
    ? (String(data.careerStage) as CareerStage)
    : existing.career_stage;
  const nextLowData =
    typeof data.lowDataMode === "boolean"
      ? data.lowDataMode
        ? 1
        : 0
      : existing.low_data_mode || 0;
  const nextDivision =
    typeof data.schoolDivision === "string"
      ? data.schoolDivision.trim().slice(0, 200)
      : existing.school_division;

  db.prepare(
    `UPDATE users
     SET preferred_language = ?, ui_language = ?, career_stage = ?, low_data_mode = ?, school_division = ?
     WHERE id = ?`
  ).run(nextDbLang, nextUiLanguage, nextCareerStage, nextLowData, nextDivision, userId);

  return profile(db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow);
}

export function logout(db: BansayDatabase, req: Request, res: Response) {
  const cookieToken = readCookie(req, "bansay_session");
  const bearerToken = readBearerToken(req);
  if (cookieToken) {
    db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(tokenHash(cookieToken));
  }
  if (bearerToken && bearerToken !== cookieToken) {
    db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(tokenHash(bearerToken));
  }
  res.setHeader("Set-Cookie", `bansay_session=; ${cookieFlags(req, 0)}`);
}
