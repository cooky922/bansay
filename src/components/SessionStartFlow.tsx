import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { BansayLanguage, UserRole } from "../types/bansay";
import { CHED_RO_X_PROGRAMS } from "../data/chedRoXPrograms";

export type TeacherProfileDraft = {
  teacherName: string;
  degree: string;
  teacherMajor: string;
  schoolDivision: string;
  biologicalSex: "female" | "male" | "prefer-not-to-say";
  role: UserRole;
  language: Exclude<BansayLanguage, "ceb">;
  lowDataMode: boolean;
};

export function SessionStartFlow({ onComplete }: { onComplete: (profile: TeacherProfileDraft) => void }) {
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [schoolDivision, setSchoolDivision] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<TeacherProfileDraft["biologicalSex"]>("prefer-not-to-say");
  const [role, setRole] = useState<UserRole>("teacher");
  const [language, setLanguage] = useState<Exclude<BansayLanguage, "ceb">>("en");
  const [lowDataMode, setLowDataMode] = useState(false);
  const [degreeQuery, setDegreeQuery] = useState("");
  const [degreeOpen, setDegreeOpen] = useState(false);
  const options = useMemo(() => CHED_RO_X_PROGRAMS.filter((item) => item.toLowerCase().includes(degreeQuery.toLowerCase())), [degreeQuery]);

  const complete = () => {
    if (!name.trim() || !degree.trim()) return;
    onComplete({ teacherName: name.trim(), degree: degree.trim(), teacherMajor: degree.trim(), schoolDivision: schoolDivision.trim(), biologicalSex, role, language, lowDataMode });
  };

  return <main className="min-h-[100dvh] bg-[#F7F6FB] px-4 py-8 sm:px-6 sm:py-12">
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-violet-700">BANSAY · PRIVATE COACHING</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950">Set up your profile</h1><p className="mt-2 text-sm leading-6 text-slate-600">Your profile shapes future Concept Packs. Lesson intake starts in the workspace.</p></div><GraduationCap className="h-10 w-10 shrink-0 text-violet-700" /></div>
      <div className="mt-8 space-y-5">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Maria" autoComplete="given-name" /></Field>
        <div className="relative"><Field label="College degree and major"><input value={degreeOpen ? degreeQuery : degree} onFocus={() => { setDegreeQuery(degree); setDegreeOpen(true); }} onChange={(e) => { setDegree(e.target.value); setDegreeQuery(e.target.value); setDegreeOpen(true); }} onBlur={() => window.setTimeout(() => setDegreeOpen(false), 150)} className="input" placeholder="Search your degree or major" autoComplete="off" /></Field>{degreeOpen && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{options.length ? options.map((item) => <button type="button" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => { setDegree(item); setDegreeQuery(item); setDegreeOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-violet-50">{item}</button>) : <p className="px-3 py-2 text-sm text-slate-500">Use the degree or major title shown on your record.</p>}</div>}</div>
        <Field label="School or division (optional)"><input value={schoolDivision} onChange={(e) => setSchoolDivision(e.target.value)} className="input" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Biological sex"><select value={biologicalSex} onChange={(e) => setBiologicalSex(e.target.value as TeacherProfileDraft["biologicalSex"])} className="input"><option value="female">Female</option><option value="male">Male</option><option value="prefer-not-to-say">Prefer not to say</option></select></Field>
          <Field label="Workspace role"><select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input"><option value="teacher">Out-of-Field Teacher</option><option value="mentor">Subject Mentor</option><option value="coordinator">School Coordinator</option></select></Field>
        </div>
        <Field label="Coaching language"><select value={language} onChange={(e) => setLanguage(e.target.value as Exclude<BansayLanguage, "ceb">)} className="input"><option value="en">English</option><option value="fil">Filipino</option></select></Field>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={lowDataMode} onChange={(e) => setLowDataMode(e.target.checked)} /> Low-data mode</label>
      </div>
      <div className="mt-8 flex justify-end border-t border-slate-100 pt-6"><button type="button" disabled={!name.trim() || !degree.trim()} onClick={complete} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">Open workspace<ArrowRight className="h-4 w-4" /></button></div>
    </section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}
