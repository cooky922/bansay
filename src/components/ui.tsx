import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, TextareaHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }) {
  return <button type="button" className={`ui-button ui-button-${variant} ${className}`} {...props}>{children}</button>;
}

export function TextField({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-input ui-textarea ${className}`} {...props} />;
}

export function Checkbox({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={`ui-checkbox ${className}`} {...props} />;
}

export function StatusBadge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "success" | "warning" | "info" }>) {
  return <span className={`ui-status ui-status-${tone}`}>{children}</span>;
}

export function Alert({ children, tone = "info", onDismiss }: PropsWithChildren<{ tone?: "info" | "success" | "warning" | "danger"; onDismiss?: () => void }>) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  return <div className={`ui-alert ui-alert-${tone}`} role={tone === "danger" ? "alert" : "status"}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0 flex-1 text-sm">{children}</div>{onDismiss && <Button variant="quiet" className="-mr-1 -my-1 h-8 min-h-8 w-8 p-0" aria-label="Dismiss notification" onClick={onDismiss}><X className="h-4 w-4" /></Button>}</div>;
}

export function Tabs<T extends string | number>({ value, onChange, items, label }: { value: T; onChange: (value: T) => void; label: string; items: Array<{ value: T; label: string; disabled?: boolean }> }) {
  return <div className="ui-tabs" role="tablist" aria-label={label}>{items.map((item) => <button key={String(item.value)} type="button" role="tab" aria-selected={value === item.value} disabled={item.disabled} onClick={() => onChange(item.value)} className={`ui-tab ${value === item.value ? "ui-tab-active" : ""}`}>{item.label}</button>)}</div>;
}

export function FieldError({ children }: PropsWithChildren) {
  return <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700" role="alert"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{children}</p>;
}
