import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import type { ValidatedConceptPack } from "../types/bansay";
import { ConceptDiagram } from "./ConceptDiagram";

const STEP_LABELS = [
  "Understand",
  "Model",
  "Connect",
  "Worked example",
  "Misconceptions",
  "Self-check",
  "Teach it",
];

function isFormulaApplicable(equation: string): boolean {
  const normalized = equation.trim().toLowerCase();
  return Boolean(
    normalized &&
      normalized !== "not applicable" &&
      normalized !== "n/a" &&
      normalized !== "none"
  );
}

export function ConceptPackSteps({
  pack,
  teacherMajor,
  onSelfCheckComplete,
  onPracticeExplaining,
  progressKey,
  renderOfflineFooter,
}: {
  pack: ValidatedConceptPack;
  teacherMajor?: string;
  onSelfCheckComplete?: (score: number) => void;
  onPracticeExplaining: () => void;
  progressKey: string;
  renderOfflineFooter: (backButton: ReactNode, practiceButton: ReactNode) => ReactNode;
}) {
  const [savedProgress] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
      const validStep = (value: unknown) =>
        typeof value === "number" && Number.isInteger(value) && value >= 0 && value < STEP_LABELS.length;
      return {
        step: validStep(stored.step) ? stored.step as number : 0,
        max: validStep(stored.max) ? stored.max as number : 0,
        answers: (stored.answers ?? {}) as Record<number, number>,
        prediction: typeof stored.prediction === "string" ? stored.prediction : "",
        revealed: stored.revealed === true,
      };
    } catch {
      return { step: 0, max: 0, answers: {}, prediction: "", revealed: false };
    }
  });
  const [step, setStep] = useState(savedProgress.step);
  const [maxReachedStep, setMaxReachedStep] = useState(savedProgress.max);
  const stepPanel = useRef<HTMLElement>(null);
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  // Step 5 (Misconceptions) predict-before-reveal state
  const [teacherPrediction, setTeacherPrediction] = useState(savedProgress.prediction);
  const [misconceptionsRevealed, setMisconceptionsRevealed] = useState(savedProgress.revealed);

  // Step 6 (Self-check) quiz state
  const [answers, setAnswers] = useState<Record<number, number>>(savedProgress.answers);

  useEffect(() => {
    try {
      localStorage.setItem(progressKey, JSON.stringify({
        step,
        max: maxReachedStep,
        answers,
        prediction: teacherPrediction,
        revealed: misconceptionsRevealed,
      }));
    } catch {
      // Progress remains available while the pack is open.
    }
  }, [progressKey, step, maxReachedStep, answers, teacherPrediction, misconceptionsRevealed]);


  const goToStep = (next: number) => {
    const clamped = Math.max(0, Math.min(STEP_LABELS.length - 1, next));
    setStep(clamped);
    setMaxReachedStep((prev) => Math.max(prev, clamped));
    if (clamped !== step) window.requestAnimationFrame(() => stepPanel.current?.focus());
  };

  const progressPct = Math.round(((step + 1) / STEP_LABELS.length) * 100);
  const shortField = pack.connect.short_field_label || teacherMajor || "college";
  const hasFormula = isFormulaApplicable(pack.model.formula.equation);
  const hasLawName = isFormulaApplicable(pack.model.formula.law);

  const questions = pack.self_check.questions;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const quizScore = questions.reduce((sum, q, idx) => {
    const picked = answers[idx];
    return sum + (picked !== undefined && q.options[picked]?.correct ? 1 : 0);
  }, 0);

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (answers[questionIndex] !== undefined) return;
    const nextAnswers = { ...answers, [questionIndex]: optionIndex };
    setAnswers(nextAnswers);
    if (Object.keys(nextAnswers).length === questions.length && onSelfCheckComplete) {
      const total = questions.reduce((sum, q, idx) => {
        const picked = nextAnswers[idx];
        return sum + (picked !== undefined && q.options[picked]?.correct ? 1 : 0);
      }, 0);
      onSelfCheckComplete(total);
    }
  };

  const handleRetryQuiz = () => {
    setAnswers({});
  };

  const finalStep = step === STEP_LABELS.length - 1;
  const backButton = (
    <button type="button" disabled={step === 0} onClick={() => goToStep(step - 1)}
      className="ui-button ui-button-secondary shrink-0 px-2! sm:px-4!">
      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
    </button>
  );
  const primaryButton = (
    <button type="button" onClick={finalStep ? onPracticeExplaining : () => goToStep(step + 1)}
      className="ui-button ui-button-primary h-[48px] w-[12.5rem] shrink-0 whitespace-nowrap px-2!">
      {finalStep ? (
        <>Practice explaining this <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></>
      ) : (
        <>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></>
      )}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Progress bar (always visible; sole indicator on phones) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>
            Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
          </span>
          <span className="tabular-nums text-slate-500">{progressPct}%</span>
        </div>
        <div role="progressbar" aria-label="Concept Pack progress" aria-valuemin={1} aria-valuemax={STEP_LABELS.length} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEP_LABELS.length}, ${STEP_LABELS[step]}`} className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-bansay-action transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Desktop / tablet 7-step horizontal stepper (hidden on phones) */}
      <nav aria-label="Concept Pack steps" className="hidden sm:grid sm:grid-cols-7 gap-2">
        {STEP_LABELS.map((label, index) => {
          const isCurrent = step === index;
          const isCompleted = index < step || (index <= maxReachedStep && index !== step);
          return (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(index)}
              aria-current={isCurrent ? "step" : undefined}
              className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bansay-action ${
                isCurrent
                  ? "border-bansay-action bg-bansay-action text-white"
                  : isCompleted
                  ? "border-bansay-line bg-bansay-tint text-bansay-strong hover:bg-bansay-line"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="block mb-0.5 tabular-nums">
                {isCompleted ? <Check className="inline w-3.5 h-3.5" /> : `0${index + 1}`}
              </span>
              <span className="block leading-tight">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active step panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-7 space-y-6">
        <section ref={stepPanel} tabIndex={-1} aria-label={STEP_LABELS[step]} className="space-y-6">
          {/* STEP 1: UNDERSTAND */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-slate-900">Understand</h2>
                <p className="text-sm text-slate-600">
                  Start with the big picture in plain language before looking at formulas.
                </p>
              </div>

              <div className="space-y-2.5">
                {pack.understand.big_idea_lines.map((line, idx) => (
                  <p key={idx} className="text-base sm:text-[17px] leading-relaxed text-slate-800">
                    {line}
                  </p>
                ))}
              </div>

              <ConceptDiagram diagram={pack.understand.diagram} />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Key terms</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {pack.understand.key_terms.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3.5">
                      <dt className="text-sm font-semibold text-slate-900">{item.term}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-slate-700">
                        {item.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>


            </div>
          )}

          {/* STEP 2: MODEL */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-slate-900">Model</h2>
                <p className="text-sm text-slate-600">
                  Walk through the core mechanism step by step, including when it holds.
                </p>
              </div>

              <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 px-4 sm:px-5">
                {pack.model.steps.map((text, idx) => (
                  <li key={idx} className="flex items-start gap-3.5 py-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-900 tabular-nums">
                      {idx + 1}
                    </span>
                    <p className="text-[15px] leading-relaxed text-slate-800">{text}</p>
                  </li>
                ))}
              </ol>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">When it applies</h3>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {pack.model.when_it_applies}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">When it doesn't apply</h3>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {pack.model.when_it_does_not_apply}
                  </p>
                </div>
              </div>

              {(hasFormula || hasLawName) && (
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  {hasLawName && (
                    <p className="text-sm font-semibold text-slate-900">{pack.model.formula.law}</p>
                  )}

                  {hasFormula && (
                    <>
                      <div>
                        <button
                          type="button"
                          aria-expanded={showFormulaDetails}
                          onClick={() => setShowFormulaDetails((prev) => !prev)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bansay-action"
                        >
                          <span>
                            {showFormulaDetails ? "Hide formula & symbols" : "Show formula & symbols"}
                          </span>
                          {showFormulaDetails ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {showFormulaDetails && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
                          <div>
                            <p className="text-xs font-medium text-slate-600">Equation</p>
                            <p className="mt-1 font-mono text-xl sm:text-2xl font-bold text-slate-900">
                              {pack.model.formula.equation}
                            </p>
                          </div>
                          {pack.model.formula.variables.length > 0 && (
                            <div className="border-t border-slate-200 pt-3">
                              <p className="text-xs font-semibold text-slate-900 mb-2">
                                What each symbol means
                              </p>
                              <dl className="grid gap-2 sm:grid-cols-2">
                                {pack.model.formula.variables.map((v) => (
                                  <div
                                    key={v.symbol}
                                    className="flex items-baseline gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                  >
                                    <dt className="font-mono font-bold text-slate-900 shrink-0">
                                      {v.symbol}
                                    </dt>
                                    <dd className="text-slate-700">
                                      {v.definition}
                                      {v.unit &&
                                      v.unit.toLowerCase() !== "n/a" &&
                                      v.unit.toLowerCase() !== "none" ? (
                                        <span className="text-xs text-slate-500">
                                          {" "}
                                          · {v.unit}
                                        </span>
                                      ) : null}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CONNECT */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-slate-900">Connect</h2>
                <p className="text-sm text-slate-600">
                  Bridge this lesson through your {shortField} background—for your own study, not as
                  a classroom script.
                </p>
              </div>

              <div className="space-y-3">
                {pack.connect.mappings.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      <span>{mapping.field_feature}</span>
                      <span aria-hidden="true" className="text-slate-400">
                        →
                      </span>
                      <span>{mapping.lesson_concept}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">{mapping.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-300 bg-slate-100 p-4 sm:p-5 space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-900">Where the comparison stops</h3>
                <p className="text-sm leading-relaxed text-slate-800">
                  {pack.connect.where_comparison_stops}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: WORKED EXAMPLE */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-slate-900">Worked example</h2>
                <p className="text-sm text-slate-600">
                  Follow one complete walkthrough, then review one common mistake.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold tracking-wide text-slate-500">Problem</h3>
                  <p className="text-[15px] font-medium leading-relaxed text-slate-900">
                    {pack.worked_example.problem}
                  </p>
                </div>

                <ol className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-4">
                  {pack.worked_example.steps.map((line, i) => (
                    <li key={i} className="flex items-start gap-3 py-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-800 tabular-nums">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-slate-800">{line}</p>
                    </li>
                  ))}
                </ol>

                {/* Green reserved strictly for Final Answer */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <span className="text-xs font-semibold text-emerald-900">Final answer</span>
                  <span className="text-base font-bold text-emerald-950">
                    {pack.worked_example.answer}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Common error: {pack.worked_example.common_error.error_name}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">Wrong work & result</p>
                    <p className="text-slate-800">{pack.worked_example.common_error.wrong_work}</p>
                    <p className="text-xs font-semibold text-slate-900 pt-1">
                      Wrong result: {pack.worked_example.common_error.wrong_result}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1">
                    <p className="text-xs font-semibold text-slate-600">Why it is wrong</p>
                    <p className="text-slate-800 leading-relaxed">
                      {pack.worked_example.common_error.why_wrong}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: MISCONCEPTIONS (Predict before reveal) */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-slate-900">Misconceptions</h2>
                <p className="text-sm text-slate-600">
                  Predict how students will misunderstand this idea before checking the cards.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <label
                  htmlFor="misconception-prediction"
                  className="block text-sm font-semibold text-slate-900"
                >
                  {pack.misconceptions.prediction_prompt}
                </label>
                <textarea
                  id="misconception-prediction"
                  rows={2}
                  value={teacherPrediction}
                  onChange={(e) => setTeacherPrediction(e.target.value)}
                  placeholder="Jot down 1–2 guesses about what students might say..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
                />
                {!misconceptionsRevealed && (
                  <button
                    type="button"
                    onClick={() => setMisconceptionsRevealed(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-bansay-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-bansay-strong transition-colors"
                  >
                    <span>Reveal student misconceptions</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>

              {misconceptionsRevealed && (
                <div className="grid gap-3 md:grid-cols-2">
                  {pack.misconceptions.items.map((m, i) => (
                    <article
                      key={i}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
                    >
                      <h3 className="font-bold text-slate-900">{m.name}</h3>
                      <p className="text-sm leading-relaxed text-slate-700">
                        <strong className="text-slate-900">What students say:</strong>{" "}
                        {m.what_students_say}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700">
                        <strong className="text-slate-900">What is really happening:</strong>{" "}
                        {m.what_is_really_happening}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-800 border-t border-slate-100 pt-2">
                        <strong className="text-slate-900">Teaching move:</strong> {m.teaching_move}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 6: SELF-CHECK */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-display text-2xl font-bold text-slate-900">Self-check</h2>
                  <p className="text-sm text-slate-600">
                    Check your own grasp of the topic. Every option shows why it is right or wrong.
                  </p>
                </div>
                {answeredCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRetryQuiz}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry quiz</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {questions.map((q, qi) => {
                  const pickedIdx = answers[qi];
                  const isAnswered = pickedIdx !== undefined;
                  return (
                    <article key={qi} className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3">
                      <p className="font-semibold text-slate-900">
                        {qi + 1}. {q.question}
                      </p>
                      <div className="grid gap-2">
                        {q.options.map((o, oi) => {
                          const isPicked = pickedIdx === oi;
                          const stateStyle = !isAnswered
                            ? "border-slate-200 bg-white hover:bg-slate-50"
                            : o.correct
                            ? "border-emerald-300 bg-emerald-50"
                            : isPicked
                            ? "border-slate-400 bg-slate-100"
                            : "border-slate-200 bg-white";
                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={isAnswered}
                              onClick={() => handleSelectOption(qi, oi)}
                              className={`rounded-lg border p-3.5 text-left text-sm transition-colors ${stateStyle}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-slate-900">{o.text}</span>
                                {isAnswered && (
                                  <span className="text-xs font-semibold text-slate-700 shrink-0">
                                    {o.correct
                                      ? "Correct answer"
                                      : isPicked
                                      ? "Your choice"
                                      : "Incorrect"}
                                  </span>
                                )}
                              </div>
                              {isAnswered && (
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                                  {o.explanation}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>

              {allAnswered && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900 tabular-nums">
                      Score: {quizScore} / {questions.length}
                    </p>
                    <p className="text-xs text-slate-600">
                      {quizScore === questions.length
                        ? "All checked concepts are solid. Continue to Teach it."
                        : "Review the explanations above or retry to lock in each distinction."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryQuiz}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry quiz</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: TEACH IT */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-slate-900">Teach it</h2>
                <p className="text-sm text-slate-600">
                  Use these plain classroom lines first, then run the Predict–Observe–Explain activity.
                </p>
              </div>

              {/* Say this in class */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-2.5">
                <h3 className="text-sm font-semibold text-slate-900">Say this in class</h3>
                <ol className="space-y-2">
                  {pack.teach_it.say_in_class_lines.map((line, idx) => (
                    <li key={idx} className="text-[15px] leading-relaxed text-slate-800">
                      {line}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Predict-Observe-Explain Classroom Activity */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {pack.teach_it.activity.title}
                  </h3>
                  <span className="text-xs font-semibold text-slate-600">
                    Time needed: {pack.teach_it.activity.time_needed}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-600">Prepare before class</h4>
                    <p className="text-sm leading-relaxed text-slate-800">
                      {pack.teach_it.activity.prepare_before_class}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-600">Materials</h4>
                    {pack.teach_it.activity.materials.length > 0 ? (
                      <ul className="list-disc pl-5 text-sm text-slate-800 space-y-0.5">
                        {pack.teach_it.activity.materials.map((m, i) => (
                          <li key={i}>
                            {m.amount} — {m.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-700">Chalkboard / paper and pen only.</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <h4 className="text-xs font-semibold text-slate-600">1. Predict</h4>
                    <p className="text-sm leading-relaxed text-slate-800">
                      {pack.teach_it.activity.predict_prompt}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-600">Activity steps</h4>
                    <ol className="list-decimal pl-5 text-sm text-slate-800 space-y-1.5">
                      {pack.teach_it.activity.steps.map((s) => (
                        <li key={s.number} className="leading-relaxed">
                          {s.instruction}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                      <h4 className="text-xs font-semibold text-slate-600">2. Observe</h4>
                      <p className="text-sm leading-relaxed text-slate-800">
                        {pack.teach_it.activity.observe_prompt}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                      <h4 className="text-xs font-semibold text-slate-600">3. Explain</h4>
                      <p className="text-sm leading-relaxed text-slate-800">
                        {pack.teach_it.activity.explain_prompt}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-600">
                  <strong className="text-slate-800">Scale note: </strong>
                  {pack.teach_it.activity.scale_note}
                </p>

                {/* Yellow reserved strictly for Safety */}
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-950">
                  <strong>Safety: </strong>
                  {pack.teach_it.activity.safety_note}
                </div>
              </div>

              {pack.curriculum && !!pack.curriculum.references?.length && (
                <aside aria-label="Check against DepEd materials" className="space-y-3 rounded-xl border border-bansay-line bg-bansay-tint p-4">
                  <h3 className="font-semibold text-bansay-deep">Check against DepEd materials</h3>
                  <p className="text-sm text-slate-700">
                    <strong>{pack.curriculum.framework} &middot; {pack.curriculum.competencyCode}</strong>
                    <br />{pack.curriculum.competency}
                  </p>
                  <ul className="space-y-2">
                    {pack.curriculum.references.map((reference) => (
                      <li key={reference.url} className="space-y-0.5 text-sm">
                        <a href={reference.url} target="_blank" rel="noreferrer" className="font-semibold text-bansay-strong underline underline-offset-2">{reference.title}</a>
                        <p className="text-xs text-slate-700">
                          {reference.type}
                          {reference.page !== undefined && <> &middot; Page {reference.page}</>}
                          {reference.lesson !== undefined && <> &middot; {typeof reference.lesson === "number" ? `Lesson ${reference.lesson}` : reference.lesson}</>}
                          {" "}&middot; Last checked <time dateTime={reference.last_checked}>{reference.last_checked}</time>
                        </p>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          )}

        </section>
        <nav aria-label="Concept Pack step controls" className="border-t border-slate-200 pt-4">
          {finalStep ? renderOfflineFooter(backButton, primaryButton) : (
            <div className="flex items-center justify-between gap-2">
              {backButton}
              {primaryButton}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
