import {
  Award,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Globe,
  Lock,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { BansayLogo } from "./BansayLogo";
import type { ActiveSection, BansayLanguage, UserRole } from "../types/bansay";
import { UI_COPY } from "../data/bansayData";

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
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
  collapsed,
  onToggleCollapsed,
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
    ...(role === "teacher" ? [
      { id: "prep" as ActiveSection, label: "Lesson Prep Studio", icon: Sparkles, detail: "Intake, baseline, Concept Pack" },
      { id: "rehearsal" as ActiveSection, label: "Rehearsal & Review", icon: MessageSquare, detail: "Practice, correction, fresh case" },
      { id: "cohort" as ActiveSection, label: "Peer Library", icon: Users, detail: "Mentor-verified packs" },
      { id: "portfolio" as ActiveSection, label: "Teaching Portfolio", icon: Award, detail: "Private evidence and annual track" },
    ] : role === "mentor" ? [
      { id: "cohort" as ActiveSection, label: "Review Queue", icon: Users, detail: "Initial, fresh-case, post-class", hint: pendingReviewsCount ? `${pendingReviewsCount}` : undefined },
      { id: "portfolio" as ActiveSection, label: "Verified Packs", icon: Award, detail: "Packs you edited or badged" },
      { id: "prep" as ActiveSection, label: "Availability", icon: Settings, detail: "Hours, languages, backup coverage" },
    ] : [
      { id: "cohort" as ActiveSection, label: "Cohort Summary", icon: Users, detail: "Anonymous completion and demand" },
      { id: "prep" as ActiveSection, label: "Routing & SLA", icon: Sparkles, detail: "Mentor matching and deadlines" },
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
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(16rem,calc(100vw-2.5rem))] flex-col justify-between overflow-y-auto bg-[#31175B] text-white transition-[transform,width] duration-200 lg:static lg:h-auto lg:translate-x-0 lg:overflow-hidden shrink-0 ${collapsed ? "lg:w-[4.5rem]" : "lg:w-64"} ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Primary navigation"
      >
        <div>
          {/* Brand Header */}
          <div className={`flex items-center border-b border-white/10 ${collapsed ? "justify-center px-3 py-4" : "justify-between px-5 pt-5 pb-4"}`}>
            <div className="flex items-center gap-2.5">
              <BansayLogo className="w-8 h-8 shrink-0" light />
              <div className={`leading-none ${collapsed ? "lg:hidden" : ""}`}>
                <span className="font-display text-lg font-extrabold tracking-tight text-white">
                  BANSAY
                </span>
                <p className="text-[11px] text-purple-200/80 mt-0.5 whitespace-nowrap">
                  Iligan Secondary Pilot
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden lg:inline-flex rounded-lg p-1.5 text-purple-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              title={collapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          {/* Workspace Nav */}
          <div className={`pt-5 ${collapsed ? "px-2" : "px-3.5"}`}>
            <p className={`px-2.5 text-xs font-medium text-purple-200/75 mb-2 ${collapsed ? "lg:sr-only" : ""}`}>
              {role === "teacher" ? "TEACHER WORKSPACE" : role === "mentor" ? "MENTOR WORKSPACE" : "COORDINATOR / SCHOOL HEAD"}
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
                    className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-3"} gap-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white ${
                      isActive
                        ? "bg-white text-[#2B1354] shadow-sm font-semibold"
                        : "text-purple-100/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-[#5B21B6]" : "text-purple-200"
                        }`}
                      />
                      <span className={`min-w-0 ${collapsed ? "lg:sr-only" : ""}`}><span className="block truncate">{item.label}</span><span className="mt-0.5 block truncate text-[10px] font-normal opacity-70">{item.detail}</span></span>
                    </span>
                    {item.hint && !collapsed && (
                      <span
                        className={`text-xs tabular-nums font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? "bg-purple-100 text-[#4C1D95]"
                            : "bg-white/15 text-purple-100"
                        }`}
                      >
                        {item.hint}
                      </span>
                    )}
                    <span className="sr-only">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Annual Track Card & Privacy Note */}
        <div className={`pb-5 pt-4 space-y-3 ${collapsed ? "px-2" : "px-4"}`}>
          <div className={`rounded-xl bg-[#412277] border border-white/10 ${collapsed ? "p-2" : "p-4"}`}>
            <div className="flex items-center gap-2 text-purple-100 mb-2">
              <BookOpen className="w-4 h-4 text-purple-200 shrink-0" />
              <span className={`text-xs font-semibold text-white ${collapsed ? "lg:sr-only" : ""}`}>
                {copy.annualTrackTitle}
              </span>
            </div>
            <p className={`text-xs text-purple-100/85 leading-relaxed tabular-nums ${collapsed ? "lg:hidden" : ""}`}>
              <strong className="text-white font-semibold">
                {completedCompetencies} of {totalCompetencies}
              </strong>{" "}
              competencies ready for portfolio review
            </p>
            <div className={`${collapsed ? "mt-1" : "mt-3"} h-1.5 w-full rounded-full bg-white/15 overflow-hidden`}>
              <div
                className="h-full rounded-full bg-purple-300 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleNav("portfolio")}
              className={`mt-3 inline-flex items-center gap-1 text-xs font-medium text-purple-100 hover:text-white focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap ${collapsed ? "lg:hidden" : ""}`}
            >
              <span>{copy.annualTrackLink}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`rounded-xl border border-white/10 bg-white/5 ${collapsed ? "p-2" : "p-3"}`}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-300 text-xs font-bold text-[#31175B]">
                {teacherName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T"}
              </div>
              <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-xs font-semibold text-white">{teacherName}</p>
                <p className="text-[11px] capitalize text-purple-200">{role}</p>
              </div>
            </div>
          </div>

          <details className={`group rounded-xl border border-white/10 bg-white/5 ${collapsed ? "hidden" : ""}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-white">
              <span className="flex items-center gap-2"><Settings className="h-3.5 w-3.5 text-purple-200" /> Profile &amp; Settings</span><ChevronLeft className="h-3.5 w-3.5 rotate-[-90deg] text-purple-200 transition-transform group-open:rotate-90" />
            </summary>
            <div className="space-y-3 border-t border-white/10 px-3 py-3">
              <button type="button" onClick={onToggleLowDataMode} className="flex w-full items-center justify-between text-left text-xs text-purple-100 hover:text-white"><span>Low-data mode</span><span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{lowDataMode ? "On" : "Off"}</span></button>
              <div><p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-purple-200"><Globe className="h-3.5 w-3.5" /> Language</p><select value={language} onChange={(event) => onChangeLanguage(event.target.value as BansayLanguage)} className="w-full rounded-lg border border-white/15 bg-[#31175B] px-2 py-1.5 text-xs text-white focus-visible:outline-2 focus-visible:outline-white"><option value="en">English</option><option value="fil">Filipino</option></select></div>
              <p className="text-[11px] leading-relaxed text-purple-200">Offline downloads, career-stage selection, media consent, and data deletion controls are managed per lesson or account.</p>
              <button type="button" onClick={onLogout} className="w-full rounded-lg border border-white/20 px-2.5 py-2 text-left text-xs font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">Log out</button>
            </div>
          </details>

          <div className={`flex items-center gap-2 px-1 text-[11px] text-purple-200/80 ${collapsed ? "justify-center" : ""}`}>
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className={collapsed ? "lg:sr-only" : ""}>{copy.privacyNote}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
