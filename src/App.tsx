import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { LessonPrepStudio } from "./components/LessonPrepStudio";
import { RehearsalReview } from "./components/RehearsalReview";
import { CpdPortfolio } from "./components/CpdPortfolio";
import { CohortOversight } from "./components/CohortOversight";
import { PeerLibrary } from "./components/PeerLibrary";
import { SessionStartFlow } from "./components/SessionStartFlow";
import { Alert } from "./components/ui";
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

export type LocalMentorRecording = {
  url: string;
  kind: "voice" | "video";
};

type WorkspacePayload = {
  user: AuthUserProfile;
  cases: LessonCase[];
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mentorVideos, setMentorVideos] = useState<Record<string, LocalMentorRecording>>({});

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
    setActiveSection(resolvedUser.role === "teacher" ? "prep" : "cohort");
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
        }
      } catch {
        setAuthToken(null);
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

  const upsertCase = (record: LessonCase) => {
    setCases((prev) => {
      const exists = prev.some((c) => c.id === record.id);
      if (exists) {
        return prev.map((c) => (c.id === record.id ? record : c));
      }
      return [record, ...prev];
    });
  };

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
      setUser(null);
      setCases([]);
      setActiveCaseId("");
      setActiveSection("prep");
      setMobileMenuOpen(false);
    }
  };

  const handleSelectSection = (section: ActiveSection) => {
    if (section === "rehearsal" && !activeCase) {
      setActiveSection("prep");
      setToast("Build a 10-Minute Concept Pack before starting rehearsal.");
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
      throw new Error(data.error || "Unable to generate Concept Pack.");
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

  const handleRehearseTurn = async ({
    caseId,
    teacherMessage,
    attachmentType,
  }: {
    caseId: string;
    teacherMessage: string;
    attachmentType: "text" | "voice-note" | "video-note" | "handwritten-photo";
  }) => {
    const target = cases.find((c) => c.id === caseId);
    if (!target) throw new Error("Active lesson case not found.");

    const res = await bansayFetch("/api/bansay/rehearse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        caseId,
        subject: target.subject,
        gradeLevel: target.gradeLevel,
        topic: target.topic,
        language: user?.preferredLanguage || target.language,
        studentName: target.support.simulatedStudentPrompt.studentName,
        history: target.rehearsalMessages.map((m) => ({
          sender: m.sender,
          text: m.text,
        })),
        teacherMessage,
        attachmentType,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Simulated learner could not respond.");
    }
    if (data.caseRecord) {
      upsertCase(data.caseRecord as LessonCase);
    }
    return { ended: Boolean(data.ended), demo: Boolean(data.demo) };
  };

  const handleSubmitReview = async (caseId: string) => {
    const res = await bansayFetch(`/api/bansay/cases/${caseId}/submit-review`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to submit rehearsal.");
    }
    upsertCase(data.caseRecord as LessonCase);
  };

  const handleSubmitFreshCase = async (
    caseId: string,
    teacherRevision: string,
    freshCaseResponse: string
  ) => {
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
      throw new Error(data.error || "Unable to log media metadata.");
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

  const handleStoreMentorVideo = (caseId: string, recording: LocalMentorRecording) => {
    setMentorVideos((current) => {
      if (current[caseId] && current[caseId].url !== recording.url) {
        URL.revokeObjectURL(current[caseId].url);
      }
      return { ...current, [caseId]: recording };
    });
  };

  const handleClearMentorVideo = (caseId: string) => {
    setMentorVideos((current) => {
      if (current[caseId]) URL.revokeObjectURL(current[caseId].url);
      const { [caseId]: _, ...remaining } = current;
      return remaining;
    });
  };

  if (authChecking) {
    return (
      <main className="bansay-app min-h-[100dvh] flex items-center justify-center bg-[#F7F6FB] text-slate-700">
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
  const completedCompetencies = quarters.reduce(
    (sum, q) => sum + q.completedCount,
    0
  );
  const totalCompetencies = quarters.reduce((sum, q) => sum + q.targetCount, 0);
  const pendingReviewsCount = cases.filter(
    (c) => c.mentorReview.status === "pending"
  ).length;

  return (
    <div
      className={`bansay-app min-h-[100dvh] flex overflow-x-clip bg-[#F7F6FB] text-slate-900 ${
        lowDataMode ? "low-data-mode" : ""
      }`}
    >
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        language={language}
        role={user.role}
        completedCompetencies={completedCompetencies}
        totalCompetencies={totalCompetencies}
        pendingReviewsCount={pendingReviewsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        lowDataMode={lowDataMode}
        onToggleLowDataMode={() =>
          void handleUpdatePreferences({ lowDataMode: !lowDataMode })
        }
        onChangeLanguage={(nextLang) =>
          void handleUpdatePreferences({ preferredLanguage: nextLang })
        }
        teacherName={user.displayName}
        onLogout={() => void handleLogout()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          language={language}
          lowDataMode={lowDataMode}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[90rem]">
            {activeSection === "prep" && (
              <LessonPrepStudio
                language={language}
                lowDataMode={lowDataMode}
                user={user}
                cases={cases}
                activeCase={activeCase}
                onSelectCase={setActiveCaseId}
                onGenerateConceptPack={handleGenerateConceptPack}
                onPatchCase={handlePatchCase}
                onGoToRehearsal={() => handleSelectSection("rehearsal")}
                onNotify={setToast}
              />
            )}

            {activeSection === "rehearsal" && (
              <RehearsalReview
                language={language}
                activeCase={activeCase}
                onRehearseTurn={handleRehearseTurn}
                onSubmitReview={handleSubmitReview}
                onSubmitFreshCase={handleSubmitFreshCase}
                onRegisterMedia={handleRegisterMedia}
                onPurgeMedia={handlePurgeMedia}
                onPatchOfflineFallback={(id) =>
                  handlePatchCase(id, { submissionFormat: "offline-fallback" })
                }
                peerLibrary={peerLibrary}
                onSaveLibraryItem={handleSaveLibraryItem}
                mentorRecording={activeCase ? mentorVideos[activeCase.id] : undefined}
                onStoreMentorVideo={handleStoreMentorVideo}
                onClearMentorVideo={handleClearMentorVideo}
                isLessonReady={Boolean(activeCase)}
                onPlanLesson={() => setActiveSection("prep")}
              />
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
                mentorVideos={mentorVideos}
              />
            )}
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-[70] w-[calc(100%-2rem)] max-w-sm shadow-lg shadow-slate-900/10">
          <Alert tone="success" onDismiss={() => setToast(null)}>
            {toast}
          </Alert>
        </div>
      )}
    </div>
  );
}
