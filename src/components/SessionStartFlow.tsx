import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { BansayLanguage, UserRole } from "../types/bansay";
import { CHED_RO_X_PROGRAMS } from "../data/chedRoXPrograms";
import { CustomSelect } from "./CustomSelect";
import { Button, Checkbox, FieldError, TextField } from "./ui";

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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const options = useMemo(() => CHED_RO_X_PROGRAMS.filter((item) => item.toLowerCase().includes(degreeQuery.toLowerCase())), [degreeQuery]);

  const complete = () => {
    setSubmitAttempted(true);
    if (!name.trim() || !degree.trim()) return;
    onComplete({ teacherName: name.trim(), degree: degree.trim(), teacherMajor: degree.trim(), schoolDivision: schoolDivision.trim(), biologicalSex, role, language, lowDataMode });
  };

  return <main className="bansay-app min-h-[100dvh] bg-[#F7F6FB] px-4 py-8 sm:px-6 sm:py-12">
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-wide text-violet-700">BANSAY · PRIVATE COACHING</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950">Set up your profile</h1><p className="mt-2 text-sm leading-6 text-slate-600">Your profile shapes future Concept Packs. Lesson intake starts in the workspace.</p></div><GraduationCap className="h-10 w-10 shrink-0 text-violet-700" /></div>
      <div className="mt-8 space-y-5">
        <div><Field label="Name"><TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria" autoComplete="given-name" aria-invalid={submitAttempted && !name.trim()} /></Field>{submitAttempted && !name.trim() && <FieldError>Enter your name to continue.</FieldError>}</div>
        <div className="relative"><Field label="College degree and major"><TextField value={degreeOpen ? degreeQuery : degree} onFocus={() => { setDegreeQuery(degree); setDegreeOpen(true); }} onChange={(e) => { setDegree(e.target.value); setDegreeQuery(e.target.value); setDegreeOpen(true); }} onBlur={() => window.setTimeout(() => setDegreeOpen(false), 150)} placeholder="Search your degree or major" autoComplete="off" aria-invalid={submitAttempted && !degree.trim()} /></Field>{submitAttempted && !degree.trim() && <FieldError>Choose or enter your degree to continue.</FieldError>}{degreeOpen && <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{options.length ? options.map((item) => <button type="button" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => { setDegree(item); setDegreeQuery(item); setDegreeOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-violet-50">{item}</button>) : <p className="px-3 py-2 text-sm text-slate-500">Use the degree or major title shown on your record.</p>}</div>}</div>
        <Field label="School or division (optional)"><TextField value={schoolDivision} onChange={(e) => setSchoolDivision(e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Biological sex"><CustomSelect value={biologicalSex} onChange={setBiologicalSex} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "prefer-not-to-say", label: "Prefer not to say" }]} ariaLabel="Biological sex" className="mt-1.5" /></Field>
          <Field label="Workspace role"><CustomSelect value={role} onChange={setRole} options={[{ value: "teacher", label: "Out-of-Field Teacher" }, { value: "mentor", label: "Subject Mentor" }, { value: "coordinator", label: "School Coordinator" }]} ariaLabel="Workspace role" className="mt-1.5" /></Field>
        </div>
        <Field label="Coaching language"><CustomSelect value={language} onChange={setLanguage} options={[{ value: "en", label: "English" }, { value: "fil", label: "Filipino" }]} ariaLabel="Coaching language" className="mt-1.5" /></Field>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700"><Checkbox checked={lowDataMode} onChange={(e) => setLowDataMode(e.target.checked)} /> Low-data mode</label>
      </div>
      <div className="mt-8 flex justify-end border-t border-slate-100 pt-6"><Button onClick={complete}>Open workspace<ArrowRight className="h-4 w-4" /></Button></div>
    </section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}
