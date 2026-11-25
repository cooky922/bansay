import {
  Award,
  BookOpen,
  ChevronRight,
  Lock,
  MessageSquare,
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
}: SidebarProps) {
  const copy = UI_COPY[language];
  const progressPct = Math.min(100, Math.round((completedCompetencies / totalCompetencies) * 100));

  const navItems: Array<{
    id: ActiveSection;
    label: string;
    icon: typeof Sparkles;
    hint?: string;
  }> = [
    {
      id: "prep",
      label: copy.navPrep,
      icon: Sparkles,
    },
    {
      id: "rehearsal",
      label: copy.navRehearsal,
      icon: MessageSquare,
    },
    {
      id: "portfolio",
      label: copy.navPortfolio,
      icon: Award,
    },
    {
      id: "cohort",
      label: role === "mentor" ? "Mentor Review Queue" : copy.navCohort,
      icon: Users,
      hint: role === "mentor" && pendingReviewsCount > 0 ? `${pendingReviewsCount}` : undefined,
    },
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#31175B] text-white flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Primary navigation"
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <BansayLogo className="w-8 h-8 shrink-0" light />
              <div className="leading-none">
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
          </div>

          {/* Workspace Nav */}
          <div className="px-3.5 pt-5">
            <p className="px-2.5 text-xs font-medium text-purple-200/75 mb-2">
              {copy.workspaceLabel}
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
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white ${
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
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.hint && (
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
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Annual Track Card & Privacy Note */}
        <div className="px-4 pb-5 pt-4 space-y-3">
          <div className="rounded-xl bg-[#412277] border border-white/10 p-4">
            <div className="flex items-center gap-2 text-purple-100 mb-2">
              <BookOpen className="w-4 h-4 text-purple-200 shrink-0" />
              <span className="text-xs font-semibold text-white">
                {copy.annualTrackTitle}
              </span>
            </div>
            <p className="text-xs text-purple-100/85 leading-relaxed tabular-nums">
              <strong className="text-white font-semibold">
                {completedCompetencies} of {totalCompetencies}
              </strong>{" "}
              competencies ready for portfolio review
            </p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-300 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleNav("portfolio")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-purple-100 hover:text-white focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap"
            >
              <span>{copy.annualTrackLink}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-1 text-[11px] text-purple-200/80">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{copy.privacyNote}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
