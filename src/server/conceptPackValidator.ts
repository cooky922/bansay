import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { SubjectName, ValidatedConceptPack } from "../types/bansay.ts";

export interface ConceptPackFactSheet {
  id: string;
  subject: SubjectName;
  gradeLevel: string;
  language: "en";
  topic: string;
  topicAliases: string[];
  curriculumGrounding: "MATATAG (K-9)" | "K-12 MELCs (G10-12)";
  depedCompetency: string;
  competencyCode: string;
  mentorCoreExplanation: string;
  formula: { law: string; equation: string; conditions: string; variables: Array<{ symbol: string; definition: string; unit: string }> };
  workedExample: { initialPressureAtm: number; initialTemperatureC: number; initialTemperatureK: number; finalTemperatureC: number; finalTemperatureK: number; expectedPressureAtm: number; incorrectCelsiusPressureAtm: number };
  commonMisconceptions: string[];
  approvedDemoMaterials: string[];
  demo: { title: string; materialAmounts: Record<string, string>; procedure: string[]; expectedObservation: string; safetyNote: string };
  requiredScienceTerms: string[];
  rehearsalPrompt: { studentName: string; openingQuestion: string; freshCasePrompt: string };
  source: { title: string; competencyCode: string; url: string };
}

const factSheetPath = fileURLToPath(new URL("../data/factSheets/gas-laws-grade10.json", import.meta.url));
export const GAS_LAWS_GRADE10_FACT_SHEET = JSON.parse(fs.readFileSync(factSheetPath, "utf8")) as ConceptPackFactSheet;
const str = { type: "string", minLength: 1 } as const;
const sourceSchema = { type: "object", additionalProperties: false, properties: { title: str, url: str }, required: ["title", "url"] } as const;
const variableSchema = { type: "object", additionalProperties: false, properties: { symbol: str, definition: str, unit: str }, required: ["symbol", "definition", "unit"] } as const;
const textPairSchema = { type: "object", additionalProperties: false, properties: { text: str, correct: { type: "boolean" }, explanation: str }, required: ["text", "correct", "explanation"] } as const;

export const CONCEPT_PACK_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    grounding: { type: "object", additionalProperties: false, properties: { competency: str, evidence_summary: str, sources: { type: "array", minItems: 1, maxItems: 3, items: sourceSchema } }, required: ["competency", "evidence_summary", "sources"] },
    say_in_class: str,
    mechanism: str,
    formula: { type: "object", additionalProperties: false, properties: { law: str, equation: str, conditions: str, variables: { type: "array", minItems: 0, maxItems: 6, items: variableSchema } }, required: ["law", "equation", "conditions", "variables"] },
    bridge: { type: "object", additionalProperties: false, properties: { analogy: str, where_it_breaks_down: str }, required: ["analogy", "where_it_breaks_down"] },
    worked_example: { type: "object", additionalProperties: false, properties: { problem: str, steps: { type: "array", minItems: 2, maxItems: 5, items: str }, answer: str }, required: ["problem", "steps", "answer"] },
    contrast: { type: "object", additionalProperties: false, properties: { error_name: str, wrong_work: str, wrong_result: str, why_wrong: str }, required: ["error_name", "wrong_work", "wrong_result", "why_wrong"] },
    misconceptions: { type: "array", minItems: 3, maxItems: 4, items: { type: "object", additionalProperties: false, properties: { name: str, what_students_say: str, what_is_really_happening: str, teaching_move: str }, required: ["name", "what_students_say", "what_is_really_happening", "teaching_move"] } },
    self_check: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: false, properties: { question: str, options: { type: "array", minItems: 3, maxItems: 3, items: textPairSchema } }, required: ["question", "options"] } },
    demo: { type: "object", additionalProperties: false, properties: { title: str, materials: { type: "array", minItems: 0, maxItems: 8, items: { type: "object", additionalProperties: false, properties: { name: str, amount: str }, required: ["name", "amount"] } }, steps: { type: "array", minItems: 1, maxItems: 6, items: { type: "object", additionalProperties: false, properties: { number: { type: "integer" }, instruction: str }, required: ["number", "instruction"] } }, expected_observation: str, safety_note: str }, required: ["title", "materials", "steps", "expected_observation", "safety_note"] },
  }, required: ["grounding", "say_in_class", "mechanism", "formula", "bridge", "worked_example", "contrast", "misconceptions", "self_check", "demo"],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function strings(value: unknown): string[] { if (typeof value === "string") return [value]; if (Array.isArray(value)) return value.flatMap(strings); if (isRecord(value)) return Object.values(value).flatMap(strings); return []; }
