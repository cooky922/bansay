import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";

export function OfflinePackCard({
  storageKey,
  text,
  backButton,
  practiceButton,
}: {
  storageKey: string;
  text: string;
  backButton: ReactNode;
  practiceButton: ReactNode;
}) {
  const [savedText, setSavedText] = useState(() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    function syncSavedPack(event: Event) {
      if (event instanceof StorageEvent && event.key !== storageKey) return;
      try {
        setSavedText(localStorage.getItem(storageKey));
      } catch {
        // The last known saved state is still usable.
      }
    }
    window.addEventListener("storage", syncSavedPack);
    window.addEventListener("bansay:offline-downloads-changed", syncSavedPack);
    return () => {
      window.removeEventListener("storage", syncSavedPack);
      window.removeEventListener("bansay:offline-downloads-changed", syncSavedPack);
    };
  }, [storageKey]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const preview = useRef<HTMLDialogElement>(null);
  const file = new Blob([text], { type: "text/plain;charset=utf-8" });
  const saved = savedText === text;

  async function save() {
    setProgress(0);
    setError("");
    try {
      const reader = file.stream().getReader();
      let bytes = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        setProgress(Math.floor((bytes / file.size) * 100));
      }
      localStorage.setItem(storageKey, text);
      setSavedText(text);
    } catch {
      setError("Could not save the offline pack.");
    } finally {
      setProgress(null);
    }
  }

  function remove() {
    try {
      localStorage.removeItem(storageKey);
      setSavedText(null);
      setError("");
    } catch {
      setError("Could not remove the offline pack. Try again.");
    }
  }

  return (
    <div className="space-y-3">
      <aside aria-label="Offline use" className="space-y-2 rounded-xl border border-bansay-line bg-bansay-tint p-3">
        <h4 className="font-semibold text-bansay-deep">Offline use</h4>
        <p className="text-sm text-slate-800">Teaching somewhere with weak signal? Save this lesson to your device.</p>
        <p className="text-xs text-slate-600">{(file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB</p>
        <div role="status" aria-live="polite" aria-atomic="true">
          {progress !== null && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-bansay-deep">Downloading offline pack ({progress}%)</p>
              <progress aria-label="Offline pack download progress" max={100} value={progress} className="w-full accent-[var(--bansay-brand)]" />
            </div>
          )}
          {saved && <p className="flex items-center gap-1 text-sm font-semibold text-bansay-deep">Saved for offline <Check size={16} aria-hidden="true" /></p>}
          {error && <p className="text-sm text-rose-800">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="ui-button ui-button-secondary min-w-0 px-1.5! sm:px-3!" aria-disabled={progress !== null}
            onClick={() => {
              if (progress !== null) return;
              if (saved) preview.current?.showModal();
              else void save();
            }}>
            <span>{saved ? "Open saved pack" : error ? "Retry download" : "Download offline pack"}</span>
          </button>
          {saved && <button type="button" className="min-h-11 text-xs font-semibold text-bansay-strong underline" onClick={remove}>Remove from this device</button>}
        </div>
      </aside>
      <div className="flex items-center justify-between gap-2">
        {backButton}
        {practiceButton}
      </div>
      <dialog ref={preview} aria-label="Saved offline Concept Pack" className="m-auto w-[min(92vw,42rem)] rounded-2xl border border-bansay-line bg-white p-4 backdrop:bg-slate-950/45">
        <form method="dialog" className="mb-3 flex justify-end">
          <button type="submit" className="ui-button ui-button-secondary">Close saved pack</button>
        </form>
        <pre className="max-h-[65dvh] overflow-auto whitespace-pre-wrap wrap-anywhere text-sm text-slate-900">{savedText}</pre>
      </dialog>
    </div>
  );
}
