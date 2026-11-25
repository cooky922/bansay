import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  generateOpenRouterJson,
  generateOpenRouterText,
  hasOpenRouterProvider,
} from "./src/server/aiProviders.ts";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function languageName(code: string): string {
  if (code === "fil") return "Filipino (Tagalog)";
  if (code === "ceb") return "Cebuano (Bisaya, Iligan City / Northern Mindanao)";
  return "English";
}

function extractApiError(err: unknown): { status: number; message: string } {
  const errorObj = err as { status?: number; message?: string };
  const status = typeof errorObj?.status === "number" ? errorObj.status : 500;
  const rawMessage = errorObj?.message || "Unexpected server error while contacting OpenRouter API.";
  return { status, message: rawMessage };
}

function isDemoMode(): boolean {
  return !hasOpenRouterProvider();
}

const LESSON_SUPPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    specialtyBridge: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        explanation: { type: "string" },
        trySaying: { type: "string" },
        limitationNote: { type: "string" },
      },
      required: ["title", "explanation", "trySaying", "limitationNote"],
    },
    misconceptionAlerts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          whatStudentImagines: { type: "string" },
          practicalResponse: { type: "string" },
        },
        required: ["question", "whatStudentImagines", "practicalResponse"],
      },
    },
    improvisedActivity: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        materials: { type: "array", items: { type: "string" } },
        steps: { type: "array", items: { type: "string" } },
        keyTakeaway: { type: "string" },
      },
      required: ["title", "materials", "steps", "keyTakeaway"],
    },
    simulatedStudentPrompt: {
      type: "object",
      additionalProperties: false,
      properties: {
        studentName: { type: "string" },
        openingQuestion: { type: "string" },
        freshCasePrompt: { type: "string" },
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
} as const;

const MENTOR_FEEDBACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    focusedGap: { type: "string" },
    teachingMove: { type: "string" },
    quickRefresher: { type: "string" },
    masteredSkill: { type: "string" },
    practiceSkill: { type: "string" },
  },
  required: [
    "focusedGap",
    "teachingMove",
    "quickRefresher",
    "masteredSkill",
    "practiceSkill",
  ],
} as const;

