import { GoogleGenAI, ThinkingLevel, Type, type Schema } from "@google/genai";

type JsonSchema = Record<string, unknown>;

interface StructuredJsonRequest {
  name: string;
  instructions: string;
  input: string;
  schema: JsonSchema;
  imageData?: { mimeType: string; data: string };
  modelRole?: ModelRole;
}

type ModelRole = "concept-pack" | "rehearsal";

const DEFAULT_GEMINI_CONCEPT_MODEL = "gemini-4-hydrogen";
const DEFAULT_OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const PROHIBITED_OR_INVALID_GEMINI_MODELS = new Set([
  "gemini-3.8-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash-thinking",
]);

function resolveGeminiModel(role: ModelRole): string {
  const configured =
    role === "concept-pack"
      ? process.env.GEMINI_CONCEPT_PACK_MODEL?.trim()
      : process.env.GEMINI_REHEARSAL_MODEL?.trim();
  if (configured && !PROHIBITED_OR_INVALID_GEMINI_MODELS.has(configured.toLowerCase())) return configured;
  if (role === "rehearsal") throw new Error("GEMINI_REHEARSAL_MODEL is required for live rehearsal.");
  return DEFAULT_GEMINI_CONCEPT_MODEL;
}

function resolveOpenRouterEndpoint(): string {
  return process.env.OPENROUTER_ENDPOINT?.trim() || DEFAULT_OPENROUTER_ENDPOINT;
}

const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

export function hasGeminiProvider(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function hasOpenRouterProvider(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function hasConceptPackProvider(): boolean {
  return Boolean(hasGeminiProvider() || hasOpenRouterProvider());
}

export function hasAnyAiProvider(): boolean {
  return hasGeminiProvider() || hasOpenRouterProvider();
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(
      new Error("GEMINI_API_KEY is not configured on the server."),
      { status: 503 }
    );
  }
  const baseUrl = process.env.GEMINI_API_ENDPOINT?.trim();
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(baseUrl ? { baseUrl } : {}),
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function jsonTypeToGeminiType(typeValue: unknown): Type {
  switch (typeValue) {
    case "string":
      return Type.STRING;
    case "number":
      return Type.NUMBER;
    case "integer":
      return Type.INTEGER;
    case "boolean":
      return Type.BOOLEAN;
    case "array":
      return Type.ARRAY;
    case "object":
      return Type.OBJECT;
    default:
      return Type.STRING;
  }
}

function toGeminiSchema(node: unknown): Schema {
  if (!node || typeof node !== "object") {
    return { type: Type.STRING };
  }
  const obj = node as Record<string, unknown>;
  const converted: Schema = {
    type: jsonTypeToGeminiType(obj.type),
  };

  if (typeof obj.description === "string" && obj.description.trim()) {
    converted.description = obj.description;
  }

  if (Array.isArray(obj.enum)) {
    converted.enum = obj.enum.map((item) => String(item));
  }

  if (obj.type === "object" && obj.properties && typeof obj.properties === "object") {
    const props: Record<string, Schema> = {};
    for (const [key, value] of Object.entries(obj.properties as Record<string, unknown>)) {
      props[key] = toGeminiSchema(value);
    }
    converted.properties = props;
    if (Array.isArray(obj.required)) {
      converted.required = obj.required.map((item) => String(item));
    }
  }

  if (obj.type === "array" && obj.items) {
    converted.items = toGeminiSchema(obj.items);
  }

  return converted;
}

function normalizeGeminiError(error: unknown, role: ModelRole): Error & { status: number } {
  const errObj = error as { status?: number; code?: number; message?: string };
  const rawMessage = errObj?.message || "Gemini request failed.";
  let status =
    typeof errObj?.status === "number"
      ? errObj.status
      : typeof errObj?.code === "number"
      ? errObj.code
      : 500;

  if (status === 500) {
    const codeMatch = rawMessage.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
    if (codeMatch) status = Number(codeMatch[1]);
  }

  if (/API_KEY_INVALID|API key not valid/i.test(rawMessage) || status === 400) {
    return Object.assign(new Error("Invalid GEMINI_API_KEY configuration."), { status: 400 });
  }
  if (/PERMISSION_DENIED/i.test(rawMessage) || status === 403 || status === 401) {
    return Object.assign(new Error("Gemini API permission denied."), { status: 403 });
  }
  if (/RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMessage) || status === 429) {
    return Object.assign(new Error("Gemini API rate limit or quota reached."), { status: 429 });
  }
  if (/NOT_FOUND/i.test(rawMessage) || status === 404) {
    return Object.assign(
      new Error(`Configured Gemini model (${resolveGeminiModel(role)}) was not found.`),
      { status: 404 }
    );
  }

  return Object.assign(new Error(rawMessage, { cause: error }), { status });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      const retryable = status === 500 || status === 502 || status === 503 || status === 504;
      if (!retryable || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

function modelForOpenRouterRole(role: ModelRole): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("OPENROUTER_API_KEY is not configured on the server."), {
      status: 503,
    });
  }
  const roleSpecific =
    role === "concept-pack"
      ? process.env.OPENROUTER_CONCEPT_PACK_MODEL?.trim()
      : process.env.OPENROUTER_REHEARSAL_MODEL?.trim();
  const sharedModel = process.env.OPENROUTER_MODEL?.trim();
  if (role === "rehearsal" && !roleSpecific && !sharedModel) {
    throw new Error("OPENROUTER_REHEARSAL_MODEL or OPENROUTER_MODEL is required for live rehearsal.");
  }
  return roleSpecific || sharedModel || DEFAULT_OPENROUTER_MODEL;
}

