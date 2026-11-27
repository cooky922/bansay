import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { AccountPanel, PrivacyPage } from "./components/AccountPanel";
import type { AccountMenuProps } from "./components/AccountMenu";
import { rehearsalBadge, visibleAnnualTrack, type AnnualTrackProgress } from "./lib/workspaceNavigation";
import { TopBar } from "./components/TopBar";
import { LessonPrepStudio } from "./components/LessonPrepStudio";
import { currentRehearsal, type RehearsalRequest } from "./lib/rehearsal";
import { DEMO_REVIEW_DELAY_MS, demoExchange, demoReviewContent, finishDemoPractice, type DemoReviewState } from "./lib/demoMentorReview";
import { RehearsalReview } from "./components/RehearsalReview";
import { CpdPortfolio } from "./components/CpdPortfolio";
import { CohortOversight } from "./components/CohortOversight";
import { PeerLibrary } from "./components/PeerLibrary";
import { SessionStartFlow } from "./components/SessionStartFlow";
import { Alert } from "./components/ui";
import { ConceptPackRequestError } from "./lib/conceptPackRequest";
import { bansayFetch, setAuthToken } from "./lib/apiClient";
import type {
  ActiveSection,
  AuthUserProfile,
  BansayLanguage,
  CareerStage,
  ClassroomEvidenceItem,
  CohortSeat,
  CompetencyQuarter,
  EngineeringControlMetric,
  LessonCase,
  MediaTier,
  PeerLibraryItem,
  PilotBudgetRow,
  PilotValidationMetric,
  SubjectName,
  UnitEconomicsRow,
} from "./types/bansay";
import {
  ENGINEERING_CONTROLS_TABLE,
  INITIAL_COHORT_SEATS,
  INITIAL_COMPETENCY_QUARTERS,
  INITIAL_PEER_LIBRARY,
  PILOT_BUDGET_ITEMS,
  PILOT_VALIDATION_METRICS_TABLE,
  UNIT_ECONOMICS_TABLE,
} from "./data/bansayData";

