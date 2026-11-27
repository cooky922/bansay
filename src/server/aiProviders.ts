type JsonSchema = Record<string, unknown>;

interface OpenAiJsonRequest {
  name: string;
  instructions: string;
  input: string;
  schema: JsonSchema;
  imageData?: { mimeType: string; data: string };
}

export function hasOpenRouterProvider(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

async function createOpenRouterCompletion(payload: Record<string, unknown>) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
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
  });

  const output = response.choices?.[0]?.message?.content;
  if (!output) {
    throw new Error("OpenRouter returned an empty structured response.");
  }

  return JSON.parse(output) as T;
}

export async function generateOpenRouterText({
  instructions,
  input,
}: {
  instructions: string;
  input: string;
}): Promise<string> {
  const response = await createOpenRouterCompletion({
    max_tokens: 450,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: input },
    ],
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}