function resolveAppReferer(): string | undefined {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl || appUrl === "MY_APP_URL" || !/^https?:\/\//i.test(appUrl)) {
    return undefined;
  }
  return appUrl;
}

function parseJsonFromModelText<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error(`Model returned invalid JSON: ${trimmed.slice(0, 240)}`);
  }
}

async function createOpenRouterCompletion(payload: Record<string, unknown>, modelRole: ModelRole) {
  const referer = resolveAppReferer();
  const response = await fetch(resolveOpenRouterEndpoint(), {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY?.trim()}`,
      "Content-Type": "application/json",
      ...(referer ? { "HTTP-Referer": referer } : {}),
      "X-Title": "BANSAY",
    },
    body: JSON.stringify({
      model: modelForOpenRouterRole(modelRole),
      ...payload,
    }),
  });
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw Object.assign(new Error(body.error?.message || "OpenRouter request failed."), {
      status: response.status,
    });
  }

  return body;
}

async function generateGeminiJson<T>({
  instructions,
  input,
  schema,
  imageData,
  modelRole = "concept-pack",
}: {
  instructions: string;
  input: string;
  schema: JsonSchema;
  imageData?: { mimeType: string; data: string };
  modelRole?: ModelRole;
}): Promise<T> {
  const ai = createGeminiClient();
  const model = resolveGeminiModel(modelRole);
  const isLiteModel = model.includes("flash-lite");
  const thinkingLevel =
    modelRole === "concept-pack"
      ? ThinkingLevel.MEDIUM
      : isLiteModel
      ? ThinkingLevel.MINIMAL
      : ThinkingLevel.LOW;

  const contents = imageData
    ? {
        parts: [
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          },
          { text: input },
        ],
      }
    : input;

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: instructions,
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(schema),
          thinkingConfig: {
            thinkingLevel,
          },
        },
      });

      const output = (response.text ?? "").trim();
      if (!output) {
        throw Object.assign(new Error("Gemini returned an empty structured response."), {
          status: 502,
        });
      }

      try {
        return JSON.parse(output) as T;
      } catch {
        throw Object.assign(new Error(`Gemini returned invalid JSON: ${output.slice(0, 300)}`), {
          status: 502,
        });
      }
    } catch (error) {
      throw normalizeGeminiError(error, modelRole);
    }
  });
}

export async function generateOpenRouterJson<T>({
  name,
  instructions,
  input,
  schema,
  imageData,
  modelRole = "concept-pack",
}: StructuredJsonRequest): Promise<T> {
  if (hasGeminiProvider() && !hasOpenRouterProvider()) {
    return generateGeminiJson<T>({
      instructions,
      input,
      schema,
      imageData,
      modelRole,
    });
  }

  const modelId = modelForOpenRouterRole(modelRole);
  const content = [
    { type: "text", text: input },
    ...(imageData
      ? [
          {
            type: "image_url",
            image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` },
          },
        ]
      : []),
  ];

  const extractText = (body: {
    choices?: Array<{ message?: { content?: unknown } }>;
  }): string => {
    const raw = body.choices?.[0]?.message?.content;
    if (typeof raw === "string") return raw.trim();
    if (Array.isArray(raw)) {
      return raw
        .map((part) =>
          part && typeof part === "object" && "text" in part ? String((part as { text?: unknown }).text || "") : ""
        )
        .join("")
        .trim();
    }
    return "";
  };

  const schemaSystemMsg = `${instructions}\nReturn strictly ONE valid JSON object (no markdown fences, no commentary) matching this JSON Schema:\n${JSON.stringify(schema)}`;
  const promptFallbackMessages = [
    { role: "system", content: schemaSystemMsg },
    { role: "user", content: imageData ? content : input },
  ];

  const attemptFormats: Array<Record<string, unknown>> =
    modelId === "openrouter/free"
      ? [
          {
            max_tokens: 8192,
            temperature: 0.2,
            messages: promptFallbackMessages,
            response_format: { type: "json_object" },
          },
          {
            max_tokens: 8192,
            temperature: 0.2,
            messages: promptFallbackMessages,
          },
        ]
      : [
          {
            max_tokens: 8192,
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content: `${instructions}\nRespond ONLY with a single valid JSON object matching the requested schema.`,
              },
              { role: "user", content: imageData ? content : input },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name,
                strict: true,
                schema,
              },
            },
          },
          {
            max_tokens: 8192,
            temperature: 0.2,
            messages: promptFallbackMessages,
          },
        ];

  let lastError: unknown;
  for (const payload of attemptFormats) {
    try {
      const response = await createOpenRouterCompletion(payload, modelRole);
      const output = extractText(response);
      if (!output) {
        lastError = new Error("OpenRouter returned an empty structured response.");
        continue;
      }
      return parseJsonFromModelText<T>(output);
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (status && status !== 400 && status !== 404 && status !== 422 && status !== 502) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter failed to return valid JSON.");
}

/** Uses the stronger Concept Pack model configured via environment variables. */
export async function generateConceptPackJson<T>({
  name,
  instructions,
  input,
  schema,
}: Omit<StructuredJsonRequest, "imageData" | "modelRole">): Promise<T> {
  if (hasGeminiProvider()) {
    try {
      return await generateGeminiJson<T>({
        instructions,
        input,
        schema,
        modelRole: "concept-pack",
      });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      // A temporary Gemini outage should not block pack creation when an
      // OpenRouter provider is also configured.
      if (!hasOpenRouterProvider() || ![429, 500, 502, 503, 504].includes(status || 0)) throw error;
      console.warn(`[concept-pack] Gemini temporarily unavailable (HTTP ${status}); trying OpenRouter.`);
    }
  }

  return generateOpenRouterJson<T>({
    name,
    instructions,
    input,
    schema,
    modelRole: "concept-pack",
  });
}

/** Uses the lower-cost rehearsal model configured via environment variables. */
export async function generateOpenRouterText({
  instructions,
  input,
  modelRole = "rehearsal",
}: {
  instructions: string;
  input: string;
  modelRole?: ModelRole;
}): Promise<string> {
  if (hasGeminiProvider() && !hasOpenRouterProvider()) {
    const ai = createGeminiClient();
    const model = resolveGeminiModel(modelRole);
    const isLiteModel = model.includes("flash-lite");
    return withRetry(async () => {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: input,
          config: {
            systemInstruction: instructions,
            thinkingConfig: {
              thinkingLevel: isLiteModel ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
            },
          },
        });
        return (response.text ?? "").trim();
      } catch (error) {
        throw normalizeGeminiError(error, modelRole);
      }
    });
  }

  const response = await createOpenRouterCompletion(
    {
      max_tokens: 450,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: input },
      ],
    },
    modelRole
  );

  return response.choices?.[0]?.message?.content?.trim() || "";
}