type WorkspacePayload = {
  user: AuthUserProfile;
  cases: LessonCase[];
  annualTrackProgress?: AnnualTrackProgress;
  rehearsalDemo?: boolean;
  sharedLacLibrary: PeerLibraryItem[];
  evidenceItems: ClassroomEvidenceItem[];
  cohortSeats: CohortSeat[];
  quarters: CompetencyQuarter[];
  engineeringControls: EngineeringControlMetric[];
  pilotMetrics: PilotValidationMetric[];
  pilotBudget: PilotBudgetRow[];
  unitEconomics: UnitEconomicsRow[];
  directMentorMinutesLogged: number;
};

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("prep");
  const [accountPanel, setAccountPanel] = useState<"profile" | "downloads">();
  const [annualTrackProgress, setAnnualTrackProgress] = useState<AnnualTrackProgress>();
  const [toast, setToast] = useState<string | null>(null);

  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoCases, setDemoCases] = useState<Record<string, LessonCase>>({});
  const [demoReviews, setDemoReviews] = useState<Record<string, DemoReviewState>>({});
  const [demoPortfolio, setDemoPortfolio] = useState<Record<string, string>>({});
  const priorAssignments = useRef(new Map<string, string | undefined>());
  const [reviewAnnouncement, setReviewAnnouncement] = useState("");
  const [packStep, setPackStep] = useState<number>();
  const [cases, setCases] = useState<LessonCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>("");
  const [peerLibrary, setPeerLibrary] = useState<PeerLibraryItem[]>(INITIAL_PEER_LIBRARY);
  const [quarters, setQuarters] = useState<CompetencyQuarter[]>(
    INITIAL_COMPETENCY_QUARTERS
  );
  const [evidenceItems, setEvidenceItems] = useState<ClassroomEvidenceItem[]>([]);
  const [cohortSeats, setCohortSeats] = useState<CohortSeat[]>(INITIAL_COHORT_SEATS);
  const [engineeringControls, setEngineeringControls] = useState<
    EngineeringControlMetric[]
  >(ENGINEERING_CONTROLS_TABLE);
  const [pilotMetrics, setPilotMetrics] = useState<PilotValidationMetric[]>(
    PILOT_VALIDATION_METRICS_TABLE
  );
  const [pilotBudget, setPilotBudget] = useState<PilotBudgetRow[]>(PILOT_BUDGET_ITEMS);
  const [unitEconomics, setUnitEconomics] = useState<UnitEconomicsRow[]>(
    UNIT_ECONOMICS_TABLE
  );
  const [directMentorMinutesLogged, setDirectMentorMinutesLogged] = useState(160);

  const hydrateWorkspace = useCallback(async (authenticatedUser?: AuthUserProfile) => {
    const cacheKey = authenticatedUser
      ? `bansay_offline_cases_v2_${authenticatedUser.id}`
      : "";
    try {
      const res = await bansayFetch("/api/bansay/workspace");
      if (!res.ok) {
        let detail = "Failed to load workspace.";
        try {
          const errBody = (await res.json()) as { error?: string };
          if (errBody?.error) detail = errBody.error;
        } catch {
          // ignore non-JSON error
        }
        throw new Error(detail);
      }
      const data = (await res.json()) as WorkspacePayload;
      const resolvedUser = data.user || authenticatedUser;
      setUser(resolvedUser);
      setCases(data.cases || []);
      setDemoEnabled(data.rehearsalDemo === true);
      setAnnualTrackProgress(data.annualTrackProgress);
      try {
        if (resolvedUser?.id) {
          sessionStorage.setItem("bansay_offline_profile", JSON.stringify(resolvedUser));
          localStorage.setItem(
            `bansay_offline_cases_v2_${resolvedUser.id}`,
            JSON.stringify(data.cases || [])
          );
        }
      } catch {
        // ignore storage quota errors
      }
      setActiveCaseId((prev) =>
        prev && data.cases.some((c) => c.id === prev)
          ? prev
          : data.cases[0]?.id || ""
      );
      setPeerLibrary(data.sharedLacLibrary || INITIAL_PEER_LIBRARY);
      setEvidenceItems(data.evidenceItems || []);
      setCohortSeats(data.cohortSeats || INITIAL_COHORT_SEATS);
      setQuarters(data.quarters || INITIAL_COMPETENCY_QUARTERS);
      setEngineeringControls(data.engineeringControls || ENGINEERING_CONTROLS_TABLE);
      setPilotMetrics(data.pilotMetrics || PILOT_VALIDATION_METRICS_TABLE);
      setPilotBudget(data.pilotBudget || PILOT_BUDGET_ITEMS);
      setUnitEconomics(data.unitEconomics || UNIT_ECONOMICS_TABLE);
      setDirectMentorMinutesLogged(data.directMentorMinutesLogged ?? 160);
      setActiveSection(window.location.hash === "#privacy" ? "privacy" : resolvedUser.role === "teacher" ? "prep" : "cohort");
    } catch (err) {
      if (cacheKey && authenticatedUser) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsedCases = JSON.parse(cached) as LessonCase[];
            setUser(authenticatedUser);
            setCases(parsedCases);
            setActiveCaseId(parsedCases[0]?.id || "");
            setActiveSection(window.location.hash === "#privacy" ? "privacy" : authenticatedUser.role === "teacher" ? "prep" : "cohort");
            setToast("Loaded cached lessons for offline study.");
            return;
          }
        } catch {
          // ignore corrupt cache
        }
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await bansayFetch("/api/bansay/auth/me");
        if (res.ok && active) {
          const data = (await res.json()) as { user: AuthUserProfile };
          await hydrateWorkspace(data.user);
        } else if (res.status === 401) {
          setAuthToken(null);
          sessionStorage.removeItem("bansay_offline_profile");
        }
      } catch {
        if (active) {
          try {
            const cached = sessionStorage.getItem("bansay_offline_profile");
            if (cached) await hydrateWorkspace(JSON.parse(cached) as AuthUserProfile);
          } catch {
            // Offline rehearsal needs a workspace previously opened in this tab.
          }
        }
      } finally {
        if (active) setAuthChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrateWorkspace]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeCase = useMemo(
    () => cases.find((c) => c.id === activeCaseId) || cases[0],
    [cases, activeCaseId]
  );
  const rehearsalInProgress = Boolean(
    activeCase &&
      !activeCase.mentorReview.submittedForReview &&
      !activeCase.rehearsalMessages.some((message) => message.closing)
  );

  const upsertCase = useCallback((record: LessonCase) => {
    setCases((prev) => {
      const exists = prev.some((c) => c.id === record.id);
      const next = exists
        ? prev.map((c) => (c.id === record.id ? record : c))
        : [record, ...prev];
      try {
        if (user?.id) {
          localStorage.setItem(`bansay_offline_cases_v2_${user.id}`, JSON.stringify(next));
        }
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, [user?.id]);

  const handleUpdatePreferences = async (
    patch: Partial<{
      preferredLanguage: BansayLanguage;
      careerStage: CareerStage;
      lowDataMode: boolean;
    }>
  ) => {
    const res = await bansayFetch("/api/bansay/auth/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setUser(data.user as AuthUserProfile);
      if (patch.preferredLanguage) {
        await hydrateWorkspace(data.user);
        setToast(
          `Language updated to ${
            patch.preferredLanguage === "en"
              ? "English"
              : patch.preferredLanguage === "fil"
              ? "Filipino"
              : "Cebuano"
          }`
        );
      } else if (typeof patch.lowDataMode === "boolean") {
        setToast(
          patch.lowDataMode ? "Low-data mode enabled" : "Standard data mode enabled"
        );
      }
    }
  };

  const handleLogout = async () => {
    try {
      await bansayFetch("/api/bansay/auth/logout", {
        method: "POST",
      });
    } catch {
      // Clear local session state even if logout request fails
    } finally {
      setAuthToken(null);
          sessionStorage.removeItem("bansay_offline_profile");
      setUser(null);
      setCases([]);
      setActiveCaseId("");
      setActiveSection("prep");
      setAccountPanel(undefined);
      setAnnualTrackProgress(undefined);
      setDemoEnabled(false);
      setDemoCases({});
      setDemoReviews({});
      priorAssignments.current.clear();
      setDemoPortfolio({});
      setReviewAnnouncement("");
      setPackStep(undefined);
    }
  };

  const handleSelectSection = (section: ActiveSection) => {
    setPackStep(undefined);
    if (section === "privacy" || window.location.hash === "#privacy") {
      window.history.replaceState(null, "", section === "privacy" ? "#privacy" : window.location.pathname + window.location.search);
    }
    const canViewSubmittedReview = Boolean(activeCase?.mentorReview.submittedForReview);
    if (section === "rehearsal" && !rehearsalInProgress && !canViewSubmittedReview) {
      setActiveSection("prep");
      setToast(activeCase
        ? "Start a lesson practice from its Concept Pack before opening Rehearsal & Review."
        : "Build a Concept Pack before starting rehearsal.");
      return;
    }
    setActiveSection(section);
  };

  const handleGenerateConceptPack = async (payload: {
    subject: SubjectName;
    gradeLevel: string;
    topic: string;
    teacherMajor: string;
    classDate: string;
    careerStage: CareerStage;
    startingMaterial: string;
    baselineFirst: boolean;
    baselineExplanation: string;
    usesLabEquipment: boolean;
    factSheet?: string;
    imageData?: { mimeType: string; data: string };
    uploadedImagePreview?: string;
    noStudentFacesConfirmed?: boolean;
  }) => {
    const res = await bansayFetch("/api/bansay/generate-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...payload,
        language: user?.preferredLanguage || "en",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ConceptPackRequestError(data.error || "Unable to generate Concept Pack.");
    }
    let created = data.caseRecord as LessonCase;
    if (payload.uploadedImagePreview && payload.noStudentFacesConfirmed) {
      const mediaRes = await bansayFetch(`/api/bansay/cases/${created.id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tier: "setup-photo",
          step: 2,
          consentConfirmed: true,
          noStudentFacesConfirmed: true,
          label: `Setup photo (${created.subject} ${created.gradeLevel})`,
        }),
      });
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        created = mediaData.caseRecord as LessonCase;
      }
    }
    upsertCase(created);
    setActiveCaseId(created.id);
    return { demo: Boolean(data.demo) };
  };

  const handlePatchCase = async (
    caseId: string,
    patch: Partial<{
      baselineExplanation: string;
      diagnosticCompleted: boolean;
      selfCheckScore: number;
      cachedOffline: boolean;
      submissionFormat: "live-ai" | "offline-fallback";
    }>
  ) => {
    const res = await bansayFetch(`/api/bansay/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok && data.caseRecord) {
      upsertCase(data.caseRecord as LessonCase);
    }
  };

  const handleRehearseTurn = useCallback(async (payload: RehearsalRequest) => {
    if (demoEnabled && user && activeCase?.id === payload.caseId) {
      const updated = demoExchange(demoCases[payload.caseId] ?? { ...activeCase, rehearsalMessages: [], mediaAssets: [] }, payload, user);
      setDemoCases((current) => ({ ...current, [payload.caseId]: updated }));
      return updated;
    }
    const res = await bansayFetch("/api/bansay/rehearse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Simulated learner could not respond.");
    upsertCase(data.caseRecord as LessonCase);
    return data.caseRecord as LessonCase;
  }, [upsertCase, demoEnabled, user, activeCase, demoCases]);

  const handleSubmitReview = async (caseId: string, attachmentIds: string[]) => {
    let transcript: LessonCase["rehearsalMessages"];
    if (demoEnabled && user) {
      const lesson = demoCases[caseId];
      if (!lesson) return;
      const updated = finishDemoPractice(lesson, user.preferredLanguage, user.displayName);
      if (updated === lesson) return;
      setDemoCases((current) => ({ ...current, [caseId]: updated }));
      transcript = currentRehearsal(updated.rehearsalMessages);
    } else {
      const res = await bansayFetch(`/api/bansay/cases/${caseId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attachmentIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit rehearsal.");
      }
      const updated = data.caseRecord as LessonCase;
      upsertCase(updated);
      transcript = currentRehearsal(updated.rehearsalMessages);
    }
    // Temporary sample feedback is kept in client state only; it is never sent
    // to the mentor-review API or written as a mentor note.
    setDemoReviews((current) => ({
      ...current,
      [caseId]: { readyAt: Date.now() + DEMO_REVIEW_DELAY_MS, transcript, sampleOnly: !demoEnabled },
    }));
    setReviewAnnouncement("");
  };

  const handleSubmitFreshCase = async (
    caseId: string,
    teacherRevision: string,
    freshCaseResponse: string
  ) => {
    if (demoEnabled) {
      setDemoCases((current) => ({ ...current, [caseId]: { ...current[caseId], teacherRevision, freshCaseResponse, freshCaseStatus: "submitted" } }));
      return;
    }
    const res = await bansayFetch(`/api/bansay/cases/${caseId}/fresh-case`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ teacherRevision, freshCaseResponse }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to submit fresh case.");
    }
    upsertCase(data.caseRecord as LessonCase);
  };

  const handleRegisterMedia = async (
    caseId: string,
    payload: {
      tier: MediaTier;
      step: 2 | 4 | 7;
      consentConfirmed: boolean;
      noStudentFacesConfirmed: boolean;
      label: string;
      attachment?: { type: string; base64: string };
    }
  ) => {
    const res = await bansayFetch(`/api/bansay/cases/${caseId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to attach media.");
    }
    upsertCase(data.caseRecord as LessonCase);
  };

  const handlePurgeMedia = async (caseId: string, mediaId: string) => {
    const res = await bansayFetch(`/api/bansay/cases/${caseId}/media/${mediaId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok && data.caseRecord) {
      upsertCase(data.caseRecord as LessonCase);
      setToast("Media record purged immediately.");
    }
  };

  const handleVerifyConceptPack = async (
    caseId: string,
    payload: {
      bigIdeaSummary: string;
      bridgeExplanation: string;
      limitationNote: string;
      packAuditDurationSec: number;
      publishToLac: boolean;
    }
  ) => {
    const res = await bansayFetch(`/api/bansay/cases/${caseId}/verify-pack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to verify Concept Pack.");
    }
    if (data.caseRecord) upsertCase(data.caseRecord as LessonCase);
    if (data.sharedLacLibrary) setPeerLibrary(data.sharedLacLibrary);
    if (data.pilotMetrics) setPilotMetrics(data.pilotMetrics);
    if (typeof data.directMentorMinutesLogged === "number") {
      setDirectMentorMinutesLogged(data.directMentorMinutesLogged);
    }
  };

  const handleSubmitMentorReview = async (
    caseId: string,
    payload: {
      focusedGap: string;
      teachingMove: string;
      quickRefresher: string;
      masteredSkill: string;
      practiceSkill: string;
      transcriptReviewDurationSec: number;
    }
  ) => {
    const res = await bansayFetch(`/api/bansay/cases/${caseId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to submit mentor feedback.");
    }
    if (data.caseRecord) upsertCase(data.caseRecord as LessonCase);
    if (data.pilotMetrics) setPilotMetrics(data.pilotMetrics);
    if (typeof data.directMentorMinutesLogged === "number") {
      setDirectMentorMinutesLogged(data.directMentorMinutesLogged);
    }
  };

  const handleSaveLibraryItem = async (id: string) => {
    const res = await bansayFetch(`/api/bansay/lac-library/${id}/save`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok && data.sharedLacLibrary) {
      setPeerLibrary(data.sharedLacLibrary as PeerLibraryItem[]);
      setToast("Saved verified pack to your prep notes.");
    }
  };

  const handleAddEvidence = async (payload: {
    title: string;
    subject: string;
    revisionUsed: string;
    classroomOutcome: string;
    evidenceType: ClassroomEvidenceItem["evidenceType"];
    colleagueObserved: boolean;
    hasPhotoAttachment: boolean;
    noStudentFacesConfirmed: boolean;
  }) => {
    const res = await bansayFetch("/api/bansay/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to save classroom evidence.");
    }
    setEvidenceItems(data.evidenceItems as ClassroomEvidenceItem[]);
    setQuarters((prev) =>
      prev.map((q) => {
        if (q.quarter === "Q3" && q.completedCount < q.targetCount) {
          const nextCount = q.completedCount + 1;
          return {
            ...q,
            completedCount: nextCount,
            status: nextCount >= q.targetCount ? "verified" : "in-progress",
          };
        }
        return q;
      })
    );
    setToast("Classroom implementation proof added to your private vault.");
  };

  const handleLogPortfolioExport = async (
    exportType: "pmes-annex-a" | "cpd-summary"
  ) => {
    await bansayFetch("/api/bansay/portfolio/export-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ exportType }),
    });
    setToast(
      exportType === "pmes-annex-a"
        ? "Teacher-custody PMES Annex A MOV pack downloaded (media stripped)."
        : "CPD summary downloaded under teacher custody."
    );
  };

  const markDemoReady = useCallback((caseId: string) => {
    setDemoReviews((current) => {
      const review = current[caseId];
      if (!review || review.reviewedAt) return current;
      return { ...current, [caseId]: { ...review, reviewedAt: new Date().toISOString() } };
    });
    const message = demoEnabled ? "Your mentor review is ready" : "Your sample mentor feedback is ready";
    setToast(message);
    setReviewAnnouncement(message);
  }, [demoEnabled]);

  useEffect(() => {
    const timers = Object.entries(demoReviews).filter(([, review]) => !review.reviewedAt)
      .map(([id, review]) => window.setTimeout(() => markDemoReady(id), Math.max(0, review.readyAt - Date.now())));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [demoReviews, markDemoReady]);

  useEffect(() => {
    for (const lesson of cases) {
      const assignment = lesson.mentorReview.assignment;
      if (priorAssignments.current.get(lesson.id) === "waiting" && assignment === "assigned") {
        setToast("A mentor has been assigned to your rehearsal.");
        setReviewAnnouncement("A mentor has been assigned to your rehearsal.");
      }
      priorAssignments.current.set(lesson.id, assignment);
    }
  }, [cases]);

  const teacherId = user?.role === "teacher" ? user.id : undefined;
  useEffect(() => {
    if (!teacherId) return;
    const controller = new AbortController();
    let refreshing = false;
    async function refreshMentorNotes() {
      if (refreshing || document.visibilityState !== "visible" || !navigator.onLine) return;
      refreshing = true;
      try {
        const response = await bansayFetch("/api/bansay/workspace", { signal: controller.signal });
        if (!response.ok || controller.signal.aborted) return;
        const data = await response.json() as WorkspacePayload;
        if (controller.signal.aborted || data.user.id !== teacherId) return;
        const serverCases = new Map(data.cases.map((lesson) => [lesson.id, lesson]));
        setCases((current) => current.map((lesson) => {
          const remote = serverCases.get(lesson.id);
          if (!remote || remote.mentorReview.reviewedAt < lesson.mentorReview.reviewedAt ||
              JSON.stringify(remote.mentorReview) === JSON.stringify(lesson.mentorReview)) return lesson;
          return { ...lesson, mentorReview: remote.mentorReview, freshCaseStatus: remote.freshCaseStatus };
        }));
        setAnnualTrackProgress(data.annualTrackProgress);
      } catch {
        // The current workspace remains available when the network is interrupted.
      } finally {
        refreshing = false;
      }
    }
    const timer = window.setInterval(refreshMentorNotes, 30_000);
    window.addEventListener("focus", refreshMentorNotes);
    window.addEventListener("online", refreshMentorNotes);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshMentorNotes);
      window.removeEventListener("online", refreshMentorNotes);
    };
  }, [teacherId]);

  if (authChecking) {
    return (
      <main className="bansay-app min-h-[100dvh] flex items-center justify-center bg-bansay-canvas text-slate-700">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-violet-700" />
          <span>Loading BANSAY workspace…</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <SessionStartFlow
        onAuthenticated={(authenticatedUser) => hydrateWorkspace(authenticatedUser)}
      />
    );
  }

  const language = user.preferredLanguage;
  const lowDataMode = user.lowDataMode;
  const activeSampleReview = activeCase ? demoReviews[activeCase.id] : undefined;
  const activeDemoReview = demoEnabled ? activeSampleReview : undefined;
  const displayedRehearsal = demoEnabled && activeCase
    ? demoCases[activeCase.id] ?? { ...activeCase, rehearsalMessages: [], mediaAssets: [] }
    : activeCase;
  const badge = rehearsalBadge(cases);
  badge.ready += Object.values(demoReviews).filter((review) => review.reviewedAt).length;
  badge.waiting += Object.values(demoReviews).filter((review) => !review.reviewedAt).length;
  const pendingReviewsCount = cases.filter((lesson) => lesson.mentorReview.status === "pending").length;
  const account: AccountMenuProps = {
    user,
    onProfile: () => setAccountPanel("profile"),
    onDownloads: () => setAccountPanel("downloads"),
    onPrivacy: () => handleSelectSection("privacy"),
    onLogout: () => void handleLogout(),
    onToggleLowDataMode: () => void handleUpdatePreferences({ lowDataMode: !lowDataMode }),
    onChangeLanguage: (preferredLanguage) => void handleUpdatePreferences({ preferredLanguage }),
  };

  return (
    <div
      className={`bansay-app min-h-[100dvh] flex overflow-x-clip bg-bansay-canvas text-slate-900 ${
        lowDataMode ? "low-data-mode" : ""
      }`}
    >
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        annualTrack={visibleAnnualTrack(import.meta.env.VITE_BANSAY_ANNUAL_TRACK === "true", annualTrackProgress)}
        mentorBadge={badge}
        pendingReviewsCount={pendingReviewsCount}
        account={account}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar account={account} />

        <main className="min-w-0 flex-1 px-3 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[90rem]">
            {activeSection === "privacy" && <PrivacyPage />}
            {activeSection === "prep" && (
              <LessonPrepStudio
                language={language}
                lowDataMode={lowDataMode}
                user={user}
                activeCase={activeCase}
                initialPackStep={packStep}
                demoVerified={Boolean(activeDemoReview?.reviewedAt)}
                onGenerateConceptPack={handleGenerateConceptPack}
                onPatchCase={handlePatchCase}
                onGoToRehearsal={() => handleSelectSection("rehearsal")}
                onNotify={setToast}
              />
            )}

            {activeSection === "rehearsal" && (
              <RehearsalReview
                teacher={user}
                key={`${activeCase?.id}-${demoEnabled}`}
                language={language}
                activeCase={displayedRehearsal}
                demo={demoEnabled ? {
                  review: activeDemoReview,
                  skip: () => { if (activeCase) markDemoReady(activeCase.id); },
                  reset: () => {
                    if (!activeCase) return;
                    const id = activeCase.id;
                    setDemoCases(({ [id]: _, ...remaining }) => remaining);
                    setDemoReviews(({ [id]: _, ...remaining }) => remaining);
                    setDemoPortfolio(({ [id]: _, ...remaining }) => remaining);
                    setReviewAnnouncement("");
                    setToast(null);
                  },
                  save: () => {
                    if (!activeCase || !activeDemoReview) return;
                    setDemoPortfolio((current) => ({ ...current, [activeCase.id]: demoReviewContent(activeCase, activeDemoReview.transcript).move }));
                    setToast("Saved to your demo portfolio.");
                  },
                  refresher: (step) => { handleSelectSection("prep"); setPackStep(step); },
                } : undefined}
                sampleReview={activeSampleReview}
                onRehearseTurn={handleRehearseTurn}
                onSubmitReview={handleSubmitReview}
                onSubmitFreshCase={handleSubmitFreshCase}
                onRegisterMedia={handleRegisterMedia}
                onPurgeMedia={handlePurgeMedia}
                onPatchOfflineFallback={(id) =>
                  demoEnabled ? Promise.resolve() : handlePatchCase(id, { submissionFormat: "offline-fallback" })
                }
                peerLibrary={peerLibrary}
                onSaveLibraryItem={handleSaveLibraryItem}
                isLessonReady={rehearsalInProgress || Boolean(activeCase?.mentorReview.submittedForReview)}
                onPlanLesson={() => setActiveSection("prep")}
              />
            )}

            {activeSection === "portfolio" && demoEnabled && Object.keys(demoPortfolio).length > 0 && (
              <section className="mb-4 rounded-xl border border-bansay-line bg-bansay-tint p-4">
                <h2>Demo portfolio</h2>
                {Object.entries(demoPortfolio).map(([id, move]) => <p key={id} className="mt-1">{cases.find((lesson) => lesson.id === id)?.topic} &middot; {move}</p>)}
              </section>
            )}
            {activeSection === "portfolio" && (
              <CpdPortfolio
                language={language}
                quarters={quarters}
                evidenceItems={evidenceItems}
                cases={cases}
                onAddEvidence={handleAddEvidence}
                onLogPortfolioExport={handleLogPortfolioExport}
                practiceHours={cases.length * 0.5 + evidenceItems.length * 0.5}
              />
            )}

            {activeSection === "library" && (
              <PeerLibrary
                peerLibrary={peerLibrary}
                onSaveLibraryItem={handleSaveLibraryItem}
              />
            )}

            {activeSection === "cohort" && (
              <CohortOversight
                language={language}
                role={user.role === "teacher" ? "coordinator" : user.role}
                cases={cases}
                onVerifyConceptPack={handleVerifyConceptPack}
                onSubmitMentorReview={handleSubmitMentorReview}
                cohortSeats={cohortSeats}
                engineeringControls={engineeringControls}
                pilotMetrics={pilotMetrics}
                pilotBudget={pilotBudget}
                unitEconomics={unitEconomics}
                directMentorMinutesLogged={directMentorMinutesLogged}
              />
            )}
          </div>
        </main>
      </div>

      {accountPanel && <AccountPanel panel={accountPanel} user={user} cases={cases} onClose={() => setAccountPanel(undefined)} />}
      <div aria-live="polite" className="sr-only">{reviewAnnouncement}</div>
      {toast && (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[70] sm:bottom-4 w-[calc(100%-2rem)] max-w-sm shadow-lg shadow-slate-900/10">
          <Alert tone="success" onDismiss={() => setToast(null)}>
            {toast}
          </Alert>
        </div>
      )}
    </div>
  );
}
