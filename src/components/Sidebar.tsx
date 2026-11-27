import { Award, BookOpen, ChevronRight, MessageSquare, Sparkles, Users } from "lucide-react";
import type { ActiveSection } from "../types/bansay";
import type { AnnualTrackProgress } from "../lib/workspaceNavigation";
import { AccountMenu, type AccountMenuProps } from "./AccountMenu";
import { BansayLogo } from "./BansayLogo";

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  annualTrack?: AnnualTrackProgress;
  mentorBadge: { ready: number; waiting: number };
  pendingReviewsCount: number;
  account: AccountMenuProps;
}

const teacherItems = [
  { id: "prep", label: "Lesson Prep Studio", icon: Sparkles },
  { id: "rehearsal", label: "Rehearsal & Review", icon: MessageSquare },
  { id: "library", label: "Shared LAC Library", icon: Users },
  { id: "portfolio", label: "Teaching Portfolio", icon: Award },
] as const;

const mentorItems = [
  { id: "cohort", label: "Review Queue", icon: Users },
  { id: "library", label: "Shared LAC Library", icon: BookOpen },
] as const;

const coordinatorItems = [
  { id: "cohort", label: "Pilot Cohort Summary", icon: Users },
] as const;

export function Sidebar({ activeSection, onSelectSection, annualTrack, mentorBadge, pendingReviewsCount, account }: SidebarProps) {
  const role = account.user.role;
  const navItems = role === "teacher" ? teacherItems : role === "mentor" ? mentorItems : coordinatorItems;

  return (
    <aside className="sm:sticky sm:top-0 sm:flex sm:h-[100dvh] sm:w-16 sm:shrink-0 sm:flex-col sm:bg-bansay-deep sm:text-white lg:w-64 lg:overflow-y-auto">
      <div className="hidden min-h-16 items-center justify-center gap-2 border-b border-white/20 px-2 sm:flex lg:justify-start lg:px-4">
        <BansayLogo className="size-8 shrink-0" light />
        <span className="sidebar-masthead hidden text-lg text-white lg:block">BANSAY</span>
      </div>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/20 bg-bansay-deep px-1 pt-1 pb-[max(.25rem,env(safe-area-inset-bottom))] text-white sm:static sm:flex-col sm:gap-1 sm:border-0 sm:bg-transparent sm:p-2 lg:px-3 lg:pt-4">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          const ready = role === "teacher" && id === "rehearsal" ? mentorBadge.ready : 0;
          const waiting = role === "teacher" && id === "rehearsal" ? mentorBadge.waiting : 0;
          const queue = role === "mentor" && id === "cohort" ? pendingReviewsCount : 0;
          const status = [ready ? `${ready} mentor ${ready === 1 ? "note" : "notes"} ready` : "", waiting ? "Waiting for mentor" : "", queue ? `${queue} pending reviews` : ""].filter(Boolean).join(", ");
          return (
            <button key={id} type="button" aria-current={active ? "page" : undefined} aria-label={label}
              aria-description={status || undefined} onClick={() => onSelectSection(id)}
              className={`sidebar-nav-item relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center focus-visible:outline-white sm:w-full sm:px-2 lg:flex-row lg:justify-start lg:gap-2.5 lg:px-3 lg:py-2 lg:text-left ${active
                ? "bg-white font-semibold text-bansay-deep"
                : "text-purple-100 hover:bg-white/10 hover:text-white"}`}>
              <span className="relative shrink-0">
                <Icon aria-hidden="true" className="size-[18px]" />
                {Boolean(ready || waiting || queue) && (
                  <span aria-hidden="true" className={`absolute -right-1.5 -top-1 size-2.5 rounded-full ring-1 lg:hidden ${active ? "ring-white" : "ring-bansay-deep"} ${ready || queue ? (active ? "bg-emerald-700" : "bg-emerald-300") : (active ? "bg-amber-700" : "bg-amber-300")}`} />
                )}
              </span>
              <span className="text-[12px] leading-tight sm:hidden lg:block lg:flex-1 lg:text-sm">{label}
                {Boolean(ready || waiting || queue) && <span className={`mt-1 hidden text-[12px] font-semibold lg:block ${active ? "text-bansay-strong" : "text-white"}`}>{status}</span>}
              </span>
              <span aria-hidden="true" className="sidebar-rail-tooltip pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden w-max max-w-56 -translate-y-1/2 rounded-lg bg-bansay-deep px-2.5 py-2 text-[12px] text-white shadow-lg">
                {label}{status && <span className="block text-purple-100">{status}</span>}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto hidden space-y-2 px-2 pb-3 sm:block lg:px-3">
        {role === "teacher" && annualTrack && (
          <section aria-label="Optional annual track" className="my-2 hidden rounded-xl border border-white/20 bg-white/10 p-3 lg:block">
            <p className="text-sm font-semibold text-white">Optional annual track</p>
            <p className="mt-1 text-[12px] text-purple-100">{annualTrack.practiced} of {annualTrack.total} competencies practiced</p>
            <button type="button" onClick={() => onSelectSection("portfolio")} className="flex min-h-[44px] items-center gap-1 rounded-md text-[12px] font-semibold text-white underline focus-visible:outline-white">
              View progress <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </section>
        )}
        <AccountMenu {...account} />
      </div>
    </aside>
  );
}
