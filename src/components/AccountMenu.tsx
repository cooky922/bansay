import { useId, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { AuthUserProfile, BansayLanguage } from "../types/bansay";

export interface AccountMenuProps {
  user: AuthUserProfile;
  onChangeLanguage: (language: BansayLanguage) => void;
  onToggleLowDataMode: () => void;
  onProfile: () => void;
  onDownloads: () => void;
  onPrivacy: () => void;
  onLogout: () => void;
}

export const accountRoleLabel = {
  teacher: "Teacher",
  mentor: "Subject Mentor",
  coordinator: "Coordinator",
};

export function AccountMenu({
  user, onChangeLanguage, onToggleLowDataMode, onProfile, onDownloads, onPrivacy, onLogout, mobile,
}: AccountMenuProps & { mobile?: boolean }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const languageId = useId();
  const role = accountRoleLabel[user.role];
  const name = user.displayName || "Account";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const item = "flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-800 hover:bg-bansay-tint";

  function close() {
    if (disclosure.current) disclosure.current.open = false;
  }

  function activate(action: () => void) {
    trigger.current?.focus();
    close();
    action();
  }

  return (
    <details ref={disclosure} className="group relative"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && disclosure.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          close();
          trigger.current?.focus();
        }
      }}>
      <summary ref={trigger} aria-label={`Account menu, ${name}, ${role}`}
        className={`flex min-h-[44px] min-w-[44px] cursor-pointer list-none items-center gap-2 rounded-xl [&::-webkit-details-marker]:hidden ${mobile
          ? "justify-center text-bansay-deep hover:bg-bansay-tint"
          : "w-full justify-center text-white hover:bg-white/10 focus-visible:outline-white lg:justify-start lg:border lg:border-white/20 lg:p-2"}`}>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-purple-200 text-xs font-bold text-bansay-deep">{initials}</span>
        {!mobile && <>
          <span className="hidden min-w-0 flex-1 wrap-anywhere lg:block">
            <span className="block text-sm font-semibold">{name}</span>
            <span className="block text-[12px] text-purple-100">{role}</span>
          </span>
          <ChevronDown aria-hidden="true" className="hidden size-4 shrink-0 group-open:rotate-180 lg:block" />
        </>}
      </summary>
      <div className={`z-50 min-w-52 rounded-xl border border-bansay-line bg-white p-1.5 text-slate-900 shadow-lg ${mobile
        ? "absolute right-0 top-full mt-1 w-56"
        : "absolute bottom-0 left-full ml-2 w-56 lg:static lg:mt-2 lg:ml-0 lg:min-w-0 lg:w-full"}`}>
        <button type="button" className={item} onClick={() => activate(onProfile)}>Profile &amp; Settings</button>
        <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-x-1 px-3 text-sm font-medium text-slate-800">
          <label htmlFor={languageId}>Language</label>
          <select id={languageId} value={user.preferredLanguage} className="min-h-[44px] rounded-md bg-white text-sm text-bansay-strong"
            onChange={(event) => onChangeLanguage(event.target.value as BansayLanguage)}>
            <option value="en">English</option>
            <option value="fil">Filipino</option>
            <option value="ceb">Cebuano</option>
          </select>
        </div>
        <button type="button" className={`${item} justify-between gap-2`} aria-pressed={user.lowDataMode} onClick={onToggleLowDataMode}>
          Low-data mode <span aria-hidden="true" className="text-[12px] text-bansay-strong">{user.lowDataMode ? "On" : "Off"}</span>
        </button>
        <button type="button" className={item} onClick={() => activate(onDownloads)}>Offline downloads</button>
        <a href="#privacy" className={item} onClick={(event) => { event.preventDefault(); activate(onPrivacy); }}>Privacy</a>
        <button type="button" className={item} onClick={() => activate(onLogout)}>Sign out</button>
      </div>
    </details>
  );
}
