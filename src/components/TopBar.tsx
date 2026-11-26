import { Menu, Wifi, WifiOff } from "lucide-react";
import type { BansayLanguage } from "../types/bansay";
import { UI_COPY } from "../data/bansayData";

interface TopBarProps {
  language: BansayLanguage;
  lowDataMode: boolean;
  onOpenMobileMenu: () => void;
}

export function TopBar({
  language,
  lowDataMode,
  onOpenMobileMenu,
}: TopBarProps) {
  const copy = UI_COPY[language];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 py-3 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 sm:gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 ${
            lowDataMode ? "bg-violet-50 border-violet-200 text-violet-900" : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            {lowDataMode ? (
              <WifiOff className="w-3.5 h-3.5 text-violet-700 shrink-0" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span>{lowDataMode ? copy.lowDataMode : "Standard mode"}</span>
          </div>

        </div>
      </div>
    </header>
  );
}
