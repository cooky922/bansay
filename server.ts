import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error("GEMINI_API_KEY is not configured in environment secrets."),
      { status: 500 }
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function languageName(code: string): string {
  if (code === "fil") return "Filipino (Tagalog)";
  if (code === "ceb") return "Cebuano (Bisaya, Iligan City / Northern Mindanao)";
  return "English";
}

function extractApiError(err: unknown): { status: number; message: string } {
  const errorObj = err as { status?: number; message?: string };
  const status = typeof errorObj?.status === "number" ? errorObj.status : 500;
  const rawMessage = errorObj?.message || "Unexpected server error while contacting Gemini API.";
  return { status, message: rawMessage };
}

const app = express();
app.use(express.json({ limit: "8mb" }));

app.post("/api/bansay/generate-support", async (req, res) => {
  try {
    const {
      subject,
      gradeLevel,
      topic,
      teacherMajor,
      language,
      startingMaterial,
      imageData,
    } = req.body as {
      subject: string;
      gradeLevel: string;
      topic: string;
      teacherMajor: string;
      language: string;
      startingMaterial?: string;
      imageData?: { mimeType: string; data: string };
    };

    if (!subject || !topic || !teacherMajor) {
      res.status(400).json({ error: "Subject, DepEd topic, and teacher college major are required." });
      return;
    }

    const ai = getAiClient();
    const targetLang = languageName(language || "en");

    const promptText = `You are designing immediate, low-bandwidth lesson preparation support for an out-of-field secondary school teacher in Iligan City, Philippines.

Teacher College Major: ${teacherMajor}
Assigned Subject & Grade: ${subject} (${gradeLevel || "Grade 7"})
Upcoming DepEd Topic: ${topic}
Target Output Language: ${targetLang}
${startingMaterial ? `Teacher's starting notes/material: ${startingMaterial}` : ""}

Create practical, plain-language coaching output written strictly in ${targetLang} (natural, warm, classroom-ready phrasing):
1. specialtyBridge:
   - title: Short catchy analogy title linking ${teacherMajor} to ${topic}
   - explanation: 2-3 clear sentences explaining the core concept using an analogy from ${teacherMajor}
   - trySaying: 1-2 spoken sentences the teacher can say aloud in class
   - limitationNote: 1 clear sentence noting where the ${teacherMajor} analogy breaks down so accuracy is preserved
2. misconceptionAlerts: Exactly 2 likely student questions/misconceptions:
   - question: The exact tricky question a learner might ask in class
   - whatStudentImagines: What the student is picturing mentally
   - practicalResponse: Clear teaching move to address it without confusing the class
3. improvisedActivity:
   - title: Safe, practical demonstration using cheap, everyday items found in a Filipino home or school
   - materials: Array of 3-5 everyday items
   - steps: Array of 3-4 concise steps
   - keyTakeaway: What the class should conclude from observing the setup
4. simulatedStudentPrompt:
   - studentName: Common Filipino student first name (e.g. "Carlo", "Jessa", "Marco", "Alyssa")
   - openingQuestion: One realistic, unexpected learner question in ${targetLang} that tests the teacher's conceptual explanation (not just rote recall)
   - freshCasePrompt: A second comparable scenario in ${targetLang} for independent application after mentor feedback.`;

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (imageData?.data && imageData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data,
        },
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            specialtyBridge: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
                trySaying: { type: Type.STRING },
                limitationNote: { type: Type.STRING },
              },
              required: ["title", "explanation", "trySaying", "limitationNote"],
            },
            misconceptionAlerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  whatStudentImagines: { type: Type.STRING },
                  practicalResponse: { type: Type.STRING },
                },
                required: ["question", "whatStudentImagines", "practicalResponse"],
              },
            },
            improvisedActivity: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                keyTakeaway: { type: Type.STRING },
              },
              required: ["title", "materials", "steps", "keyTakeaway"],
            },
            simulatedStudentPrompt: {
              type: Type.OBJECT,
              properties: {
                studentName: { type: Type.STRING },
                openingQuestion: { type: Type.STRING },
                freshCasePrompt: { type: Type.STRING },
              },
              required: ["studentName", "openingQuestion", "freshCasePrompt"],
            },
          },
          required: [
            "specialtyBridge",
            "misconceptionAlerts",
            "improvisedActivity",
            "simulatedStudentPrompt",
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    res.json(parsed);
  } catch (err) {
    const { status, message } = extractApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post("/api/bansay/rehearse", async (req, res) => {
  try {
    const {
      subject,
      gradeLevel,
      topic,
      language,
      studentName,
      history,
      teacherMessage,
    } = req.body as {
      subject: string;
      gradeLevel: string;
      topic: string;
      language: string;
      studentName: string;
      history: Array<{ sender: "student" | "teacher"; text: string }>;
      teacherMessage: string;
    };

    if (!teacherMessage?.trim()) {
      res.status(400).json({ error: "Please enter your explanation before sending." });
      return;
    }

    const ai = getAiClient();
    const targetLang = languageName(language || "en");

    const transcript = (history || [])
      .map((m) => `${m.sender === "student" ? studentName || "Student" : "Teacher"}: ${m.text}`)
      .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `Conversation so far:\n${transcript}\nTeacher: ${teacherMessage}\n\nRespond as ${studentName || "Jessa"}, a realistic Filipino secondary student in ${gradeLevel || "Grade 7"} ${subject || "Science"} (${topic}).`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `You are roleplaying as a real Filipino secondary school student (${studentName || "Jessa"}) in ${gradeLevel || "Grade 7"} in Iligan City during a teacher's lesson rehearsal.
Speak strictly in ${targetLang} in a natural, respectful classroom tone (1 to 3 short sentences).
Do NOT act like an AI tutor or praise the teacher unnaturally. React honestly like a student:
- If the teacher's explanation is clear and connects to something concrete you can picture, say what makes sense and ask one genuine curiosity follow-up ("Ma'am/Sir, what if...").
- If the teacher uses jargon without explaining why, or skips how the idea works in real life, express mild confusion and ask "why" in plain student words.
Never claim that you mastered the whole curriculum; stay in character as a single learner in class.`,
      },
    });

    res.json({
      reply: (response.text ?? "").trim(),
    });
  } catch (err) {
    const { status, message } = extractApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post("/api/bansay/mentor-assist", async (req, res) => {
  try {
    const { subject, topic, teacherMajor, language, teacherResponse, freshCaseResponse } = req.body as {
      subject: string;
      topic: string;
      teacherMajor: string;
      language: string;
      teacherResponse: string;
      freshCaseResponse?: string;
    };

    if (!teacherResponse?.trim()) {
      res.status(400).json({ error: "Teacher rehearsal response is required to draft coaching feedback." });
      return;
    }

    const ai = getAiClient();
    const targetLang = languageName(language || "en");

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `Subject: ${subject}
Topic: ${topic}
Teacher's College Major: ${teacherMajor}
Output Language: ${targetLang}

Teacher's Initial Rehearsal Explanation:
${teacherResponse}

${freshCaseResponse ? `Teacher's Independent Fresh-Case Response:\n${freshCaseResponse}` : ""}

Draft concise, encouraging, non-punitive specialist mentor feedback strictly in ${targetLang}:
- focusedGap: Identify ONE important conceptual or pedagogical gap (1-2 sentences).
- teachingMove: Suggest ONE practical teaching move the teacher can use immediately in tomorrow's class (1-2 sentences).
- quickRefresher: Optional brief content refresher if the explanation showed topic confusion, or empty string if accurate.
- masteredSkill: One short phrase naming what the teacher did well.
- practiceSkill: One short phrase naming what still needs practice.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            focusedGap: { type: Type.STRING },
            teachingMove: { type: Type.STRING },
            quickRefresher: { type: Type.STRING },
            masteredSkill: { type: Type.STRING },
            practiceSkill: { type: Type.STRING },
          },
          required: ["focusedGap", "teachingMove", "quickRefresher", "masteredSkill", "practiceSkill"],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    res.json(parsed);
  } catch (err) {
    const { status, message } = extractApiError(err);
    res.status(status).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BANSAY server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