function createDemoSupport({
  subject,
  gradeLevel,
  topic,
  teacherMajor,
  language,
}: {
  subject: string;
  gradeLevel: string;
  topic: string;
  teacherMajor: string;
  language: string;
}) {
  const isFilipino = language === "fil";
  const isCebuano = language === "ceb";
  const labels = isFilipino
    ? {
        title: `Mula ${teacherMajor} tungo sa ${topic}`,
        explanation: `Gamitin ang mga kasanayan mo sa ${teacherMajor} bilang pamilyar na panimulang punto. Iugnay ito sa ${topic}, pagkatapos ay anyayahan ang klase na suriin ang isang konkretong halimbawa.`,
        trySaying: `“Magsimula tayo sa isang bagay na pamilyar sa inyo, pagkatapos ay tingnan natin kung paano nito ipinapakita ang ${topic}.”`,
        limitation: "Paalala: ang paghahambing ay panimula lamang; gamitin ang tamang termino ng aralin bago magtapos.",
        question: `Ma'am/Sir, paano ito ginagamit sa totoong sitwasyon?`,
        image: "Iniuugnay lamang ang bagong konsepto sa isang halimbawa, hindi pa ang buong paliwanag.",
        move: "Magpakita ng isang halimbawa, itanong ang hula ng klase, at gamitin ang sagot nila upang linawin ang konsepto.",
        activity: "Hula, obserbasyon, at paliwanag",
        materials: ["pisara o papel na manila", "marker o chalk", "isang pang-araw-araw na bagay", "mga sagot ng mag-aaral"],
        steps: ["Ipakita ang pang-araw-araw na bagay o sitwasyon.", "Ipahula sa mga mag-aaral kung ano ang mangyayari o bakit ito nangyayari.", "Itala ang dalawang sagot at iugnay ang mga ito sa ${topic}.", "Ipasabi sa pares ang pangunahing ideya sa sariling salita."],
        takeaway: `Ang ${topic} ay mas madaling maintindihan kapag inuugnay sa napapansing halimbawa at tamang paliwanag.`,
        student: "Jessa",
        fresh: `Ipaliwanag ang ${topic} gamit ang ibang halimbawa sa bahay o komunidad. Ano ang mananatiling pareho?`,
      }
    : isCebuano
    ? {
        title: `Gikan sa ${teacherMajor} paingon sa ${topic}`,
        explanation: `Gamita ang imong nahibaloan sa ${teacherMajor} isip pamilyar nga sugdanan. Idugtong kini sa ${topic}, unya pasagdi ang klase nga mosusi og konkreto nga pananglitan.`,
        trySaying: `“Sugdan nato sa butang nga pamilyar ninyo, unya tan-awon nato unsaon niini pagpakita sa ${topic}.”`,
        limitation: "Pahinumdom: sugdanan ra ang pagtandi; gamita ang tukmang termino sa leksyon sa pagtapos.",
        question: `Ma'am/Sir, unsaon man ni paggamit sa tinuod nga kahimtang?`,
        image: "Gikonektar pa lang ang bag-ong konsepto sa pananglitan, dili pa ang tibuok pasabot.",
        move: "Ipakita ang usa ka pananglitan, pangutan-a ang tagna sa klase, ug gamita ang ilang tubag aron klarohon ang konsepto.",
        activity: "Tagna, obserbasyon, ug pasabot",
        materials: ["pisara o manila paper", "marker o chalk", "usa ka adlaw-adlaw nga butang", "mga tubag sa estudyante"],
        steps: ["Ipakita ang adlaw-adlaw nga butang o sitwasyon.", "Pangutan-a ang mga estudyante unsay ilang tagna.", "Isulat ang duha ka tubag ug idugtong kini sa ${topic}.", "Ipapasabot sa pares ang pangunang ideya sa ilang kaugalingong pulong."],
        takeaway: `Mas masabtan ang ${topic} kung idugtong sa makita nga pananglitan ug tukmang pasabot.`,
        student: "Jessa",
        fresh: `Ipasabot ang ${topic} gamit ang laing pananglitan sa balay o komunidad. Unsay magpabiling pareho?`,
      }
    : {
        title: `From ${teacherMajor} to ${topic}`,
        explanation: `Use a familiar practice from ${teacherMajor} as the starting point, then connect it to ${topic}. Let learners test the connection with one concrete example before naming the formal idea.`,
        trySaying: `“Let’s start with something familiar, then use it to notice how ${topic} works.”`,
        limitation: "The comparison is a starting point, not the full explanation; close with the precise lesson vocabulary.",
        question: "Ma'am/Sir, how would this work in a real situation?",
        image: "The learner can see the example but has not yet connected it to the rule or concept.",
        move: "Show one example, ask for a prediction, then use the class responses to name and clarify the concept.",
        activity: "Predict, observe, explain",
        materials: ["chalkboard or manila paper", "marker or chalk", "one everyday object", "learner responses"],
        steps: ["Show the everyday object or situation.", "Ask learners to predict what will happen or explain why.", "Record two answers and connect them to ${topic}.", "Have pairs restate the key idea in their own words."],
        takeaway: `${topic} becomes easier to explain when learners can connect an observable example to the accurate concept.`,
        student: "Jessa",
        fresh: `Explain ${topic} with a different example from home or the community. What stays the same?`,
      };

  return {
    demo: true,
    specialtyBridge: {
      title: labels.title,
      explanation: labels.explanation,
      trySaying: labels.trySaying,
      limitationNote: labels.limitation,
    },
    misconceptionAlerts: [
      {
        question: labels.question,
        whatStudentImagines: labels.image,
        practicalResponse: labels.move,
      },
      {
        question: `Does the same idea still apply if the example changes?`,
        whatStudentImagines: `The learner may remember the example but not the underlying idea in ${topic}.`,
        practicalResponse: `Ask the class to identify what changes and what stays the same, then connect that pattern back to ${topic}.`,
      },
    ],
    improvisedActivity: {
      title: labels.activity,
      materials: labels.materials,
      steps: labels.steps,
      keyTakeaway: labels.takeaway,
    },
    simulatedStudentPrompt: {
      studentName: labels.student,
      openingQuestion: labels.question,
      freshCasePrompt: labels.fresh,
    },
  };
}

function createDemoStudentReply(language: string, studentName: string, topic: string): string {
  const name = studentName || "Jessa";
  if (language === "fil") {
    return `Salamat po, ${name} ito. Naiintindihan ko ang halimbawa, pero paano ko malalaman kung kailan ito kaugnay ng ${topic}?`;
  }
  if (language === "ceb") {
    return `Salamat po, si ${name} ni. Nasabtan nako ang pananglitan, pero unsaon nako pagkahibalo kanus-a ni konektado sa ${topic}?`;
  }
  return `Thanks, this is ${name}. I understand the example, but how do I know when it connects to ${topic}?`;
}

