type JsonSchema = Record<string, unknown>;

interface OpenAiJsonRequest {
  name: string;
  instructions: string;
  input: string;
  schema: JsonSchema;
  imageData?: { mimeType: string; data: string };
  modelRole?: ModelRole;
}

export function hasOpenRouterProvider(): boolean {
  return Boolean(
    process.env.OPENROUTER_API_KEY &&
    process.env.OPENROUTER_CONCEPT_PACK_MODEL &&
    process.env.OPENROUTER_REHEARSAL_MODEL
  );
}

export function hasConceptPackProvider(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_CONCEPT_PACK_MODEL));
}

type ModelRole = "concept-pack" | "rehearsal";

function modelForRole(role: ModelRole): string {
  const model = role === "concept-pack"
    ? process.env.OPENROUTER_CONCEPT_PACK_MODEL
    : process.env.OPENROUTER_REHEARSAL_MODEL;
  if (!process.env.OPENROUTER_API_KEY || !model?.trim()) {
    throw Object.assign(
      new Error(`OpenRouter API key and ${role === "concept-pack" ? "OPENROUTER_CONCEPT_PACK_MODEL" : "OPENROUTER_REHEARSAL_MODEL"} must be configured.`),
      { status: 503 }
    );
  }
  return model.trim();
}

async function createOpenRouterCompletion(payload: Record<string, unknown>, modelRole: ModelRole) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelForRole(modelRole),
      ...payload,
    }),
  });
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw Object.assign(
      new Error(body.error?.message || "OpenRouter request failed."),
      { status: response.status }
    );
  }

  return body;
}

export async function generateOpenRouterJson<T>({
  name,
  instructions,
  input,
  schema,
  imageData,
  modelRole = "concept-pack",
}: OpenAiJsonRequest): Promise<T> {
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
  const response = await createOpenRouterCompletion({
    max_tokens: 1800,
    messages: [
      { role: "system", content: instructions },
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
  }, modelRole);

  const output = response.choices?.[0]?.message?.content;
  if (!output) {
    throw new Error("OpenRouter returned an empty structured response.");
  }

  return JSON.parse(output) as T;
}

/** Uses the Gemini key injected by the BANSAY hosting environment when available. */
export async function generateConceptPackJson<T>({
  name,
  instructions,
  input,
  schema,
}: Omit<OpenAiJsonRequest, "imageData" | "modelRole">): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return generateOpenRouterJson<T>({ name, instructions, input, schema, modelRole: "concept-pack" });

  const model = process.env.GEMINI_CONCEPT_PACK_MODEL?.trim() || "gemini-3.8-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: "user", parts: [{ text: input }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, maxOutputTokens: 12000 },
    }),
  });
  const body = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    error?: { message?: string; status?: string };
  };
  if (!response.ok) {
    throw Object.assign(new Error(body.error?.message || `Gemini request failed (${response.status}).`), { status: response.status });
  }
  const output = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!output) throw new Error(`Gemini returned no pack content (finish reason: ${body.candidates?.[0]?.finishReason || "unknown"}).`);
  try { return JSON.parse(output) as T; }
  catch { throw new Error(`Gemini returned invalid JSON: ${output.slice(0, 400)}`); }
}

export async function generateOpenRouterText({
  instructions,
  input,
  modelRole = "rehearsal",
}: {
  instructions: string;
  input: string;
  modelRole?: ModelRole;
}): Promise<string> {
  const response = await createOpenRouterCompletion({
    max_tokens: 450,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: input },
    ],
  }, modelRole);

  return response.choices?.[0]?.message?.content?.trim() || "";
}
