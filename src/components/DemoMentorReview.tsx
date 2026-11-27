import { useRef, useState, useEffect } from "react";
import type { LessonCase } from "../types/bansay";
import { demoMentors, demoReviewContent, type DemoReviewState } from "../lib/demoMentorReview";

export function DemoMentorReview({ lesson, review, onBack, onFreshCase, onSave, onRefresher }: {
  lesson: LessonCase;
  review: DemoReviewState;
  onBack: () => void;
  onFreshCase: () => void;
  onSave: () => void;
  onRefresher: (step: number) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [saved, setSaved] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(false);
  const content = demoReviewContent(lesson, review.transcript);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <section className="space-y-4">
      <button type="button" onClick={onBack} className="ui-button ui-button-quiet">Back to rehearsal</button>
      <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">{review.sampleOnly ? "Temporary sample feedback for demonstration. This is not from a real mentor and is not saved as a mentor note." : "Sample review for demo purposes. Not from a real mentor."}</p>
      <header>
        <h1 ref={heading} tabIndex={-1} className="wrap-anywhere">{lesson.topic}</h1>
        <p className="mt-1 text-sm text-slate-700">{demoMentors(lesson.subject).mentor} <span className="rounded bg-bansay-tint px-1.5 text-bansay-strong">Demo</span> &middot; {lesson.subject} &middot; {review.reviewedAt && new Date(review.reviewedAt).toLocaleDateString()}</p>
      </header>
      <aside className="rounded-xl border border-bansay-line bg-bansay-tint p-4">
        <h2>Your one useful next step</h2><p className="mt-1">{content.move}</p>
      </aside>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["What worked", content.strong ? <>You gave the learner something specific to respond to when you said “{content.strong.text}”</> : "You made space for learner thinking."],
          ["One content correction", content.correction],
          ["One teaching move to try", content.move],
          ["Suggested refresher", <button type="button" className="text-bansay-strong underline" onClick={() => onRefresher(content.step)}>{content.refresher}</button>],
        ].map(([title, detail], index) => <section key={index} className="rounded-xl border border-slate-200 bg-white p-4"><h2>{title}</h2><p className="mt-1 text-sm wrap-anywhere">{detail}</p></section>)}
      </div>
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <h2>Annotated transcript</h2>
        <ol className="space-y-2">{review.transcript.filter((turn) => turn.sender === "teacher").map((turn) => {
          const strong = turn.id === content.strong?.id;
          const correction = turn.id === content.correctionTurn?.id;
          return <li key={turn.id} className="text-sm wrap-anywhere">
            {strong || correction ? <mark className={strong ? "bg-emerald-100 text-emerald-950" : "bg-amber-100 text-amber-950"}>{turn.text}</mark> : turn.text}
            {strong && <span className="ml-2 text-emerald-800">Strong moment</span>}
            {correction && <span className="ml-2 text-amber-900">Correction to consider</span>}
          </li>;
        })}</ol>
      </section>
      <p className="rounded-xl border border-bansay-line bg-white p-3 text-sm"><strong>{review.sampleOnly ? "Sample review scope" : "Mentor verified (demo)"}</strong> &middot; This sample illustrates a check of the explanation, example, and classroom teaching move.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onFreshCase} className="ui-button ui-button-primary">Try a fresh case</button>
        {!review.sampleOnly && <button type="button" disabled={saved} onClick={() => { onSave(); setSaved(true); }} className="ui-button ui-button-secondary">{saved ? "Saved to demo portfolio" : "Save to portfolio"}</button>}
        <button type="button" aria-expanded={followUp} onClick={() => setFollowUp((open) => !open)} className="ui-button ui-button-secondary">Ask a follow-up</button>
      </div>
      {followUp && <form className="space-y-2 rounded-xl border border-slate-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); if (question.trim()) setAnswer(true); }}>
        <label htmlFor="demo-follow-up">Follow-up for the sample mentor</label>
        <textarea id="demo-follow-up" className="ui-input ui-textarea" value={question} onChange={(event) => { setQuestion(event.target.value); setAnswer(false); }} />
        <button type="submit" disabled={!question.trim()} className="ui-button ui-button-primary">Ask sample mentor</button>
        {answer && <p role="status" className="text-sm">{content.move}</p>}
      </form>}
    </section>
  );
}
