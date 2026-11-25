import { Globe, Menu, Wifi, WifiOff } from "lucide-react";
import type { BansayLanguage, UserRole } from "../types/bansay";
import { UI_COPY } from "../data/bansayData";

interface TopBarProps {
  language: BansayLanguage;
  onChangeLanguage: (lang: BansayLanguage) => void;
  lowDataMode: boolean;
  onToggleLowDataMode: () => void;
  cachedCount: number;
  role: UserRole;
  onChangeRole: (role: UserRole) => void;
  onOpenMobileMenu: () => void;
}

export function TopBar({
  language,
  onChangeLanguage,
  lowDataMode,
  onToggleLowDataMode,
  cachedCount,
  role,
  onChangeRole,
  onOpenMobileMenu,
}: TopBarProps) {
  const copy = UI_COPY[language];

  const initials =
    role === "teacher" ? "MR" : role === "mentor" ? "RV" : "CO";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Mobile trigger + Low-Data mode + Language switch */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleLowDataMode}
            aria-pressed={lowDataMode}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-violet-600 ${
              lowDataMode
                ? "bg-violet-50 border-violet-300 text-violet-900"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {lowDataMode ? (
              <WifiOff className="w-3.5 h-3.5 text-violet-700 shrink-0" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span>{copy.lowDataMode}: {lowDataMode ? "On" : "Standard"}</span>
          </button>

          <span className="hidden sm:inline text-xs text-slate-500 tabular-nums whitespace-nowrap">
            {copy.offlineCacheReady} · {cachedCount} lessons saved
          </span>
        </div>

        {/* Right: Language switch + Role switch + Avatar */}
        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80"
            role="group"
            aria-label="Language selection"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5 hidden sm:block shrink-0" />
            {(
              [
                { code: "en", label: "English" },
                { code: "fil", label: "Filipino" },
                { code: "ceb", label: "Cebuano" },
              ] as const
            ).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onChangeLanguage(item.code)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-violet-600 ${
                  language === item.code
                    ? "bg-white text-violet-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="role-select"
              className="hidden md:inline text-xs text-slate-500 whitespace-nowrap"
            >
              {copy.viewingAs}
            </label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => onChangeRole(e.target.value as UserRole)}
              className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-violet-600"
            >
              <option value="teacher">{copy.roleTeacher}</option>
              <option value="mentor">{copy.roleMentor}</option>
              <option value="coordinator">{copy.roleCoordinator}</option>
            </select>
            <div
              className="w-8 h-8 rounded-full bg-violet-700 text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums"
              title="Active profile"
            >
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
