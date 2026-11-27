import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  DiagramTemplateType,
  FactSheetReference,
  SubjectName,
  ValidatedConceptPack,
} from "../types/bansay.ts";

export interface ConceptPackFactSheet {
  id: string;
  subject: SubjectName;
  gradeLevel: string;
  language: "en" | "fil" | "ceb";
  topic: string;
  topicAliases: string[];
  curriculumGrounding: "MATATAG (K-9)" | "K-12 MELCs (G10-12)";
  depedCompetency: string;
  competencyCode: string;
  mentorCoreExplanation: string;
  formula: {
    law: string;
    equation: string;
    conditions: string;
    variables: Array<{ symbol: string; definition: string; unit: string }>;
  };
  workedExample?: {
    initialPressureAtm: number;
    initialTemperatureC: number;
    initialTemperatureK: number;
    finalTemperatureC: number;
    finalTemperatureK: number;
    expectedPressureAtm: number;
    incorrectCelsiusPressureAtm: number;
  };
  commonMisconceptions: string[];
  approvedDemoMaterials: string[];
  demo?: {
    title: string;
    materialAmounts: Record<string, string>;
    procedure: string[];
    expectedObservation: string;
    safetyNote: string;
  };
  requiredScienceTerms: string[];
  rehearsalPrompt?: {
    openingQuestion: string;
    freshCasePrompt: string;
  };
  references?: FactSheetReference[];
}

export interface ValidateConceptPackOptions {
  teacherDegree?: string;
  teacherMajor?: string;
}

const factSheetPath = fileURLToPath(new URL("../data/factSheets/gas-laws-grade10.json", import.meta.url));
export const GAS_LAWS_GRADE10_FACT_SHEET = JSON.parse(
  fs.readFileSync(factSheetPath, "utf8")
) as ConceptPackFactSheet;

const DIAGRAM_TEMPLATES: DiagramTemplateType[] = [
  "two-panel-comparison",
  "process-flow",
  "cycle",
  "labeled-parts",
  "number-line",
];

const str = { type: "string", minLength: 1 } as const;

export const CONCEPT_PACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    understand: {
      type: "object",
      additionalProperties: false,
      properties: {
        big_idea_lines: { type: "array", minItems: 3, maxItems: 3, items: str },
        diagram: {
          type: "object",
          additionalProperties: false,
          properties: {
            template: { type: "string", enum: DIAGRAM_TEMPLATES },
            title: str,
            caption: str,
            items: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                properties: { label: str, detail: str },
                required: ["label", "detail"],
              },
            },
          },
          required: ["template", "title", "caption", "items"],
        },
        key_terms: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: { term: str, definition: str },
            required: ["term", "definition"],
          },
        },
      },
      required: ["big_idea_lines", "diagram", "key_terms"],
    },
    model: {
      type: "object",
      additionalProperties: false,
      properties: {
        steps: { type: "array", minItems: 3, maxItems: 5, items: str },
        when_it_applies: str,
        when_it_does_not_apply: str,
        formula: {
          type: "object",
          additionalProperties: false,
          properties: {
            law: str,
            equation: str,
            variables: {
              type: "array",
              minItems: 0,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                properties: { symbol: str, definition: str, unit: str },
                required: ["symbol", "definition", "unit"],
              },
            },
          },
          required: ["law", "equation", "variables"],
        },
      },
      required: ["steps", "when_it_applies", "when_it_does_not_apply", "formula"],
    },
    connect: {
      type: "object",
      additionalProperties: false,
      properties: {
        short_field_label: str,
        mappings: {
          type: "array",
          minItems: 2,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: { field_feature: str, lesson_concept: str, explanation: str },
            required: ["field_feature", "lesson_concept", "explanation"],
          },
        },
        where_comparison_stops: str,
      },
      required: ["short_field_label", "mappings", "where_comparison_stops"],
    },
    worked_example: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["quantitative", "conceptual"] },
        problem: str,
        steps: { type: "array", minItems: 2, maxItems: 5, items: str },
        answer: str,
        verification: {
          type: "object",
          additionalProperties: false,
          properties: {
            expression: { type: "string" },
            result: { type: "number" },
            unit: { type: "string" },
          },
          required: ["expression", "result", "unit"],
        },
        common_error: {
          type: "object",
          additionalProperties: false,
          properties: {
            error_name: str,
            wrong_work: str,
            wrong_result: str,
            why_wrong: str,
          },
          required: ["error_name", "wrong_work", "wrong_result", "why_wrong"],
        },
      },
      required: ["kind", "problem", "steps", "answer", "verification", "common_error"],
    },
    misconceptions: {
      type: "object",
      additionalProperties: false,
      properties: {
        prediction_prompt: str,
        items: {
          type: "array",
          minItems: 3,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: str,
              what_students_say: str,
              what_is_really_happening: str,
              teaching_move: str,
            },
            required: ["name", "what_students_say", "what_is_really_happening", "teaching_move"],
          },
        },
      },
      required: ["prediction_prompt", "items"],
    },
    self_check: {
      type: "object",
      additionalProperties: false,
      properties: {
        questions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: str,
              options: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: str,
                    correct: { type: "boolean" },
                    explanation: str,
                  },
                  required: ["text", "correct", "explanation"],
                },
              },
            },
            required: ["question", "options"],
          },
        },
      },
      required: ["questions"],
    },
    teach_it: {
      type: "object",
      additionalProperties: false,
      properties: {
        say_in_class_lines: { type: "array", minItems: 3, maxItems: 3, items: str },
        activity: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: str,
            time_needed: str,
            prepare_before_class: str,
            materials: {
              type: "array",
              minItems: 0,
              maxItems: 8,
              items: {
                type: "object",
                additionalProperties: false,
                properties: { name: str, amount: str },
                required: ["name", "amount"],
              },
            },
            predict_prompt: str,
            steps: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                properties: { number: { type: "integer" }, instruction: str },
                required: ["number", "instruction"],
              },
            },
            observe_prompt: str,
            explain_prompt: str,
            scale_note: str,
            safety_note: str,
          },
          required: [
            "title",
            "time_needed",
            "prepare_before_class",
            "materials",
            "predict_prompt",
            "steps",
            "observe_prompt",
            "explain_prompt",
            "scale_note",
            "safety_note",
          ],
        },
      },
      required: ["say_in_class_lines", "activity"],
    },
  },
  required: [
    "understand",
    "model",
    "connect",
    "worked_example",
    "misconceptions",
    "self_check",
    "teach_it",
  ],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (isRecord(value)) return Object.values(value).flatMap(strings);
  return [];
}