function createDemoMentorFeedback(language: string) {
  if (language === "fil") {
    return {
      demo: true,
      focusedGap: "Malinaw ang halimbawa, ngunit kailangan munang ipasabi sa mag-aaral ang ideya bago ibigay ang pormal na termino.",
      teachingMove: "Magtanong muna ng hula, kumuha ng dalawang sagot, at saka iugnay ang mga ito sa konsepto.",
      quickRefresher: "",
      masteredSkill: "Gumamit ng pamilyar na halimbawa",
      practiceSkill: "Pagkuha ng pangangatwiran ng mag-aaral",
    };
  }
  if (language === "ceb") {
    return {
      demo: true,
      focusedGap: "Klaro ang pananglitan, apan kinahanglan una ipasulti sa estudyante ang ideya sa dili pa ihatag ang pormal nga termino.",
      teachingMove: "Pangutan-a una ang tagna, kuhaa ang duha ka tubag, unya idugtong kini sa konsepto.",
      quickRefresher: "",
      masteredSkill: "Paggamit og pamilyar nga pananglitan",
      practiceSkill: "Pagkuha sa panghunahuna sa estudyante",
    };
  }
  return {
    demo: true,
    focusedGap: "The example is clear, but learners need a chance to state the idea before hearing the formal term.",
    teachingMove: "Ask for a prediction, collect two responses, then connect their reasoning to the concept.",
    quickRefresher: "",
    masteredSkill: "Uses a familiar example",
    practiceSkill: "Eliciting learner reasoning",
  };
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

    if (isDemoMode()) {
      res.json(
        createDemoSupport({ subject, gradeLevel, topic, teacherMajor, language })
      );
      return;
    }

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

    const parsed = await generateOpenRouterJson({
      name: "lesson_support",
      instructions:
        "Generate practical, plain-language, classroom-ready coaching. Return only the schema-compliant JSON object in the requested language.",
      input: promptText,
      schema: LESSON_SUPPORT_SCHEMA,
      imageData,
    });
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

    if (isDemoMode()) {
      res.json({
        demo: true,
        reply: createDemoStudentReply(language, studentName, topic),
      });
      return;
    }

    const targetLang = languageName(language || "en");

    const transcript = (history || [])
      .map((m) => `${m.sender === "student" ? studentName || "Student" : "Teacher"}: ${m.text}`)
      .join("\n");

    const instructions = `You are roleplaying as a real Filipino secondary school student (${studentName || "Jessa"}) in ${gradeLevel || "Grade 7"} in Iligan City during a teacher's lesson rehearsal.
Speak strictly in ${targetLang} in a natural, respectful classroom tone (1 to 3 short sentences).
Do NOT act like an AI tutor or praise the teacher unnaturally. React honestly like a student:
- If the teacher's explanation is clear and connects to something concrete you can picture, say what makes sense and ask one genuine curiosity follow-up ("Ma'am/Sir, what if...").
- If the teacher uses jargon without explaining why, or skips how the idea works in real life, express mild confusion and ask "why" in plain student words.
Never claim that you mastered the whole curriculum; stay in character as a single learner in class.`;
    const input = `Conversation so far:\n${transcript}\nTeacher: ${teacherMessage}\n\nRespond as ${studentName || "Jessa"}, a realistic Filipino secondary student in ${gradeLevel || "Grade 7"} ${subject || "Science"} (${topic}).`;
    const reply = await generateOpenRouterText({ instructions, input });

    res.json({
      reply,
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

    if (isDemoMode()) {
      res.json(createDemoMentorFeedback(language));
      return;
    }

    const targetLang = languageName(language || "en");

    const prompt = `Subject: ${subject}
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
- practiceSkill: One short phrase naming what still needs practice.`;
    const parsed = await generateOpenRouterJson({
      name: "mentor_feedback",
      instructions:
        "Draft concise, encouraging, non-punitive specialist mentor feedback. Return only the schema-compliant JSON object in the requested language.",
      input: prompt,
      schema: MENTOR_FEEDBACK_SCHEMA,
    });
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
    console.log(`BANSAY server running on http://localhost:${PORT}`);
  });
}

startServer();
