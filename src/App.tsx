import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { LessonPrepStudio } from "./components/LessonPrepStudio";
import { RehearsalReview } from "./components/RehearsalReview";
import { CpdPortfolio } from "./components/CpdPortfolio";
import { CohortOversight } from "./components/CohortOversight";
import type {
  ActiveSection,
  BansayLanguage,
  ClassroomEvidenceItem,
  CompetencyQuarter,
  LessonCase,
  PeerLibraryItem,
  UserRole,
} from "./types/bansay";
import {
  INITIAL_CASES,
  INITIAL_COHORT_SEATS,
  INITIAL_COMPETENCY_QUARTERS,
  INITIAL_EVIDENCE_ITEMS,
  INITIAL_PEER_LIBRARY,
  TRILINGUAL_SUGAR_CASE,
} from "./data/bansayData";

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [language, setLanguage] = useState<BansayLanguage>("en");
  const [role, setRole] = useState<UserRole>("teacher");
  const [activeSection, setActiveSection] = useState<ActiveSection>("prep");
  const [lowDataMode, setLowDataMode] = useState<boolean>(() =>
    loadStored("bansay_low_data_v1", false)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [cases, setCases] = useState<LessonCase[]>(() =>
    loadStored("bansay_cases_v1", INITIAL_CASES)
  );
  const [activeCaseId, setActiveCaseId] = useState<string>(
    () => loadStored("bansay_cases_v1", INITIAL_CASES)[0]?.id || INITIAL_CASES[0].id
  );
  const [peerLibrary, setPeerLibrary] = useState<PeerLibraryItem[]>(() =>
    loadStored("bansay_library_v1", INITIAL_PEER_LIBRARY)
  );
  const [quarters, setQuarters] = useState<CompetencyQuarter[]>(
    INITIAL_COMPETENCY_QUARTERS
  );
  const [evidenceItems, setEvidenceItems] = useState<ClassroomEvidenceItem[]>(() =>
    loadStored("bansay_evidence_v1", INITIAL_EVIDENCE_ITEMS)
  );

  useEffect(() => {
    try {
      localStorage.setItem("bansay_cases_v1", JSON.stringify(cases));
    } catch {
      // ignore storage quota errors
    }
  }, [cases]);

  useEffect(() => {
    try {
      localStorage.setItem("bansay_library_v1", JSON.stringify(peerLibrary));
    } catch {
      // ignore
    }
  }, [peerLibrary]);

  useEffect(() => {
    try {
      localStorage.setItem("bansay_evidence_v1", JSON.stringify(evidenceItems));
    } catch {
      // ignore
    }
  }, [evidenceItems]);

  useEffect(() => {
    try {
      localStorage.setItem("bansay_low_data_v1", JSON.stringify(lowDataMode));
    } catch {
      // ignore
    }
  }, [lowDataMode]);

  const handleLanguageChange = (nextLang: BansayLanguage) => {
    setLanguage(nextLang);
    // Keep the flagship Grade 7 Science demonstration case seamlessly localized across EN/FIL/CEB
    const localized = TRILINGUAL_SUGAR_CASE[nextLang];
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== "case-science-sugar-01") return c;
        return {
          ...c,
          language: nextLang,
          support: {
            specialtyBridge: {
              title: localized.bridgeTitle,
              explanation: localized.bridgeExplanation,
              trySaying: localized.trySaying,
              limitationNote: localized.limitationNote,
            },
            misconceptionAlerts: localized.misconceptions,
            improvisedActivity: {
              title: localized.activityTitle,
              materials: localized.materials,
              steps: localized.steps,
              keyTakeaway: localized.keyTakeaway,
            },
            simulatedStudentPrompt: {
              ...c.support.simulatedStudentPrompt,
              openingQuestion: localized.studentQuestion,
              freshCasePrompt: localized.freshCasePrompt,
            },
          },
          rehearsalMessages: c.rehearsalMessages.map((m, idx) =>
            idx === 0 && m.sender === "student"
              ? { ...m, text: localized.studentQuestion }
              : m
          ),
          mentorReview: {
            ...c.mentorReview,
            focusedGap: localized.mentorGap,
            teachingMove: localized.mentorMove,
          },
        };
      })
    );
  };

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    if (nextRole === "mentor" || nextRole === "coordinator") {
      setActiveSection("cohort");
    } else if (activeSection === "cohort") {
      setActiveSection("prep");
    }
  };

  const activeCase = useMemo(
    () => cases.find((c) => c.id === activeCaseId) || cases[0],
    [cases, activeCaseId]
  );

  const handleCreateOrUpdateCase = (newCase: LessonCase) => {
    setCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newCase.id);
  };

  const handleUpdateCase = (updated: LessonCase) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleSaveLibraryItem = (id: string) => {
    setPeerLibrary((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, saveCount: item.saveCount + 1 } : item
      )
    );
  };

  const handleAddPeerLibraryItem = (item: PeerLibraryItem) => {
    setPeerLibrary((prev) => [item, ...prev]);
  };

  const handleAddEvidence = (item: ClassroomEvidenceItem) => {
    setEvidenceItems((prev) => [item, ...prev]);
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
  };

  const completedCompetencies = quarters.reduce(
    (sum, q) => sum + q.completedCount,
    0
  );
  const totalCompetencies = quarters.reduce((sum, q) => sum + q.targetCount, 0);
  const pendingReviewsCount = cases.filter(
    (c) => c.mentorReview.status === "pending"
  ).length;
  const cachedCount = cases.filter((c) => c.cachedOffline).length;

  return (
    <div
      className={`min-h-screen flex bg-[#F7F6FB] text-slate-900 ${
        lowDataMode ? "low-data-mode" : ""
      }`}
    >
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        language={language}
        role={role}
        completedCompetencies={completedCompetencies}
        totalCompetencies={totalCompetencies}
        pendingReviewsCount={pendingReviewsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          language={language}
          onChangeLanguage={handleLanguageChange}
          lowDataMode={lowDataMode}
          onToggleLowDataMode={() => setLowDataMode((v) => !v)}
          cachedCount={cachedCount}
          role={role}
          onChangeRole={handleRoleChange}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            {activeSection === "prep" && (
              <LessonPrepStudio
                language={language}
                lowDataMode={lowDataMode}
                cases={cases}
                activeCase={activeCase}
                onSelectCase={setActiveCaseId}
                onCreateOrUpdateCase={handleCreateOrUpdateCase}
                onUpdateActiveCase={handleUpdateCase}
                onGoToRehearsal={() => setActiveSection("rehearsal")}
              />
            )}

            {activeSection === "rehearsal" && (
              <RehearsalReview
                language={language}
                activeCase={activeCase}
                onUpdateCase={handleUpdateCase}
                peerLibrary={peerLibrary}
                onSaveLibraryItem={handleSaveLibraryItem}
                onSwitchToMentorQueue={() => {
                  setRole("mentor");
                  setActiveSection("cohort");
                }}
              />
            )}

            {activeSection === "portfolio" && (
              <CpdPortfolio
                language={language}
                quarters={quarters}
                evidenceItems={evidenceItems}
                onAddEvidence={handleAddEvidence}
                practiceHours={14.5 + (evidenceItems.length - INITIAL_EVIDENCE_ITEMS.length) * 0.5}
              />
            )}

            {activeSection === "cohort" && (
              <CohortOversight
                language={language}
                role={role === "teacher" ? "coordinator" : role}
                cases={cases}
                onUpdateCase={handleUpdateCase}
                onAddPeerLibraryItem={handleAddPeerLibraryItem}
                cohortSeats={INITIAL_COHORT_SEATS}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
