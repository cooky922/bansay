import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  UserCheck,
} from "lucide-react";
import type { AuthUserProfile, BansayLanguage } from "../types/bansay";
import { CHED_RO_X_PROGRAMS } from "../data/chedRoXPrograms";
import { BansayLogo } from "./BansayLogo";
import { CustomSelect } from "./CustomSelect";
import { Alert, Button, FieldError, TextField } from "./ui";
import { setAuthToken } from "../lib/apiClient";

type AuthMode = "login" | "register";
type PortalRole = "teacher" | "mentor";

const MENTOR_SPECIALTIES = [
  "Science Education",
  "Mathematics Education",
  "English Language Education",
];

export function SessionStartFlow({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUserProfile) => Promise<void>;
}) {
  const [portal, setPortal] = useState<PortalRole>("teacher");
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [schoolDivision, setSchoolDivision] = useState("");
  const [biologicalSex, setBiologicalSex] =
    useState<AuthUserProfile["biologicalSex"]>("prefer-not-to-say");
  const [language, setLanguage] = useState<BansayLanguage>("en");

  const [degreeQuery, setDegreeQuery] = useState("");
  const [degreeOpen, setDegreeOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailExistsError, setEmailExistsError] = useState(false);
  const [mismatchRole, setMismatchRole] = useState<PortalRole | null>(null);

  const degreePool = useMemo(
    () =>
      portal === "mentor"
        ? [...MENTOR_SPECIALTIES, ...CHED_RO_X_PROGRAMS]
        : CHED_RO_X_PROGRAMS,
    [portal]
  );

  const options = useMemo(
    () =>
      degreePool.filter((item) =>
        item.toLowerCase().includes(degreeQuery.toLowerCase())
      ),
    [degreePool, degreeQuery]
  );

  const switchPortal = (nextPortal: PortalRole) => {
    setPortal(nextPortal);
    setSubmitAttempted(false);
    setAuthError(null);
    setEmailExistsError(false);
    setMismatchRole(null);
    setDegree("");
    setDegreeQuery("");
    setDegreeOpen(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitAttempted(false);
    setAuthError(null);
    setEmailExistsError(false);
    setMismatchRole(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setAuthError(null);
    setEmailExistsError(false);
    setMismatchRole(null);

    if (mode === "login") {
      if (!email.trim() || !password) return;
    } else {
      if (!email.trim() || password.length < 8 || !name.trim() || !degree.trim()) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint =
        mode === "login" ? "/api/bansay/auth/login" : "/api/bansay/auth/register";
      const payload =
        mode === "login"
          ? { email: email.trim(), password, expectedRole: portal }
          : {
              email: email.trim(),
              password,
              displayName: name.trim(),
              degree: degree.trim(),
              major: degree.trim(),
              schoolDivision: schoolDivision.trim(),
              biologicalSex,
              role: portal,
              preferredLanguage: language,
              lowDataMode: false,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const duplicateEmail =
          res.status === 409 ||
          data.code === "EMAIL_EXISTS" ||
          (typeof data.error === "string" &&
            data.error.includes("already uses this email"));
        setEmailExistsError(duplicateEmail);

        if (
          data.code === "ROLE_MISMATCH" &&
          (data.actualRole === "teacher" || data.actualRole === "mentor")
        ) {
          setMismatchRole(data.actualRole);
        }

        throw new Error(
          duplicateEmail
            ? "An account already uses this email. Switch to Sign in to open your workspace."
            : data.error || "Unable to complete authentication."
        );
      }

      if (typeof data.sessionToken === "string") {
        setAuthToken(data.sessionToken);
      }
      await onAuthenticated(data.user as AuthUserProfile);
    } catch (err) {
      setAuthToken(null);
      setAuthError(
        err instanceof Error ? err.message : "Unable to connect to BANSAY server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isTeacher = portal === "teacher";

  return (
    <main className="bansay-app auth-page flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="auth-layout mx-auto grid w-full max-w-lg overflow-hidden rounded-[26px] items-stretch">
        {/* Left Portal Selector Column */}
        <aside className="auth-header p-6 sm:p-8 text-white flex flex-col justify-between gap-8">
          <div className="auth-header-inner space-y-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="auth-logo-wrap mb-1 flex h-[76px] w-[76px] items-center justify-center rounded-[22px] bg-white shadow-lg shadow-black/10">
                <BansayLogo className="h-12 w-12 shrink-0" />
              </div>
              <div>
                <p className="auth-masthead text-3xl leading-none tracking-[0.16em] text-white sm:text-4xl">
                  BANSAY
                </p>
                <p className="font-display mt-3 text-sm font-medium tracking-wide text-violet-100/90 sm:text-base">para sa bansang mahusay</p>
                <p className="mt-2 text-sm text-violet-100/85">Your workspace for lesson preparation, teaching practice, and mentorship.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-violet-100/90">
                Choose your workspace
              </p>
              <div
                className="grid grid-cols-2 gap-2 rounded-xl bg-white/10 p-1"
                role="tablist"
                aria-label="Account portal"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isTeacher}
                  onClick={() => switchPortal("teacher")}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isTeacher
                      ? "border-white bg-white text-violet-900 shadow-sm"
                      : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-display text-sm font-bold">
                      <BookOpen
                        className={`h-4 w-4 shrink-0 ${
                          isTeacher ? "text-violet-700" : "text-purple-200"
                        }`}
                      />
                      <span>Teacher</span>
                    </span>
                    {isTeacher && <Check className="h-4 w-4 text-violet-700 shrink-0" />}
                  </div>
                  <p
                    className={`mt-1.5 text-xs leading-relaxed ${
                      isTeacher ? "text-slate-600" : "text-purple-100/80"
                    }`}
                  >
                    Prepare lesson guides, practice explanations with a simulated student, and save your teaching evidence.
                  </p>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={!isTeacher}
                  onClick={() => switchPortal("mentor")}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    !isTeacher
                      ? "border-white bg-white text-violet-900 shadow-sm"
                      : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-display text-sm font-bold">
                      <UserCheck
                        className={`h-4 w-4 shrink-0 ${
                          !isTeacher ? "text-violet-700" : "text-purple-200"
                        }`}
                      />
                      <span>Subject Mentor</span>
                    </span>
                    {!isTeacher && <Check className="h-4 w-4 text-violet-700 shrink-0" />}
                  </div>
                  <p
                    className={`mt-1.5 text-xs leading-relaxed ${
                      !isTeacher ? "text-slate-600" : "text-purple-100/80"
                    }`}
                  >
                    Review teacher rehearsals, verify lesson guides, and share practical coaching notes.
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/15 pt-5 space-y-2 text-xs text-purple-100/85">
            <p className="font-semibold text-white">
              {isTeacher ? "Included for Teachers" : "Included for Mentors"}
            </p>
            <ul className="space-y-1.5 leading-relaxed">
              {isTeacher ? (
                <>
                  <li>Lesson guides explained through your background</li>
                  <li>Private rehearsal before teaching in class</li>
                  <li>Teacher-controlled evidence portfolio</li>
                </>
              ) : (
                <>
                  <li>Prioritized review queue by class date</li>
                  <li>Inline lesson guide editing and verification</li>
                  <li>Focused, non-evaluative coaching notes</li>
                </>
              )}
            </ul>
          </div>
        </aside>

        {/* Right Form Column */}
        <section className="auth-card p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-violet-700">
                  {isTeacher ? "Teacher Portal" : "Mentor Portal"}
                </p>
                <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                  {mode === "login"
                    ? isTeacher
                      ? "Teacher sign in"
                      : "Mentor sign in"
                    : isTeacher
                    ? "Create teacher account"
                    : "Create mentor account"}
                </h1>
              </div>
            </div>

            {authError && (
              <div className="mt-5">
                <Alert
                  tone="danger"
                  onDismiss={() => {
                    setAuthError(null);
                    setEmailExistsError(false);
                    setMismatchRole(null);
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{authError}</span>
                    {emailExistsError && mode === "register" && (
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-300 hover:bg-rose-50 whitespace-nowrap"
                      >
                        Switch to Sign in
                      </button>
                    )}
                    {mismatchRole && mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchPortal(mismatchRole)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-300 hover:bg-rose-50 whitespace-nowrap"
                      >
                        Switch to {mismatchRole === "mentor" ? "Mentor" : "Teacher"} sign in
                      </button>
                    )}
                  </div>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div className={`grid gap-4 ${mode === "register" ? "sm:grid-cols-2" : ""}`}>
                <div>
                  <Field label="Email address">
                    <TextField
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailExistsError || mismatchRole) {
                          setEmailExistsError(false);
                          setMismatchRole(null);
                          setAuthError(null);
                        }
                      }}
                      placeholder={
                        isTeacher ? "teacher@deped.gov.ph" : "mentor@deped.gov.ph"
                      }
                      autoComplete="email"
                      aria-invalid={submitAttempted && !email.trim()}
                    />
                  </Field>
                  {submitAttempted && !email.trim() && (
                    <FieldError>Enter your email address.</FieldError>
                  )}
                </div>

                <div>
                  <Field
                    label={
                      mode === "register" ? "Password (min. 8 characters)" : "Password"
                    }
                  >
                    <div className="relative mt-1.5">
                      <TextField
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        aria-invalid={submitAttempted && (mode === "register" ? password.length < 8 : !password)}
                        className="pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  {submitAttempted &&
                    (mode === "register" ? password.length < 8 : !password) && (
                      <FieldError>
                        {mode === "register"
                          ? "Use at least 8 characters for your password."
                          : "Enter your password."}
                      </FieldError>
                    )}
                </div>
              </div>

              {mode === "register" && (
                <>
                  <div>
                    <Field label="Full name">
                      <TextField
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={
                          isTeacher ? "e.g. Maria Reyes" : "e.g. Dr. Elena Santos"
                        }
                        autoComplete="name"
                        aria-invalid={submitAttempted && !name.trim()}
                      />
                    </Field>
                    {submitAttempted && !name.trim() && (
                      <FieldError>Enter your name to continue.</FieldError>
                    )}
                  </div>

                  <div className="relative">
                    <Field
                      label={
                        isTeacher
                          ? "College degree or major"
                          : "Subject specialty or degree"
                      }
                    >
                      <TextField
                        value={degreeOpen ? degreeQuery : degree}
                        onFocus={() => {
                          setDegreeQuery(degree);
                          setDegreeOpen(true);
                        }}
                        onChange={(e) => {
                          setDegree(e.target.value);
                          setDegreeQuery(e.target.value);
                          setDegreeOpen(true);
                        }}
                        onBlur={() => window.setTimeout(() => setDegreeOpen(false), 150)}
                        placeholder={
                          isTeacher
                            ? "Search your college degree or major"
                            : "e.g. Science Education, Mathematics, English"
                        }
                        autoComplete="off"
                        aria-invalid={submitAttempted && !degree.trim()}
                      />
                    </Field>
                    {submitAttempted && !degree.trim() && (
                      <FieldError>
                        {isTeacher
                          ? "Enter your degree or major to continue."
                          : "Enter your subject specialty or degree."}
                      </FieldError>
                    )}
                    {degreeOpen && (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {options.length ? (
                          options.map((item) => (
                            <button
                              type="button"
                              key={item}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setDegree(item);
                                setDegreeQuery(item);
                                setDegreeOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-violet-50"
                            >
                              {item}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-slate-500">
                            Press enter or continue with your entered title.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="School or division (optional)">
                      <TextField
                        value={schoolDivision}
                        onChange={(e) => setSchoolDivision(e.target.value)}
                        placeholder="e.g. Iligan City National High School"
                      />
                    </Field>

                    <Field label="Preferred language">
                      <CustomSelect
                        value={language}
                        onChange={setLanguage}
                        options={[
                          { value: "en", label: "English" },
                          { value: "fil", label: "Filipino" },
                          { value: "ceb", label: "Cebuano" },
                        ]}
                        ariaLabel="Preferred language"
                        className="mt-1.5"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 items-end">
                    <Field label="Biological sex (optional)">
                      <CustomSelect
                        value={biologicalSex}
                        onChange={setBiologicalSex}
                        options={[
                          { value: "prefer-not-to-say", label: "Prefer not to say" },
                          { value: "female", label: "Female" },
                          { value: "male", label: "Male" },
                        ]}
                        ariaLabel="Biological sex"
                        className="mt-1.5"
                      />
                    </Field>

                  </div>
                </>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>Private to your workspace</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "login" ? "register" : "login")}
                    className="text-xs font-semibold text-violet-700 hover:underline"
                  >
                    {mode === "login"
                      ? `New ${isTeacher ? "teacher" : "mentor"}? Create an account`
                      : "Already have an account? Sign in"}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {mode === "login" ? "Signing in…" : "Creating account…"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === "login"
                          ? `Sign in as ${isTeacher ? "Teacher" : "Mentor"}`
                          : `Create ${isTeacher ? "Teacher" : "Mentor"} account`}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}