function closeEnough(a: number, b: number, tolerance = 0.02): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

export function shortFieldName(majorOrDegree: string): string {
  const cleaned = majorOrDegree
    .trim()
    .replace(
      /^(?:bachelor|master|doctor)\s+of\s+(?:science|arts|education|secondary\s+education|elementary\s+education)\s+(?:in\s+|major\s+in\s+)?/i,
      ""
    )
    .replace(/^(?:bsed|beed|bsba|bs|ba|ab|bscs|bsit)\s+(?:in\s+|major\s+in\s+)?/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
  return cleaned || majorOrDegree.trim() || "General Education";
}

export function evaluateArithmeticExpression(rawExpr: string): number | null {
  const normalized = rawExpr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s+/g, "");
  if (!normalized || !/^[0-9+\-*/^().]+$/.test(normalized)) {
    return null;
  }

  let index = 0;

  const parseExpression = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;
    while (index < normalized.length && (normalized[index] === "+" || normalized[index] === "-")) {
      const op = normalized[index++];
      const right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number | null => {
    let left = parsePower();
    if (left === null) return null;
    while (index < normalized.length && (normalized[index] === "*" || normalized[index] === "/")) {
      const op = normalized[index++];
      const right = parsePower();
      if (right === null) return null;
      if (op === "/") {
        if (Math.abs(right) < 1e-12) return null;
        left /= right;
      } else {
        left *= right;
      }
    }
    return left;
  };

  const parsePower = (): number | null => {
    const base = parseUnary();
    if (base === null) return null;
    if (index < normalized.length && normalized[index] === "^") {
      index++;
      const exponent = parsePower();
      if (exponent === null) return null;
      return Math.pow(base, exponent);
    }
    return base;
  };

  const parseUnary = (): number | null => {
    if (normalized[index] === "+") {
      index++;
      return parseUnary();
    }
    if (normalized[index] === "-") {
      index++;
      const val = parseUnary();
      return val === null ? null : -val;
    }
    return parsePrimary();
  };

  const parsePrimary = (): number | null => {
    if (normalized[index] === "(") {
      index++;
      const inner = parseExpression();
      if (inner === null || normalized[index] !== ")") return null;
      index++;
      return inner;
    }
    const start = index;
    let sawDigit = false;
    let sawDot = false;
    while (index < normalized.length) {
      const ch = normalized[index];
      if (ch >= "0" && ch <= "9") {
        sawDigit = true;
        index++;
      } else if (ch === "." && !sawDot) {
        sawDot = true;
        index++;
      } else {
        break;
      }
    }
    if (!sawDigit) return null;
    const parsed = Number(normalized.slice(start, index));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const value = parseExpression();
  if (value === null || index !== normalized.length || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

export function countTopicOccurrences(text: string, topic: string): number {
  const trimmed = topic.trim();
  if (!trimmed) return 0;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWord = /^[a-z0-9]/i.test(trimmed);
  const endsWord = /[a-z0-9]$/i.test(trimmed);
  const pattern = `${startsWord ? "\\b" : ""}${escaped}${endsWord ? "\\b" : ""}`;
  return (text.match(new RegExp(pattern, "gi")) || []).length;
}

export function countSentences(text: string): number {
  const sanitized = text
    .trim()
    .replace(/(\d)\.(\d)/g, "$1<DOT>$2")
    .replace(/\b(?:e\.g|i\.e|vs|approx|etc|Fig|No|St|Dr|Prof|Mr|Mrs|Ms|Inc|Jr|Sr)\./gi, (match) =>
      match.replace(/\./g, "<DOT>")
    );

  return sanitized
    .split(/[.!?]+/)
    .map((part) => part.replace(/<DOT>/g, ".").trim())
    .filter((part) => /[a-z0-9\u00C0-\u024F]/i.test(part)).length;
}

function parseFactSheetReferences(value: unknown): FactSheetReference[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("Fact sheet references must be an array.");
  return value.map((entry) => {
    const hasLabel = (item: unknown) => typeof item === "number" ||
      (typeof item === "string" && Boolean(item.trim()));
    if (!isRecord(entry) ||
        typeof entry.title !== "string" || !entry.title.trim() ||
        typeof entry.type !== "string" || !entry.type.trim() ||
        !hasLabel(entry.grade) || !hasLabel(entry.quarter) ||
        typeof entry.last_checked !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.last_checked) ||
        typeof entry.url !== "string") {
      throw new Error("Each fact sheet reference needs a title, type, grade, quarter, HTTPS URL, and last_checked date (YYYY-MM-DD).");
    }
    const url = new URL(entry.url);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Fact sheet references require public HTTPS URLs.");
    return {
      title: entry.title,
      type: entry.type,
      grade: entry.grade as string | number,
      quarter: entry.quarter as string | number,
      last_checked: entry.last_checked,
      url: url.href,
      page: hasLabel(entry.page) ? entry.page as string | number : new URLSearchParams(url.hash.slice(1)).get("page") ?? undefined,
      lesson: hasLabel(entry.lesson) ? entry.lesson as string | number : undefined,
    };
  });
}

export function parseOptionalFactSheet(
  raw: unknown,
  context: {
    subject: SubjectName;
    gradeLevel: string;
    topic: string;
    language: "en" | "fil" | "ceb";
  }
): ConceptPackFactSheet | undefined {
  if (raw === undefined || raw === null) return undefined;
  let parsedObj: Record<string, unknown> | null = null;
  let rawText = "";

  if (typeof raw === "string") {
    rawText = raw.trim();
    if (!rawText) return undefined;
    if (rawText.startsWith("{")) {
      try {
        const candidate = JSON.parse(rawText);
        if (!isRecord(candidate)) {
          throw new Error("Fact sheet JSON must be an object.");
        }
        parsedObj = candidate;
      } catch (err) {
        throw new Error(
          err instanceof Error ? `Invalid fact sheet JSON: ${err.message}` : "Invalid fact sheet JSON."
        );
      }
    }
  } else if (isRecord(raw)) {
    parsedObj = raw;
  } else {
    throw new Error("Fact sheet must be JSON or plain text.");
  }

  if (parsedObj) {
    const depedCompetency = String(
      parsedObj.depedCompetency || parsedObj.competency || ""
    ).trim();
    const competencyCode = String(
      parsedObj.competencyCode || parsedObj.code || ""
    ).trim();
    const mentorCoreExplanation = String(
      parsedObj.mentorCoreExplanation || parsedObj.coreExplanation || parsedObj.explanation || ""
    ).trim();
    const requiredScienceTerms = Array.isArray(parsedObj.requiredScienceTerms)
      ? parsedObj.requiredScienceTerms.map(String).filter(Boolean)
      : Array.isArray(parsedObj.keyTerms)
      ? parsedObj.keyTerms.map((k) => (isRecord(k) ? String(k.term || "") : String(k))).filter(Boolean)
      : [];
    const approvedDemoMaterials = Array.isArray(parsedObj.approvedDemoMaterials)
      ? parsedObj.approvedDemoMaterials.map(String).filter(Boolean)
      : Array.isArray(parsedObj.approvedMaterials)
      ? parsedObj.approvedMaterials.map(String).filter(Boolean)
      : [];
    const commonMisconceptions = Array.isArray(parsedObj.commonMisconceptions)
      ? parsedObj.commonMisconceptions.map(String).filter(Boolean)
      : Array.isArray(parsedObj.misconceptions)
      ? parsedObj.misconceptions.map(String).filter(Boolean)
      : [];

    if (!depedCompetency || !mentorCoreExplanation) {
      throw new Error(
        "Attached JSON fact sheet is missing required competency or core explanation."
      );
    }

    const formulaRaw = isRecord(parsedObj.formula) ? parsedObj.formula : {};
    const curriculumGrounding =
      Number(context.gradeLevel.replace(/\D+/g, "")) >= 10
        ? "K-12 MELCs (G10-12)"
        : "MATATAG (K-9)";

    return {
      id: String(parsedObj.id || `custom-sheet-${context.subject.toLowerCase()}`),
      subject: context.subject,
      gradeLevel: context.gradeLevel,
      language: context.language,
      topic: String(parsedObj.topic || context.topic),
      topicAliases: [String(parsedObj.topic || context.topic)],
      curriculumGrounding,
      depedCompetency,
      competencyCode: competencyCode || "Mentor-supplied",
      mentorCoreExplanation,
      formula: {
        law: String(formulaRaw.law || "Not applicable"),
        equation: String(formulaRaw.equation || "Not applicable"),
        conditions: String(formulaRaw.conditions || "See mentor fact sheet."),
        variables: Array.isArray(formulaRaw.variables)
          ? (formulaRaw.variables as Array<{ symbol: string; definition: string; unit: string }>)
          : [],
      },
      workedExample: isRecord(parsedObj.workedExample)
        ? (parsedObj.workedExample as ConceptPackFactSheet["workedExample"])
        : undefined,
      commonMisconceptions,
      approvedDemoMaterials,
      demo: isRecord(parsedObj.demo)
        ? (parsedObj.demo as ConceptPackFactSheet["demo"])
        : undefined,
      requiredScienceTerms,
      rehearsalPrompt: isRecord(parsedObj.rehearsalPrompt)
        ? (parsedObj.rehearsalPrompt as ConceptPackFactSheet["rehearsalPrompt"])
        : undefined,
      references: parseFactSheetReferences(parsedObj.references),
    };
  }

  // Plain-text fact sheet parsing
  const extractLine = (label: RegExp) => {
    const match = rawText.match(label);
    return match?.[1]?.trim() || "";
  };
  const competency =
    extractLine(/(?:^|\n)\s*(?:competency|deped competency)\s*:\s*(.+)/i) ||
    rawText.split(/\n+/)[0]?.trim() ||
    "";
  const code = extractLine(/(?:^|\n)\s*(?:competency code|code)\s*:\s*(.+)/i) || "Mentor-supplied";
  const core =
    extractLine(/(?:^|\n)\s*(?:core explanation|explanation|summary)\s*:\s*(.+)/i) || rawText;
  const termsLine = extractLine(/(?:^|\n)\s*(?:key terms|required terms|terms)\s*:\s*(.+)/i);
  const materialsLine = extractLine(
    /(?:^|\n)\s*(?:approved materials|materials)\s*:\s*(.+)/i
  );
  const misconceptionsLine = extractLine(/(?:^|\n)\s*(?:misconceptions)\s*:\s*(.+)/i);

  if (competency.length < 10 || core.length < 20) {
    throw new Error(
      "Attached text fact sheet must include a competency and a core explanation."
    );
  }

  const curriculumGrounding =
    Number(context.gradeLevel.replace(/\D+/g, "")) >= 10
      ? "K-12 MELCs (G10-12)"
      : "MATATAG (K-9)";

  return {
    id: `text-sheet-${context.subject.toLowerCase()}`,
    subject: context.subject,
    gradeLevel: context.gradeLevel,
    language: context.language,
    topic: context.topic,
    topicAliases: [context.topic],
    curriculumGrounding,
    depedCompetency: competency,
    competencyCode: code,
    mentorCoreExplanation: core,
    formula: {
      law: extractLine(/(?:^|\n)\s*(?:law|formula name)\s*:\s*(.+)/i) || "Not applicable",
      equation: extractLine(/(?:^|\n)\s*(?:equation|formula)\s*:\s*(.+)/i) || "Not applicable",
      conditions: "Follow the attached mentor fact sheet.",
      variables: [],
    },
    commonMisconceptions: misconceptionsLine
      ? misconceptionsLine.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
      : [],
    approvedDemoMaterials: materialsLine
      ? materialsLine.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
      : [],
    requiredScienceTerms: termsLine
      ? termsLine.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

export function findConceptPackFactSheet({
  subject,
  gradeLevel,
  topic,
  language,
  customFactSheet,
}: {
  subject: SubjectName;
  gradeLevel: string;
  topic: string;
  language: string;
  customFactSheet?: ConceptPackFactSheet;
}): ConceptPackFactSheet | undefined {
  if (customFactSheet) return customFactSheet;
  const sheet = GAS_LAWS_GRADE10_FACT_SHEET;
  if (
    subject !== sheet.subject ||
    gradeLevel !== sheet.gradeLevel ||
    language !== sheet.language ||
    !sheet.topicAliases.some((alias) => alias.toLowerCase() === topic.trim().toLowerCase())
  ) {
    return undefined;
  }
  return sheet;
}

export function validateModelSources(candidate: unknown, factSheet?: ConceptPackFactSheet): string[] {
  if (!isRecord(candidate)) return [];
  const text = strings(candidate).join(" ");
  const competency = factSheet?.depedCompetency.trim().replace(/\s+/g, " ").toLowerCase();
  if ("curriculum" in candidate || "references" in candidate ||
      /(?:https?:\/\/|www\.|deped\.gov\.ph|\b[A-Z]{1,5}\d{1,2}[A-Z]{1,6}-[IVX]{1,4}-?[a-z]{1,3}(?:-[a-z]{1,3})?-\d+\b)/i.test(text) ||
      Boolean(competency && text.replace(/\s+/g, " ").toLowerCase().includes(competency))) {
    return ["Do not include curriculum metadata, competency codes, curriculum quotes, or URLs in model output."];
  }
  return [];
}

export function validateConceptPack(
  candidate: unknown,
  factSheet: ConceptPackFactSheet | undefined,
  topic: string,
  options: ValidateConceptPackOptions = {}
): string[] {
  const errors: string[] = [];
  if (!isRecord(candidate)) return ["The response must be a JSON object."];

  const allText = strings(candidate).join(" ");
  const lower = allText.toLowerCase();

  // 1. Topic title appears no more than 3 times in the whole pack
  if (topic.trim()) {
    const topicCount = countTopicOccurrences(allText, topic);
    if (topicCount > 3) {
      errors.push(`The full topic title appears ${topicCount} times; it must appear no more than 3 times.`);
    }
  }

  // 2. Degree name is not repeated more than once
  const rawDegree = options.teacherDegree?.trim();
  if (rawDegree && rawDegree.length >= 6) {
    const degreeCount = countTopicOccurrences(allText, rawDegree);
    if (degreeCount > 1) {
      errors.push("The full teacher degree name must not be repeated more than once.");
    }
  }

  // 3. Banned generic phrases
  for (const phrase of [
    "cleanly demonstrates",
    "underlying mechanism",
    "surface appearance",
    "observable classroom case",
    "two everyday household items",
  ]) {
    if (lower.includes(phrase)) {
      errors.push(`Banned generic phrase found: ${phrase}.`);
    }
  }

  // Never output raw SVG anywhere
  if (/<svg[\s>]/i.test(allText)) {
    errors.push("Diagrams must use structured template fields and never contain raw SVG.");
  }

  // Step 1: Understand
  const understand = candidate.understand;
  if (!isRecord(understand)) {
    errors.push("Step 1 (understand) is required.");
  } else {
    const bigIdea = Array.isArray(understand.big_idea_lines) ? understand.big_idea_lines : [];
    if (
      bigIdea.length !== 3 ||
      bigIdea.some((line) => typeof line !== "string" || line.trim().length < 12)
    ) {
      errors.push("understand.big_idea_lines must contain 3 clear plain-language lines.");
    }

    const diagram = understand.diagram;
    if (!isRecord(diagram)) {
      errors.push("understand.diagram is required.");
    } else {
      if (!DIAGRAM_TEMPLATES.includes(diagram.template as DiagramTemplateType)) {
        errors.push(`understand.diagram.template must be one of: ${DIAGRAM_TEMPLATES.join(", ")}.`);
      }
      if (typeof diagram.title !== "string" || !diagram.title.trim()) {
        errors.push("understand.diagram.title is required.");
      }
      if (typeof diagram.caption !== "string" || diagram.caption.trim().length < 10) {
        errors.push("understand.diagram.caption must explain what the diagram shows.");
      }
      const items = Array.isArray(diagram.items) ? diagram.items : [];
      if (
        items.length < 2 ||
        items.length > 6 ||
        items.some(
          (item) =>
            !isRecord(item) ||
            typeof item.label !== "string" ||
            !item.label.trim() ||
            typeof item.detail !== "string" ||
            !item.detail.trim()
        )
      ) {
        errors.push("understand.diagram.items must include 2 to 6 labeled diagram items.");
      } else if (diagram.template === "two-panel-comparison" && items.length !== 2) {
        errors.push("two-panel-comparison diagram must contain exactly 2 items.");
      }
    }

    const keyTerms = Array.isArray(understand.key_terms) ? understand.key_terms : [];
    if (
      keyTerms.length < 2 ||
      keyTerms.length > 5 ||
      keyTerms.some(
        (kt) =>
          !isRecord(kt) ||
          typeof kt.term !== "string" ||
          !kt.term.trim() ||
          typeof kt.definition !== "string" ||
          kt.definition.trim().length < 8
      )
    ) {
      errors.push("understand.key_terms must define 2 to 5 key terms.");
    }
  }

  // Step 2: Model
  const model = candidate.model;
  if (!isRecord(model)) {
    errors.push("Step 2 (model) is required.");
  } else {
    const steps = Array.isArray(model.steps) ? model.steps : [];
    if (
      steps.length < 3 ||
      steps.length > 5 ||
      steps.some((step) => typeof step !== "string" || step.trim().length < 10)
    ) {
      errors.push("model.steps must contain 3 to 5 concise reasoning steps.");
    }
    if (typeof model.when_it_applies !== "string" || model.when_it_applies.trim().length < 10) {
      errors.push("model.when_it_applies is required.");
    }
    if (
      typeof model.when_it_does_not_apply !== "string" ||
      model.when_it_does_not_apply.trim().length < 10
    ) {
      errors.push("model.when_it_does_not_apply is required.");
    }
    const formula = isRecord(model.formula) ? model.formula : null;
    if (
      !formula ||
      typeof formula.law !== "string" ||
      !formula.law.trim() ||
      typeof formula.equation !== "string" ||
      !formula.equation.trim() ||
      !Array.isArray(formula.variables)
    ) {
      errors.push("model.formula must specify law, equation (or Not applicable), and variables.");
    }
  }

  // Step 3: Connect
  const connect = candidate.connect;
  if (!isRecord(connect)) {
    errors.push("Step 3 (connect) is required.");
  } else {
    if (
      typeof connect.short_field_label !== "string" ||
      !connect.short_field_label.trim() ||
      /\b(?:bachelor|master|doctor|bsed|beed|bs\s+|ba\s+|ab\s+)\b/i.test(connect.short_field_label)
    ) {
      errors.push("connect.short_field_label must be a short field name (not a full degree title).");
    }
    const mappings = Array.isArray(connect.mappings) ? connect.mappings : [];
    if (
      mappings.length < 2 ||
      mappings.length > 3 ||
      mappings.some(
        (m) =>
          !isRecord(m) ||
          typeof m.field_feature !== "string" ||
          !m.field_feature.trim() ||
          typeof m.lesson_concept !== "string" ||
          !m.lesson_concept.trim() ||
          typeof m.explanation !== "string" ||
          m.explanation.trim().length < 15
      )
    ) {
      errors.push("connect.mappings must map 2 to 3 specific field features to the lesson concept.");
    }
    if (
      typeof connect.where_comparison_stops !== "string" ||
      connect.where_comparison_stops.trim().length < 20
    ) {
      errors.push("connect.where_comparison_stops must name the specific error the analogy could cause.");
    }
  }

  // Step 4: Worked example
  const worked = candidate.worked_example;
  if (!isRecord(worked)) {
    errors.push("Step 4 (worked_example) is required.");
  } else {
    if (worked.kind !== "quantitative" && worked.kind !== "conceptual") {
      errors.push("worked_example.kind must be 'quantitative' or 'conceptual'.");
    }
    if (typeof worked.problem !== "string" || worked.problem.trim().length < 12) {
      errors.push("worked_example.problem is required.");
    }
    const steps = Array.isArray(worked.steps) ? worked.steps : [];
    if (
      steps.length < 2 ||
      steps.length > 5 ||
      steps.some((step) => typeof step !== "string" || !step.trim())
    ) {
      errors.push("worked_example.steps must include 2 to 5 reasoning steps.");
    }
    if (typeof worked.answer !== "string" || !worked.answer.trim()) {
      errors.push("worked_example.answer is required.");
    }

    if (worked.kind === "quantitative") {
      const verif = isRecord(worked.verification) ? worked.verification : null;
      if (
        !verif ||
        typeof verif.expression !== "string" ||
        !verif.expression.trim() ||
        typeof verif.result !== "number"
      ) {
        errors.push("Quantitative worked_example requires verification.expression and verification.result.");
      } else {
        const computed = evaluateArithmeticExpression(verif.expression);
        if (computed === null || !closeEnough(computed, verif.result, 0.02)) {
          errors.push(
            `worked_example.verification expression (${verif.expression}) did not recompute to ${verif.result}.`
          );
        } else if (typeof worked.answer === "string") {
          const answerNumbers = (worked.answer.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
          if (!answerNumbers.some((n) => closeEnough(n, computed, 0.05))) {
            errors.push(
              `worked_example.answer (${worked.answer}) does not match the recomputed result (${computed}).`
            );
          }
        }
      }

      // Also verify any explicit arithmetic equalities inside worked_example.steps
      for (const stepText of steps) {
        if (typeof stepText !== "string") continue;
        const eqMatch = stepText.match(
          /([0-9().+\-*/^×÷\s]{3,})\s*=\s*(-?\d+(?:\.\d+)?)(?:\s*[a-zA-Z°/%²³]+)?\s*[.,;]?$/
        );
        if (eqMatch && /[+\-*/^×÷]/.test(eqMatch[1])) {
          const lhs = evaluateArithmeticExpression(eqMatch[1]);
          const rhs = Number(eqMatch[2]);
          if (lhs !== null && Number.isFinite(rhs) && !closeEnough(lhs, rhs, 0.05)) {
            errors.push(`Worked example step arithmetic mismatch: "${eqMatch[1].trim()}" != ${rhs}.`);
          }
        }
      }
    }

    const commonError = isRecord(worked.common_error) ? worked.common_error : null;
    if (
      !commonError ||
      !["error_name", "wrong_work", "wrong_result", "why_wrong"].every(
        (key) => typeof commonError[key] === "string" && String(commonError[key]).trim().length > 0
      )
    ) {
      errors.push("worked_example.common_error must name the error, wrong work/result, and why it is wrong.");
    }
  }

  // Step 5: Misconceptions
  const misconceptions = candidate.misconceptions;
  if (!isRecord(misconceptions)) {
    errors.push("Step 5 (misconceptions) is required.");
  } else {
    if (
      typeof misconceptions.prediction_prompt !== "string" ||
      misconceptions.prediction_prompt.trim().length < 15
    ) {
      errors.push("misconceptions.prediction_prompt must ask the teacher to predict student ideas before reveal.");
    }
    const items = Array.isArray(misconceptions.items) ? misconceptions.items : [];
    if (
      items.length < 3 ||
      items.length > 4 ||
      items.some(
        (m) =>
          !isRecord(m) ||
          !["name", "what_students_say", "what_is_really_happening", "teaching_move"].every(
            (k) => typeof m[k] === "string" && String(m[k]).trim().length > 0
          )
      )
    ) {
      errors.push("misconceptions.items must include 3 to 4 complete misconception cards.");
    }
  }

  // Step 6: Self-check
  const selfCheck = candidate.self_check;
  const questions = isRecord(selfCheck) && Array.isArray(selfCheck.questions) ? selfCheck.questions : [];
  if (questions.length !== 3) {
    errors.push("self_check.questions must contain exactly 3 subject questions.");
  } else {
    for (const q of questions) {
      if (!isRecord(q) || typeof q.question !== "string" || !q.question.trim()) {
        errors.push("Each self_check question must have question text.");
        continue;
      }
      if (
        /\b(?:bansay|concept pack|this pack|this app|self-check|specialty bridge|what should the teacher say|which step)\b/i.test(
          q.question
        )
      ) {
        errors.push("self_check questions must test the lesson subject, never the app or teaching script.");
      }
      const opts = Array.isArray(q.options) ? q.options : [];
      if (opts.length !== 3 || opts.filter((o) => isRecord(o) && o.correct === true).length !== 1) {
        errors.push("Each self_check question needs 3 options with exactly 1 correct option.");
        continue;
      }
      const seen = new Set<string>();
      for (const o of opts) {
        if (
          !isRecord(o) ||
          typeof o.text !== "string" ||
          !o.text.trim() ||
          typeof o.explanation !== "string" ||
          o.explanation.trim().length < 12
        ) {
          errors.push("Each self_check option needs text and a one-sentence explanation.");
          break;
        }
        const normOpt = o.text.trim().toLowerCase();
        if (
          /\b(?:all of the above|none of the above|both a and b)\b/i.test(normOpt)
        ) {
          errors.push("self_check options must be plausible subject choices, not 'all/none of the above'.");
        }
        seen.add(normOpt);
      }
      if (seen.size !== 3) {
        errors.push("Each self_check question must have 3 distinct options.");
      }
    }
  }

  // Step 7: Teach it
  const teachIt = candidate.teach_it;
  if (!isRecord(teachIt)) {
    errors.push("Step 7 (teach_it) is required.");
  } else {
    const sayLines = Array.isArray(teachIt.say_in_class_lines) ? teachIt.say_in_class_lines : [];
    if (
      sayLines.length !== 3 ||
      sayLines.some((line) => typeof line !== "string" || line.trim().length < 10)
    ) {
      errors.push("teach_it.say_in_class_lines must contain 3 short classroom script lines.");
    }
    const majorTokens = new Set(
      [
        options.teacherMajor ? shortFieldName(options.teacherMajor) : "",
        isRecord(connect) && typeof connect.short_field_label === "string"
          ? shortFieldName(connect.short_field_label)
          : "",
      ]
        .map((s) => s.trim())
        .filter((s) => s.length >= 4)
    );
    if (
      Array.from(majorTokens).some((token) =>
        sayLines.some(
          (line) =>
            typeof line === "string" &&
            new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(line)
        )
      )
    ) {
      errors.push("teach_it.say_in_class_lines must use plain student language without the teacher's major jargon.");
    }

    const activity = teachIt.activity;
    if (!isRecord(activity)) {
      errors.push("teach_it.activity is required.");
    } else {
      const requiredStrings = [
        "title",
        "time_needed",
        "prepare_before_class",
        "predict_prompt",
        "observe_prompt",
        "explain_prompt",
        "scale_note",
        "safety_note",
      ];
      for (const field of requiredStrings) {
        if (typeof activity[field] !== "string" || !String(activity[field]).trim()) {
          errors.push(`teach_it.activity.${field} is required.`);
        }
      }

      const materials = Array.isArray(activity.materials) ? activity.materials : null;
      const steps = Array.isArray(activity.steps) ? activity.steps : null;
      if (!materials || !steps || steps.length < 2) {
        errors.push("teach_it.activity must include materials list and at least 2 numbered steps.");
      } else {
        if (
          steps.some(
            (s, i) =>
              !isRecord(s) || s.number !== i + 1 || typeof s.instruction !== "string" || !s.instruction.trim()
          )
        ) {
          errors.push("teach_it.activity.steps must be numbered sequentially starting at 1.");
        }

        const materialsText = materials
          .filter(isRecord)
          .map((m) => `${String(m.name || "")} ${String(m.amount || "")}`)
          .join(" ")
          .toLowerCase();
        if (
          /everyday household items|common household items/.test(lower) &&
          (materials.length === 0 || /household item|everyday item/.test(materialsText))
        ) {
          errors.push("Activity materials must name specific, concrete low-cost items.");
        }
        if (
          /\b(?:oscilloscope|spectrophotometer|centrifuge|microtome|analytical balance|vacuum pump)\b/i.test(
            materialsText
          )
        ) {
          errors.push("Activity materials must be low-cost and locally available.");
        }

        // Safety checks across activity preparation, materials, and steps
        const actionText = [
          String(activity.prepare_before_class || ""),
          materialsText,
          ...steps.map((s) => (isRecord(s) ? String(s.instruction || "") : "")),
        ]
          .join(" ")
          .toLowerCase();

        if (/\b(?:open flame|flame|burner|bunsen|alcohol lamp|candle|lighter|matchstick|campfire|stove)\b/.test(actionText)) {
          errors.push("Activity must not use an open flame, burner, candle, or stove.");
        }
        if (
          /\b(?:heat|warm|boil|place|put|expose)\b.{0,50}\b(?:sealed|capped|closed)\b.{0,20}\b(?:bottle|container|jar|can)\b/.test(
            actionText
          )
        ) {
          errors.push("Activity must not heat a sealed or capped container.");
        }
        if (/\b(?:taste|tasting|eat|eating|drink|drinking|sip|swallow|lick)\b/.test(actionText)) {
          errors.push("Activity must not instruct students to taste or ingest materials.");
        }
        if (
          /\b(?:hydrochloric|sulfuric|nitric|bleach|ammonia|chlorine|mercury|cyanide|acetone|methanol|lye|sodium hydroxide)\b/.test(
            `${actionText} ${String(activity.safety_note || "").toLowerCase()}`
          )
        ) {
          errors.push("Activity must not use hazardous chemicals.");
        }
        if (/\b(?:boiling water|hot plate|hot oil|kettle|unsupervised hot|scalding)\b/.test(actionText)) {
          errors.push("Activity must not require boiling water or unsupervised hot items.");
        }

        // Fact-sheet enforcement when present
        if (factSheet) {
          if (factSheet.approvedDemoMaterials.length > 0) {
            const approved = new Set(factSheet.approvedDemoMaterials.map((n) => n.toLowerCase().trim()));
            const matRecords = materials.filter(isRecord);
            const names = matRecords.map((m) => String(m.name || "").toLowerCase().trim());
            if (
              matRecords.length !== approved.size ||
              names.some((name) => !approved.has(name)) ||
              new Set(names).size !== names.length
            ) {
              errors.push("Activity materials must match the approved fact-sheet whitelist.");
            }
            if (factSheet.demo?.materialAmounts) {
              if (
                matRecords.some((m) => {
                  const expected = factSheet.demo?.materialAmounts[String(m.name).toLowerCase().trim()] || "";
                  return expected && String(m.amount || "").trim().toLowerCase() !== expected.trim().toLowerCase();
                })
              ) {
                errors.push("Activity material amounts must match the fact sheet.");
              }
            }
          }

          for (const term of factSheet.requiredScienceTerms) {
            const normalizedTerm = term.toLowerCase();
            if (normalizedTerm === "27 °c" || normalizedTerm === "57 °c") {
              const degNum = normalizedTerm.split(" ")[0];
              if (!new RegExp(`\\b${degNum}\\s*°\\s*c\\b`, "i").test(lower)) {
                errors.push(`Missing fact-sheet key term/value: ${term}.`);
              }
            } else if (!lower.includes(normalizedTerm)) {
              errors.push(`Missing fact-sheet key term/value: ${term}.`);
            }
          }

          if (factSheet.workedExample && isRecord(worked)) {
            const workedText = [
              String(worked.problem || ""),
              ...(Array.isArray(worked.steps) ? worked.steps.map(String) : []),
            ].join(" ");
            const p1 = Number(workedText.match(/1\.00\s*atm/i)?.[0]?.match(/[\d.]+/)?.[0]);
            const t1 = Number(workedText.match(/300\s*K/i)?.[0]?.match(/[\d.]+/)?.[0]);
            const t2 = Number(workedText.match(/330\s*K/i)?.[0]?.match(/[\d.]+/)?.[0]);
            const calculated = (p1 * t2) / t1;
            if (
              ![p1, t1, t2].every(Number.isFinite) ||
              !closeEnough(calculated, factSheet.workedExample.expectedPressureAtm) ||
              !String(worked.answer || "").includes(calculated.toFixed(2))
            ) {
              errors.push(
                "Fact-sheet worked example numbers must recompute in code to 1.10 atm using 1.00 atm, 300 K, and 330 K."
              );
            }
            if (
              !/\b27\s*°\s*c\b/i.test(lower) ||
              !/\b57\s*°\s*c\b/i.test(lower) ||
              !/\b2\.1\d*\s*atm\b/i.test(lower)
            ) {
              errors.push(
                "Fact-sheet worked example and common error must show both Celsius temperatures and the incorrect result of about 2.1 atm."
              );
            }
            if (
              !String(activity.safety_note || "").toLowerCase().includes("never heat") ||
              !String(activity.safety_note || "").toLowerCase().includes("flame")
            ) {
              errors.push("Activity safety note must prohibit heating sealed bottles and using a flame.");
            }
          }
        }
      }
    }
  }

  return [...new Set(errors)];
}

export function isValidatedConceptPack(
  value: unknown,
  factSheet?: ConceptPackFactSheet,
  topic = "",
  options?: ValidateConceptPackOptions
): value is ValidatedConceptPack {
  return validateConceptPack(value, factSheet, topic, options).length === 0;
}
