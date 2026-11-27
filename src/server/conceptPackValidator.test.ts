import assert from "node:assert/strict";
import test from "node:test";
import { GAS_LAWS_GRADE10_FACT_SHEET, validateConceptPack } from "./conceptPackValidator.ts";
import type { ValidatedConceptPack } from "../types/bansay.ts";
import { CONCEPT_PACK_UNAVAILABLE_MESSAGE, requestConceptPack } from "../lib/conceptPackRequest.ts";

const validPack: ValidatedConceptPack = {
  grounding: { competency: "Use particle ideas to explain relationships among gas properties.", evidence_summary: "DepEd Grade 10 Matter competency S10MT-IVa-b-21 discusses gas relationships and kinetic molecular theory.", sources: [{ title: "DepEd Science Curriculum Guide", url: "https://www.deped.gov.ph/science-curriculum-guide.pdf" }] },
  say_in_class: "When a fixed amount of gas warms in a rigid container, its pressure rises. The particles move faster and strike the walls with greater force.",
  mechanism: "Kinetic molecular theory explains that heating raises the particles' average kinetic energy. The particles move faster and collide with the container walls more often and with greater force. These collisions raise the pressure while volume and amount of gas stay fixed.",
  formula: {
    law: "Gay-Lussac's law",
    equation: "P1/T1 = P2/T2",
    conditions: "Constant volume and amount of gas, and temperature measured in kelvin.",
    variables: [
      { symbol: "P1", definition: "initial pressure", unit: "atm" },
      { symbol: "T1", definition: "initial temperature", unit: "K" },
      { symbol: "P2", definition: "final pressure", unit: "atm" },
      { symbol: "T2", definition: "final temperature", unit: "K" },
    ],
  },
  bridge: {
    analogy: "A busier doorway can help picture more frequent interactions at a boundary.",
    where_it_breaks_down: "The analogy does not show gas pressure, particle speed, or collisions with container walls.",
  },
  worked_example: {
    problem: "A rigid bottle starts at 1.00 atm and warms from 27 °C (300 K) to 57 °C (330 K).",
    steps: ["Convert: 27 °C = 300 K and 57 °C = 330 K.", "Substitute: P2 = (1.00 atm × 330 K) / 300 K.", "Calculate: P2 = 1.10 atm."],
    answer: "1.10 atm",
  },
  contrast: {
    error_name: "Using Celsius in the ratio",
    wrong_work: "1.00 × 57/27 ≈ 2.1 atm, which is the wrong Celsius calculation.",
    wrong_result: "about 2.1 atm",
    why_wrong: "Gas-law temperature ratios require kelvin, not Celsius.",
  },
  misconceptions: [
    { name: "Molecules grow", what_students_say: "The molecules expand when heated.", what_is_really_happening: "Molecules do not expand; their average kinetic energy rises.", teaching_move: "Ask what changes in particle motion rather than particle size." },
    { name: "More air appears", what_students_say: "Heating adds air to the bottle.", what_is_really_happening: "Heating adds no air; the amount of gas remains fixed.", teaching_move: "Track the same trapped gas before and after heating." },
    { name: "Celsius is enough", what_students_say: "Celsius can be used directly in the ratio.", what_is_really_happening: "Convert Celsius to kelvin before using the ratio.", teaching_move: "Have learners label temperature units before substitution." },
  ],
  self_check: [0, 1, 2].map((n) => ({ question: `Question ${n + 1}: Which unit is used for the gas-law temperature ratio?`, options: [
    { text: "Kelvin", correct: true, explanation: "Kelvin is the absolute temperature scale used in the ratio." },
    { text: "Celsius", correct: false, explanation: "Celsius cannot be substituted directly into the gas-law ratio." },
    { text: "Either scale", correct: false, explanation: "The ratio requires kelvin rather than either temperature scale." },
  ] })),
  demo: {
    title: "Balloon on a bottle in warm and cool water",
    materials: GAS_LAWS_GRADE10_FACT_SHEET.approvedDemoMaterials.map((name) => ({ name, amount: GAS_LAWS_GRADE10_FACT_SHEET.demo.materialAmounts[name] })),
    steps: GAS_LAWS_GRADE10_FACT_SHEET.demo.procedure.map((instruction, i) => ({ number: i + 1, instruction })),
    expected_observation: "The balloon expands in warm water and contracts in cool water at approximately constant pressure; this is not a direct pressure test.",
    safety_note: "Use only warm, not hot, water. Keep the bottle uncapped. Never heat a capped or sealed bottle and never use a flame.",
  },
};

test("accepts the complete Grade 10 gas laws reference pack", () => {
  assert.deepEqual(validateConceptPack(validPack, GAS_LAWS_GRADE10_FACT_SHEET, "Gas Laws: Why sealed bottles expand under direct heat"), []);
  assert.deepEqual(validateConceptPack(validPack, undefined, "Custom lesson topic"), []);
});

test("rejects generic fallbacks, missing misconceptions, and incorrect arithmetic", () => {
  const bad = structuredClone(validPack) as ValidatedConceptPack;
  bad.say_in_class = "Observable classroom case that cleanly demonstrates the underlying mechanism and surface appearance.";
  bad.worked_example.answer = "2 atm";
  bad.misconceptions = [bad.misconceptions[0]];
  const errors = validateConceptPack(bad, GAS_LAWS_GRADE10_FACT_SHEET, "Gas Laws: Why sealed bottles expand under direct heat");
  assert.ok(errors.some((error) => error.includes("Banned generic phrase")));
  assert.ok(errors.some((error) => error.includes("recompute in code")));
  assert.ok(errors.some((error) => error.includes("3-4 complete misconception")));
});

test("API failure resolves to a clear unavailable state without generic content", async () => {
  let calls = 0;
  const result = await requestConceptPack(async () => {
    calls += 1;
    throw new Error("provider is unavailable");
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: false, message: CONCEPT_PACK_UNAVAILABLE_MESSAGE });
  assert.doesNotMatch(result.message, /two everyday household items|cleanly demonstrates/i);
});
