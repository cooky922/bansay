import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { BansayLogo } from "./BansayLogo";
import type { ActiveSection, BansayLanguage, UserRole } from "../types/bansay";
import { UI_COPY } from "../data/bansayData";
import { CustomSelect } from "./CustomSelect";

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  language: BansayLanguage;
  role: UserRole;
  completedCompetencies: number;
  totalCompetencies: number;
  pendingReviewsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  lowDataMode: boolean;
  onToggleLowDataMode: () => void;
  onChangeLanguage: (language: BansayLanguage) => void;
  teacherName: string;
  onLogout: () => void;
}

export function Sidebar({
  activeSection,
  onSelectSection,
  language,
  role,
  completedCompetencies,
  totalCompetencies,
  pendingReviewsCount,
  mobileOpen,
  onCloseMobile,
  lowDataMode,
  onToggleLowDataMode,
  onChangeLanguage,
  teacherName,
  onLogout,
}: SidebarProps) {
  const copy = UI_COPY[language];
  const progressPct = Math.min(100, Math.round((completedCompetencies / totalCompetencies) * 100));

  const navItems: Array<{
    id: ActiveSection;
    label: string;
    icon: typeof Sparkles;
    hint?: string;
    detail: string;
  }> = [
    ...(role === "teacher"
      ? [
          {
            id: "prep" as ActiveSection,
            label: "Lesson Prep Studio",
            icon: Sparkles,
            detail: "Plan & Concept Pack",
          },
          {
            id: "rehearsal" as ActiveSection,
            label: "Rehearsal & Review",
            icon: MessageSquare,
            detail: "Practice & mentor feedback",
          },
          {
            id: "library" as ActiveSection,
            label: "Shared LAC Library",
            icon: Users,
            detail: "Verified lesson guides",
          },
          {
            id: "portfolio" as ActiveSection,
            label: "Teaching Portfolio",
            icon: Award,
            detail: "Classroom evidence & MOV",
          },
        ]
      : role === "mentor"
      ? [
          {
            id: "cohort" as ActiveSection,
            label: "Review Queue",
            icon: Users,
            detail: "Pack audit, transcript, fresh case",
            hint: pendingReviewsCount ? `${pendingReviewsCount}` : undefined,
          },
          {
            id: "library" as ActiveSection,
            label: "Shared LAC Library",
            icon: BookOpen,
            detail: "Published verified packs",
          },
        ]
      : [
          {
            id: "cohort" as ActiveSection,
            label: "Pilot Cohort Summary",
            icon: Users,
            detail: "Tables 4–7 & anonymized trends",
          },
        ]),
  ];

  const handleNav = (id: ActiveSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(16rem,calc(100vw-2.5rem))] flex-col justify-between overflow-y-auto bg-[#31175B] text-left text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-[100dvh] lg:w-64 lg:translate-x-0 lg:overflow-y-auto shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Primary navigation"
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <BansayLogo className="w-8 h-8 shrink-0" light />
              <div className="leading-none">
                <span className="sidebar-masthead text-lg tracking-tight text-white">
                  BANSAY
                </span>
                <p className="mt-0.5 whitespace-nowrap text-[11px] text-purple-200/80">
                  Iligan Secondary Pilot
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-purple-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Workspace Nav */}
          <div className="px-3.5 pt-5">
            <p className="mb-2 px-2.5 text-xs font-medium text-purple-200/75">
              {role === "teacher"
                ? "TEACHER WORKSPACE"
                : role === "mentor"
                ? "MENTOR WORKSPACE"
                : "COORDINATOR / SCHOOL HEAD"}
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                      isActive
                        ? "bg-white font-semibold text-[#2B1354] shadow-sm"
                        : "text-purple-100/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? "text-[#5B21B6]" : "text-purple-200"
                        }`}
                      />
                      <span className="min-w-0 text-left">
                        <span className="block truncate text-left">{item.label}</span>
                        <span className="mt-0.5 block truncate text-left text-[10px] font-normal opacity-75">
                          {item.detail}
                        </span>
                      </span>
                    </span>
                    {item.hint && (
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-xs tabular-nums ${
                          isActive
                            ? "bg-purple-100 text-[#4C1D95]"
                            : "bg-white/15 text-purple-100"
                        }`}
                      >
                        {item.hint}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Annual Track Card & Privacy Note */}
        <div className="space-y-3 px-4 pt-4 pb-5">
          {role === "teacher" && (
            <div className="rounded-xl border border-white/10 bg-[#412277] p-4">
              <div className="mb-2 flex items-center gap-2 text-purple-100">
                <BookOpen className="h-4 w-4 shrink-0 text-purple-200" />
                <span className="text-xs font-semibold text-white">
                  {copy.annualTrackTitle}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-purple-100/85 tabular-nums">
                <strong className="font-semibold text-white">
                  {completedCompetencies} of {totalCompetencies}
                </strong>{" "}
                competencies ready for portfolio review
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-purple-300 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleNav("portfolio")}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-purple-100 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                <span>{copy.annualTrackLink}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-300 text-xs font-bold text-[#31175B]">
                {teacherName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase() || "T"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{teacherName}</p>
                <p className="text-[11px] text-purple-200 capitalize">
                  {role === "teacher"
                    ? "Teacher"
                    : role === "mentor"
                    ? "Subject Mentor"
                    : "Coordinator"}
                </p>
              </div>
            </div>
          </div>

          <details className="group rounded-xl border border-white/10 bg-white/5">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-white">
              <span className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-purple-200" /> Profile &amp; Settings
              </span>
              <ChevronLeft className="h-3.5 w-3.5 rotate-[-90deg] text-purple-200 transition-transform group-open:rotate-90" />
            </summary>
            <div className="space-y-3 border-t border-white/10 px-3 py-3">
              <button
                type="button"
                onClick={onToggleLowDataMode}
                className="flex w-full items-center justify-between text-left text-xs text-purple-100 hover:text-white"
              >
                <span>Low-data mode</span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                  {lowDataMode ? "On" : "Off"}
                </span>
              </button>

              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-purple-200">
                  <Globe className="h-3.5 w-3.5" /> Language
                </p>
                <CustomSelect
                  value={language}
                  onChange={onChangeLanguage}
                  options={[
                    { value: "en", label: "English" },
                    { value: "fil", label: "Filipino" },
                    { value: "ceb", label: "Cebuano" },
                  ]}
                  ariaLabel="Language"
                  className="px-2 py-1.5 text-xs"
                  dark
                />
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-lg border border-white/20 px-2.5 py-2 text-left text-xs font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
              >
                Log out
              </button>
            </div>
          </details>

          <div className="flex items-center gap-2 px-1 text-[11px] text-purple-200/80">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>{copy.privacyNote}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
