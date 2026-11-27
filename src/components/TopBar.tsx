import { Wifi, WifiOff } from "lucide-react";
import { UI_COPY } from "../data/bansayData";
import { AccountMenu, type AccountMenuProps } from "./AccountMenu";

export function TopBar({ account }: { account: AccountMenuProps }) {
  const { preferredLanguage, lowDataMode } = account.user;
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-3 py-2 sm:px-6 sm:py-3">
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-3">
        <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ${lowDataMode
          ? "border-bansay-line bg-bansay-tint text-bansay-strong"
          : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          {lowDataMode ? <WifiOff aria-hidden="true" className="size-4 shrink-0" /> : <Wifi aria-hidden="true" className="size-4 shrink-0" />}
          <span>{lowDataMode ? UI_COPY[preferredLanguage].lowDataMode : "Standard mode"}</span>
        </div>
        <div className="sm:hidden">
          <AccountMenu {...account} mobile />
        </div>
      </div>
    </header>
  );
}