function closeEnough(a: number, b: number, tolerance = 0.01): boolean { return Number.isFinite(a) && Math.abs(a - b) <= tolerance; }

export function findConceptPackFactSheet({ subject, gradeLevel, topic, language }: { subject: SubjectName; gradeLevel: string; topic: string; language: string }): ConceptPackFactSheet | undefined {
  const sheet = GAS_LAWS_GRADE10_FACT_SHEET;
  if (subject !== sheet.subject || gradeLevel !== sheet.gradeLevel || language !== sheet.language || !sheet.topicAliases.some((alias) => alias.toLowerCase() === topic.trim().toLowerCase())) return undefined;
  return sheet;
}

export function validateConceptPack(candidate: unknown, factSheet: ConceptPackFactSheet | undefined, topic: string): string[] {
  const errors: string[] = [];
  if (!isRecord(candidate)) return ["The response must be a JSON object."];
  const text = strings(candidate).join(" ");
  const lower = text.toLowerCase();
  const escaped = topic.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(escaped, "gi")) || [];
  if (matches.length > 3) errors.push("The full topic title may appear no more than three times.");
  for (const phrase of ["cleanly demonstrates", "underlying mechanism", "surface appearance", "two everyday household items"]) if (lower.includes(phrase)) errors.push(`Banned generic phrase found: ${phrase}.`);

  const grounding = candidate.grounding;
  if (!isRecord(grounding) || typeof grounding.competency !== "string" || grounding.competency.trim().length < 12 || typeof grounding.evidence_summary !== "string" || grounding.evidence_summary.trim().length < 24 || !Array.isArray(grounding.sources) || grounding.sources.length < 1 || grounding.sources.some((source) => !isRecord(source) || typeof source.title !== "string" || !/^https:\/\//i.test(String(source.url)))) errors.push("Grounding must include a curriculum competency, evidence summary, and at least one HTTPS source.");
  const formula = isRecord(candidate.formula) ? candidate.formula : {};
  if (!["law", "equation", "conditions"].every((key) => typeof formula[key] === "string" && String(formula[key]).trim())) errors.push("formula must state the relevant relationship, equation or N/A, and conditions.");
  if (!isRecord(candidate.bridge) || typeof candidate.bridge.analogy !== "string" || candidate.bridge.analogy.trim().length < 20 || typeof candidate.bridge.where_it_breaks_down !== "string" || candidate.bridge.where_it_breaks_down.trim().length < 20) errors.push("bridge needs a specific analogy and a clear boundary.");
  if (!isRecord(candidate.worked_example) || typeof candidate.worked_example.problem !== "string" || !Array.isArray(candidate.worked_example.steps) || candidate.worked_example.steps.length < 2 || typeof candidate.worked_example.answer !== "string") errors.push("worked_example must show a problem, multiple steps, and an answer.");
  const contrast = isRecord(candidate.contrast) ? candidate.contrast : {};
  if (!["error_name", "wrong_work", "wrong_result", "why_wrong"].every((key) => typeof contrast[key] === "string" && String(contrast[key]).trim())) errors.push("contrast must name a likely error and explain the correction.");

  const say = candidate.say_in_class;
  if (typeof say !== "string" || say.split(/[.!?]+/).filter((s) => s.trim()).length < 2 || say.split(/[.!?]+/).filter((s) => s.trim()).length > 3) errors.push("say_in_class must contain two or three classroom-ready sentences.");
  if (typeof candidate.mechanism !== "string" || candidate.mechanism.split(/[.!?]+/).filter((s) => s.trim()).length !== 3) errors.push("mechanism must contain exactly three sentences.");

  const misconceptions = Array.isArray(candidate.misconceptions) ? candidate.misconceptions : [];
  if (misconceptions.length < 3 || misconceptions.length > 4 || misconceptions.some((m) => !isRecord(m) || !["name", "what_students_say", "what_is_really_happening", "teaching_move"].every((k) => typeof m[k] === "string" && String(m[k]).trim()))) errors.push("misconceptions must include 3-4 complete misconception and teaching-move entries.");
  const checks = Array.isArray(candidate.self_check) ? candidate.self_check : [];
  if (checks.length !== 3 || checks.some((q) => !isRecord(q) || !Array.isArray(q.options) || q.options.length !== 3 || q.options.filter((o) => isRecord(o) && o.correct === true).length !== 1 || q.options.some((o) => !isRecord(o) || typeof o.text !== "string" || typeof o.explanation !== "string" || o.explanation.trim().length < 12))) errors.push("self_check needs three science questions with three explained options and one correct answer each.");

  if (!isRecord(candidate.demo) || !Array.isArray(candidate.demo.materials) || !Array.isArray(candidate.demo.steps) || candidate.demo.steps.length < 1 || typeof candidate.demo.expected_observation !== "string" || typeof candidate.demo.safety_note !== "string" || !String(candidate.demo.title || "").trim()) errors.push("demo must include materials, steps, an observation, and a safety note.");
  else {
    const demo = candidate.demo;
    const steps = Array.isArray(demo.steps) ? demo.steps : [];
    const materialsInput = Array.isArray(demo.materials) ? demo.materials : [];
    if (steps.some((step: unknown, i: number) => !isRecord(step) || step.number !== i + 1 || typeof step.instruction !== "string")) errors.push("demo steps must be numbered in order.");
    const demoText = strings(steps).join(" ").toLowerCase();
    if (/\b(?:open flame|flame|burner|campfire)\b/.test(demoText) || /\b(?:heat|warm|place|put|expose)\b.{0,50}\b(?:sealed|capped)\b.{0,20}\b(?:bottle|container|can)\b/.test(demoText)) errors.push("demo must not use an open flame or heat a sealed/capped container.");
    if (factSheet) {
      const approved = new Set(factSheet.approvedDemoMaterials.map((name) => name.toLowerCase()));
      const materials = materialsInput.filter(isRecord);
      const names = materials.map((m: Record<string, unknown>) => String(m.name || "").toLowerCase().trim());
      if (materials.length !== approved.size || names.some((name) => !approved.has(name)) || new Set(names).size !== names.length) errors.push("demo materials must use only the approved fact-sheet whitelist.");
      if (materials.some((m: Record<string, unknown>) => m.amount !== factSheet.demo.materialAmounts[String(m.name).toLowerCase().trim()])) errors.push("demo material amounts must match the fact sheet.");
      if (!String(demo.safety_note).toLowerCase().includes("never heat") || !String(demo.safety_note).toLowerCase().includes("flame")) errors.push("demo safety note must prohibit heating sealed bottles and using a flame.");
      for (const term of factSheet.requiredScienceTerms) if (!lower.includes(term.toLowerCase())) errors.push(`Missing fact-sheet science term/value: ${term}.`);
      const example = isRecord(candidate.worked_example) ? candidate.worked_example : {};
      const stepText = Array.isArray(example.steps) ? example.steps.join(" ") : "";
      const p1 = Number(stepText.match(/1\.00\s*atm/i)?.[0]?.match(/[\d.]+/)?.[0]);
      const t1 = Number(stepText.match(/300\s*K/i)?.[0]?.match(/[\d.]+/)?.[0]);
      const t2 = Number(stepText.match(/330\s*K/i)?.[0]?.match(/[\d.]+/)?.[0]);
      const calculated = p1 * t2 / t1;
      if (![p1, t1, t2].every(Number.isFinite) || !closeEnough(calculated, factSheet.workedExample.expectedPressureAtm) || !String(example.answer).includes(calculated.toFixed(2))) errors.push("Gas-law worked-example numbers must recompute in code to 1.10 atm using 1.00 atm, 300 K, and 330 K.");
      if (!lower.includes("27 °c") || !lower.includes("57 °c") || !lower.includes("2.1 atm")) errors.push("Gas-law example and contrast must show both Celsius temperatures and the incorrect result of about 2.1 atm.");
    }
  }
  return [...new Set(errors)];
}

export function isValidatedConceptPack(value: unknown, factSheet?: ConceptPackFactSheet, topic = ""): value is ValidatedConceptPack { return validateConceptPack(value, factSheet, topic).length === 0; }
