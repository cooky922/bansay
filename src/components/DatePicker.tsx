import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  locale?: "en" | "fil" | "ceb";
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIso = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) ? new Date(year, month - 1, day) : null;
};
const localeFor = (language: DatePickerProps["locale"]) => language === "fil" ? "fil-PH" : "en-PH";

export function DatePicker({ value, onChange, label = "Choose date", placeholder = "Select a date", locale = "en", min, max, disabled, className = "" }: DatePickerProps) {
  const selectedDate = fromIso(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selectedDate || new Date());
  const [position, setPosition] = useState<{ top: number; left: number; width: number; placement: "bottom" | "top" } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const today = toIso(new Date());
  const formatter = useMemo(() => new Intl.DateTimeFormat(localeFor(locale), { day: "numeric", month: "short", year: "numeric" }), [locale]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(localeFor(locale), { month: "long", year: "numeric" }), [locale]);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(localeFor(locale), { weekday: "narrow" }).format(new Date(2024, 0, index + 7))), [locale]);

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = 352;
    const gutter = 12;
    const roomBelow = window.innerHeight - rect.bottom - gutter;
    const placement = roomBelow >= Math.min(menuHeight, 240) ? "bottom" : "top";
    const width = Math.min(Math.max(rect.width, 304), window.innerWidth - gutter * 2);
    setPosition({
      top: placement === "bottom" ? rect.bottom + 8 : Math.max(gutter, rect.top - 8),
      left: Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter),
      width,
      placement,
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const reposition = () => place();
    window.addEventListener("mousedown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => { window.removeEventListener("mousedown", outside); window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); };
  }, [open]);

  const days = useMemo(() => {
    const year = month.getFullYear(); const monthIndex = month.getMonth();
    const leading = new Date(year, monthIndex, 1).getDay();
    const count = new Date(year, monthIndex + 1, 0).getDate();
    return [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => new Date(year, monthIndex, index + 1))];
  }, [month]);
  const unavailable = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  const choose = (date: Date) => { const iso = toIso(date); if (unavailable(iso)) return; onChange(iso); setOpen(false); triggerRef.current?.focus(); };

  return <>
    <button ref={triggerRef} type="button" disabled={disabled} onClick={() => { setMonth(selectedDate || new Date()); setOpen((current) => !current); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if ((event.key === "Enter" || event.key === "ArrowDown" || event.key === " ") && !open) { event.preventDefault(); setOpen(true); } }} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} className={`date-picker-trigger ${className}`}>
      <CalendarDays className="h-4 w-4 shrink-0 text-violet-700" /><span className="min-w-0 flex-1 truncate text-left">{selectedDate ? formatter.format(selectedDate) : placeholder}</span><span className="sr-only">{label}</span>
    </button>
    {open && position && createPortal(<div ref={menuRef} id={id} role="dialog" aria-label={label} className={`date-picker-popover ${position.placement === "top" ? "date-picker-popover-top" : ""}`} style={{ top: position.top, left: position.left, width: position.width }}>
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="icon-button"><ChevronLeft className="h-4 w-4" /></button><p className="text-sm font-semibold text-slate-900">{monthFormatter.format(month)}</p><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="icon-button"><ChevronRight className="h-4 w-4" /></button></div>
      <div className="grid grid-cols-7 gap-1 p-3 text-center"><>{weekdays.map((day, index) => <span key={`${day}-${index}`} className="py-1 text-[11px] font-semibold text-slate-500">{day}</span>)}</>{days.map((date, index) => !date ? <span key={`blank-${index}`} /> : (() => { const iso = toIso(date); const selected = iso === value; const isToday = iso === today; return <button key={iso} type="button" disabled={unavailable(iso)} onClick={() => choose(date)} aria-label={formatter.format(date)} aria-pressed={selected} className={`calendar-day ${selected ? "calendar-day-selected" : ""} ${isToday ? "calendar-day-today" : ""}`}>{date.getDate()}</button>; })())}</div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5"><button type="button" onClick={() => { setMonth(new Date()); }} className="text-xs font-semibold text-violet-700 hover:text-violet-900">Today</button>{value && <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs font-medium text-slate-600 hover:text-slate-900">Clear</button>}</div>
    </div>, document.body)}
  </>;
}
