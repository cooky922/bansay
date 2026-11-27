import { useEffect, useRef, useState } from "react";
import { offlinePackStorageKey } from "../lib/workspaceNavigation";
import type { AuthUserProfile, LessonCase } from "../types/bansay";
import { accountRoleLabel } from "./AccountMenu";

export function AccountPanel({ panel, user, cases, onClose }: {
  panel: "profile" | "downloads";
  user: AuthUserProfile;
  cases: LessonCase[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState<{ topic: string; text: string }>();
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState("");
  const downloads = panel === "downloads" ? cases.flatMap((lesson) => {
    const key = offlinePackStorageKey(user.id, lesson.id);
    try {
      const text = removed.includes(key) ? null : localStorage.getItem(key);
      return text ? [{ key, topic: lesson.topic, text }] : [];
    } catch {
      return [];
    }
  }) : [];

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="account-panel-title" className="m-auto max-h-[85dvh] w-[min(92vw,36rem)] overflow-auto rounded-2xl border border-bansay-line bg-white p-5 text-slate-900 backdrop:bg-slate-950/45">
      <div className="flex items-start justify-between gap-3">
        <h1 id="account-panel-title" className="wrap-anywhere font-bold text-bansay-deep">{panel === "profile" ? "Profile & Settings" : "Offline downloads"}</h1>
        <form method="dialog"><button type="submit" className="ui-button ui-button-secondary">Close</button></form>
      </div>
      {panel === "profile" ? (
        <dl className="mt-4 grid gap-3 wrap-anywhere text-sm">
          <div><dt className="font-semibold">Name</dt><dd>{user.displayName}</dd></div>
          <div><dt className="font-semibold">Email</dt><dd>{user.email}</dd></div>
          <div><dt className="font-semibold">Role</dt><dd>{accountRoleLabel[user.role]}</dd></div>
        </dl>
      ) : opened ? (
        <div className="mt-4 space-y-2">
          <button type="button" className="ui-button ui-button-secondary" onClick={() => setOpened(undefined)}>Back to downloads</button>
          <h2 className="wrap-anywhere font-semibold">{opened.topic}</h2>
          <pre className="whitespace-pre-wrap wrap-anywhere text-sm">{opened.text}</pre>
        </div>
      ) : (
        <div className="mt-4">
          {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
          {downloads.length ? <ul className="space-y-2">
            {downloads.map((download) => <li key={download.key} className="rounded-xl border border-bansay-line p-3">
              <p className="wrap-anywhere font-semibold">{download.topic}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="ui-button ui-button-secondary" onClick={() => setOpened(download)}>Open saved pack</button>
                <button type="button" className="ui-button ui-button-secondary" onClick={() => {
                  try {
                    localStorage.removeItem(download.key);
                    window.dispatchEvent(new Event("bansay:offline-downloads-changed"));
                    setRemoved((current) => [...current, download.key]);
                    setError("");
                  } catch {
                    setError("Could not remove the saved pack.");
                  }
                }}>Remove from this device</button>
              </div>
            </li>)}
          </ul> : <p className="text-sm text-slate-700">No Concept Packs are saved on this device.</p>}
        </div>
      )}
    </dialog>
  );
}

export function PrivacyPage() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <section id="privacy" className="max-w-2xl space-y-3 rounded-2xl border border-bansay-line bg-white p-5 text-sm text-slate-800 sm:p-7">
      <h1 ref={heading} tabIndex={-1} className="font-bold text-bansay-deep">Privacy</h1>
      <p>Your practice is private to you and your assigned mentor. Choose when to send a rehearsal to your mentor for feedback.</p>
      <p>Online rehearsal uses an AI service to generate simulated learner replies. Self-review camera recordings stay in your browser and are cleared when you leave the rehearsal or close the tab.</p>
      <p>Offline Concept Packs stay in this browser on this device. You can remove them under Offline downloads in the account menu.</p>
      <p>Portfolio exports exclude rehearsal transcripts, voice recordings, and classroom clips.</p>
    </section>
  );
}
