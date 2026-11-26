import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { createPortal } from "react-dom";

export type CustomSelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps<T extends string> = {
  value: T;
  options: readonly CustomSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  dark?: boolean;
};

type MenuPosition = { top: number; left: number; width: number; maxHeight: number; placement: "bottom" | "top" };

export function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  ariaLabel,
  dark = false,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const isSearchable = options.length > 6;
  const selected = options.find((option) => option.value === value);
  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)) : options;
  }, [options, query]);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const horizontalPadding = 12;
    const viewportWidth = window.innerWidth;
    const width = Math.min(Math.max(rect.width, 220), viewportWidth - horizontalPadding * 2);
    const left = Math.min(Math.max(horizontalPadding, rect.left), viewportWidth - width - horizontalPadding);
    const roomBelow = window.innerHeight - rect.bottom - 16;
    const placement = roomBelow >= 220 ? "bottom" : "top";
    setPosition({
      left,
      width,
      top: placement === "bottom" ? rect.bottom + 8 : Math.max(8, rect.top - 8),
      maxHeight: Math.max(160, Math.min(336, placement === "bottom" ? roomBelow : rect.top - 16)),
      placement,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const closeOnOutsidePress = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const refreshPosition = () => updatePosition();
    window.addEventListener("mousedown", closeOnOutsidePress);
    window.addEventListener("resize", refreshPosition);
    window.addEventListener("scroll", refreshPosition, true);
    if (isSearchable) window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("mousedown", closeOnOutsidePress);
      window.removeEventListener("resize", refreshPosition);
      window.removeEventListener("scroll", refreshPosition, true);
    };
  }, [open, isSearchable]);

  const choose = (option: CustomSelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setQuery("");
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (!disabled) {
            setQuery("");
            setOpen((current) => !current);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if ((event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`custom-select-trigger ${dark ? "custom-select-trigger-dark" : ""} ${className}`}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          className={`custom-select-menu ${position.placement === "top" ? "custom-select-menu-top" : ""} ${dark ? "custom-select-menu-dark" : ""}`}
          style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
        >
          {isSearchable && (
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 focus-within:border-violet-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} placeholder="Search options" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              </div>
            </div>
          )}
          <div className="overflow-y-auto p-1.5" style={{ maxHeight: isSearchable ? position.maxHeight - 57 : position.maxHeight }}>
            {visibleOptions.length ? visibleOptions.map((option) => {
              const isSelected = option.value === value;
              return <button key={option.value} type="button" role="option" aria-selected={isSelected} disabled={option.disabled} onClick={() => choose(option)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${isSelected ? "bg-violet-50 font-semibold text-violet-950" : "text-slate-700 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-45`}><span className="min-w-0 flex-1">{option.label}</span>{isSelected && <Check className="h-4 w-4 shrink-0 text-violet-700" />}</button>;
            }) : <p className="px-3 py-4 text-center text-sm text-slate-500">No matching options</p>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
