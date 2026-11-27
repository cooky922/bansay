import { useMemo, useState } from "react";
import { BookMarked, Search, Sparkles } from "lucide-react";
import type { PeerLibraryItem, SubjectName } from "../types/bansay";
import { CustomSelect } from "./CustomSelect";

export function PeerLibrary({ peerLibrary, onSaveLibraryItem }: { peerLibrary: PeerLibraryItem[]; onSaveLibraryItem: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<"All" | SubjectName>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const results = useMemo(() => peerLibrary.filter((item) => {
    const haystack = `${item.title} ${item.summary} ${item.subjectTag}`.toLowerCase();
    return (subject === "All" || item.subject === subject) && haystack.includes(query.trim().toLowerCase());
  }), [peerLibrary, query, subject]);

  return <section className="max-w-4xl space-y-5">
    <div><h1 className="font-display text-2xl font-bold text-slate-900">Peer Library</h1><p className="mt-1 text-sm text-slate-600">Search mentor-verified ideas from participating teachers.</p></div>
    <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search peer library</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons or setups" className="input pl-9" /></label><CustomSelect value={subject} onChange={setSubject} options={[{ value: "All", label: "All subjects" }, { value: "Science", label: "Science" }, { value: "Mathematics", label: "Mathematics" }, { value: "English", label: "English" }]} ariaLabel="Filter library by subject" className="sm:w-44" /></div>
    <div className="space-y-3">{results.map((item) => { const expanded = expandedId === item.id; return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-violet-700">{item.subjectTag} · Mentor verified</p><h2 className="mt-1 font-display text-lg font-bold text-slate-900">{item.title}</h2></div><button type="button" onClick={() => setExpandedId(expanded ? null : item.id)} className="text-sm font-semibold text-violet-700 hover:text-violet-900">{expanded ? "Hide" : "Inspect"}</button></div><p className="mt-2 text-sm text-slate-600">{item.summary}</p>{expanded && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-700"><p><strong className="text-slate-900">Verified explanation:</strong> {item.verifiedExplanation}</p><p><strong className="text-slate-900">Improvised setup:</strong> {item.improvisedSetup}</p><button type="button" onClick={() => onSaveLibraryItem(item.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800"><Sparkles className="h-3.5 w-3.5" />Save to my prep notes</button></div>}</article>; })}{!results.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600"><BookMarked className="mx-auto mb-2 h-5 w-5 text-slate-400" />No verified ideas match this search.</div>}</div>
  </section>;
}
