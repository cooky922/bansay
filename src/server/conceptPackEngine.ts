import {
  buildPpstIndicators,
  curriculumFrameworkForGrade,
} from "../data/bansayData.ts";
import type {
  BansayLanguage,
  CareerStage,
  GeneratedLessonSupport,
  LlmJudgeReport,
  LlmJudgeScores,
  SubjectName,
} from "../types/bansay.ts";
import {
  generateOpenRouterJson,
  hasOpenRouterProvider,
} from "./aiProviders.ts";

export function languageName(code: string): string {
  if (code === "fil") return "Filipino (Tagalog)";
  if (code === "ceb") return "Cebuano (Bisaya, Iligan City / Northern Mindanao)";
  return "English";
}

const CONCEPT_PACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    bigIdeaSummary: { type: "string" },
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
    contrastiveExamples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          positiveExample: { type: "string" },
          causalWhy: { type: "string" },
          contrastiveNonExample: { type: "string" },
          contrastWhyItDiffers: { type: "string" },
        },
        required: [
          "title",
          "positiveExample",
          "causalWhy",
          "contrastiveNonExample",
          "contrastWhyItDiffers",
        ],
      },
    },
    misconceptionDiagnostic: {
      type: "object",
      additionalProperties: false,
      properties: {
        prompt: { type: "string" },
        options: { type: "array", items: { type: "string" } },
        flawedOptionIndex: { type: "integer" },
        studentMentalModel: { type: "string" },
        refutation: { type: "string" },
      },
      required: [
        "prompt",
        "options",
        "flawedOptionIndex",
        "studentMentalModel",
        "refutation",
      ],
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
    quickSelfCheck: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
          feedback: { type: "string" },
        },
        required: ["question", "options", "correctIndex", "feedback"],
      },
    },
    improvisedActivity: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        materials: { type: "array", items: { type: "string" } },
        steps: { type: "array", items: { type: "string" } },
        safetyProtocol: { type: "string" },
        keyTakeaway: { type: "string" },
      },
      required: ["title", "materials", "steps", "safetyProtocol", "keyTakeaway"],
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
    "bigIdeaSummary",
    "specialtyBridge",
    "contrastiveExamples",
    "misconceptionDiagnostic",
    "misconceptionAlerts",
    "quickSelfCheck",
    "improvisedActivity",
    "simulatedStudentPrompt",
  ],
} as const;

const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    conceptualAccuracy: { type: "integer" },
    analogyFidelity: { type: "integer" },
    misconceptionDepth: { type: "integer" },
    localFeasibility: { type: "integer" },
    mobileScannability: { type: "integer" },
    notes: { type: "string" },
  },
  required: [
    "conceptualAccuracy",
    "analogyFidelity",
    "misconceptionDepth",
    "localFeasibility",
    "mobileScannability",
    "notes",
  ],
} as const;

type RawConceptPack = {
  bigIdeaSummary: string;
  specialtyBridge: GeneratedLessonSupport["specialtyBridge"];
  contrastiveExamples: GeneratedLessonSupport["contrastiveExamples"];
  misconceptionDiagnostic: GeneratedLessonSupport["misconceptionDiagnostic"];
  misconceptionAlerts: GeneratedLessonSupport["misconceptionAlerts"];
  quickSelfCheck: GeneratedLessonSupport["quickSelfCheck"];
  improvisedActivity: Omit<GeneratedLessonSupport["improvisedActivity"], "usesLabEquipment">;
  simulatedStudentPrompt: GeneratedLessonSupport["simulatedStudentPrompt"];
};

function evaluateDeterministicScores(
  pack: RawConceptPack,
  usesLabEquipment: boolean
): LlmJudgeScores & { notes: string } {
  const sentences = pack.bigIdeaSummary
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const mobileScannability = sentences.length <= 3 ? 3 : 1;
  const analogyFidelity = pack.specialtyBridge.limitationNote.trim().length >= 16 ? 3 : 1;
  const misconceptionDepth =
    pack.contrastiveExamples.length >= 2 &&
    pack.misconceptionDiagnostic.options.length >= 3 &&
    pack.quickSelfCheck.length >= 3
      ? 3
      : 1;
  const hasForbiddenOpenFlame = /bunsen|alcohol lamp|open flame|hydrochloric/i.test(
    `${pack.improvisedActivity.materials.join(" ")} ${pack.improvisedActivity.safetyProtocol}`
  );
  const localFeasibility = usesLabEquipment || !hasForbiddenOpenFlame ? 3 : 1;
  const conceptualAccuracy = pack.bigIdeaSummary.trim().length >= 30 ? 3 : 1;

  return {
    conceptualAccuracy,
    analogyFidelity,
    misconceptionDepth,
    localFeasibility,
    mobileScannability,
    notes:
      "Verified <=3-sentence Big Idea, mandatory analogy boundary, 2+ contrastive examples, diagnostic MCQ + 3-item self-check, and safe local materials.",
  };
}

function allCriteriaAtLeastTwo(scores: LlmJudgeScores): boolean {
  return (
    scores.conceptualAccuracy >= 2 &&
    scores.analogyFidelity >= 2 &&
    scores.misconceptionDepth >= 2 &&
    scores.localFeasibility >= 2 &&
    scores.mobileScannability >= 2
  );
}

function buildTeacherSpecialtyBridge({
  subject,
  topic,
  teacherMajor,
  language,
}: {
  subject: SubjectName;
  topic: string;
  teacherMajor: string;
  language: BansayLanguage;
}): GeneratedLessonSupport["specialtyBridge"] {
  const m = teacherMajor.toLowerCase();
  const isTech = /computer|cs\b|it\b|information tech|software|data|engineering|ict/.test(m);
  const isMapeh = /mapeh|music|arts|physical|pe\b|sport|dance/.test(m);
  const isBiz = /business|account|econ|manage|entrep|finance|market/.test(m);
  const isHum = /english|filipino|literature|comm|journal|ling|humanities|history|social|pol|psych|educ/.test(m);

  if (language === "fil") {
    const mechanism = isTech
      ? `Isipin ang ${topic} bilang isang sistema na may malinaw na input, tuntunin sa pagproseso, at boundary conditions: kahit magbago ang hitsura sa labas, nananatili ang pinakabatayang state at constraint ng sistema.`
      : isMapeh
      ? `Isipin ang ${topic} tulad ng koordinasyon ng ritmo at kilos: may tiyak na mekanismong nagpapagalaw o nagpapanatili ng balanse kahit mag-iba ang panlabas na porma.`
      : isBiz
      ? `Isipin ang ${topic} tulad ng pagbabalanse ng ledger: hindi nawawala ang halaga o dami—nagpapalit lamang ito ng anyo o estado habang sinusunod ang parehong tuntunin.`
      : `Bilang may background sa ${teacherMajor}, iugnay ang ${topic} sa prinsipyo ng estruktura at sanhi-at-bunga: may hindi nagbabagong panloob na batas na nagdidikta sa nakikitang resulta.`;
    return {
      title: `Pag-unawa sa ${topic} gamit ang lohika ng ${teacherMajor}`,
      explanation: `Para sa iyo bilang guro (${teacherMajor}): ${mechanism} Kapag malinaw sa iyo ang tunay na mekanismo sa likod ng ${topic}, madali mo na itong maipaliliwanag nang payak sa klase.`,
      trySaying: `“Tingnan natin kung ano ang hindi nagbabago sa dalawang pang-araw-araw na halimbawang ito, at bakit ganoon ang naging resulta.”`,
      limitationNote: `Ang lente ng ${teacherMajor} ay para lamang sa iyong pansariling pag-unawa; sa klase, gumamit ng payak na salita at linawin ang eksaktong tuntunin ng ${subject}.`,
    };
  }

  if (language === "ceb") {
    const mechanism = isTech
      ? `Hunahunaa ang ${topic} isip usa ka sistema nga adunay tin-aw nga input, lagda sa pagproseso, ug boundary conditions: bisan og mausab ang gawas nga panagway, magpabilin gihapon ang tinuod nga estado ug constraint.`
      : isMapeh
      ? `Hunahunaa ang ${topic} sama sa ritmo ug koordinasyon sa lihok: adunay tin-aw nga mekanismo nga nagkontrol sa resulta bisan mausab ang materyales.`
      : isBiz
      ? `Hunahunaa ang ${topic} sama sa balanse sa ledger: dili mawala ang kantidad o sangkap—nag-ilis lang kini og porma ubos sa parehong lagda.`
      : `Isip gradwado sa ${teacherMajor}, sabta una ang ${topic} pinaagi sa istruktura ug hinungdan-ug-epekto: adunay makanunayon nga prinsipyo sa likod sa makita nga resulta.`;
    return {
      title: `Pagsabot sa ${topic} pinaagi sa konsepto sa ${teacherMajor}`,
      explanation: `Para kanimo isip magtutudlo (${teacherMajor}): ${mechanism} Kung klaro na kanimo mismo nganong mahitabo kini, sayon na nimo kini ipasabot sa mga estudyante gamit ang ordinaryong sitwasyon.`,
      trySaying: `“Itandi nato kining duha ka adlaw-adlaw nga sitwasyon—unsay nagpabilin ug unsay nausab, ug ngano kaha?”`,
      limitationNote: `Ang pagtandi gikan sa ${teacherMajor} para ra sa imong kaugalingong pagsabot; sa klase, ipasabot kini sa yanong pinulongan ug ilakip ang tukmang lagda sa ${subject}.`,
    };
  }

  const domainExplanation = isTech
    ? `Think of ${topic} like inspecting an underlying system state and constraint check rather than the UI output alone: what looks identical or “missing” at the surface level is governed by strict rules (particle/unit granularity, conserved invariants, and boundary thresholds). Mapping ${topic} to how a deterministic algorithm preserves state across transformations lets you see why the ${subject} outcome must happen before you simplify it for students.`
    : isMapeh
    ? `Think of ${topic} like analyzing biomechanics or choreography behind a performance: the visible movement only makes sense when you track the underlying force, spacing, and timing rules. Grounding ${topic} in that system of constraints helps you grasp why the ${subject} outcome occurs so you can translate it naturally for learners.`
    : isBiz
    ? `Think of ${topic} like reconciling an accounting ledger or supply constraint: quantities and relationships do not vanish—they transform across states under strict conservation or rate rules. Understanding that invariant balance in ${topic} gives you complete confidence before guiding students through concrete examples.`
    : isHum
    ? `Think of ${topic} like analyzing deep structure versus surface expression in a text or system: two cases can look similar on the surface while following different causal grammar underneath. Grasping that structural rule in ${topic} through your ${teacherMajor} lens lets you explain the mechanism cleanly without relying on rote definitions.`
    : `Think of ${topic} through the analytical lens of ${teacherMajor}: separate surface appearances from the invariant rule or mechanism driving the system underneath. Once you trace what is conserved and what threshold changes the outcome in ${topic}, you can walk your students through the idea step by step.`;

  return {
    title: `Understanding ${topic} via ${teacherMajor} concepts`,
    explanation: `For you as the teacher (${teacherMajor}): ${domainExplanation}`,
    trySaying: `“Let’s compare these two everyday examples side by side—notice what stayed the same, what changed, and what rule explains the difference in ${topic}.”`,
    limitationNote: `Your ${teacherMajor} mental model is for your own conceptual clarity—do not teach ${teacherMajor} jargon to students. Finish with the exact ${subject} principle and boundary conditions.`,
  };
}

export function createDemoConceptPack({
  subject,
  gradeLevel,
  topic,
  teacherMajor,
  language,
  careerStage = "2",
  usesLabEquipment = false,
}: {
  subject: SubjectName;
  gradeLevel: string;
  topic: string;
  teacherMajor: string;
  language: BansayLanguage;
  careerStage?: CareerStage;
  usesLabEquipment?: boolean;
}): { support: GeneratedLessonSupport; demo: true } {
  const isFilipino = language === "fil";
  const isCebuano = language === "ceb";
  const curriculumGrounding = curriculumFrameworkForGrade(gradeLevel);
  const ppstIndicators = buildPpstIndicators(careerStage);
  const teacherBridge = buildTeacherSpecialtyBridge({
    subject,
    topic,
    teacherMajor,
    language,
  });

  const raw: RawConceptPack = isFilipino
    ? {
        bigIdeaSummary: `Sa ${topic}, nakatutulong ang pag-uugnay ng napapansing halimbawa sa malinaw na dahilan. Nagkakaiba ang mga sitwasyon kapag nagbabago ang mekanismo sa likod ng obserbasyon. Mahalagang linawin ang hangganan ng paghahambing bago ibigay ang pormal na termino.`,
        specialtyBridge: teacherBridge,
        contrastiveExamples: [
          {
            title: "Positibong halimbawa vs. kataliwas na halimbawa",
            positiveExample: `Karaniwang pang-araw-araw na halimbawa ng ${topic} na malinaw na nagpapakita ng pangunahing mekanismo.`,
            causalWhy: `Gumagana ito dahil sinusunod nito ang pangunahing ugnayan ng sanhi at bunga sa ${topic}.`,
            contrastiveNonExample: `Kahawig na sitwasyon kung saan mukhang pareho ang resulta ngunit iba ang pinagmulang sanhi.`,
            contrastWhyItDiffers: `Hindi ito maituturing na parehong kaso dahil iba ang pangunahing kondisyon o sukat ng proseso.`,
          },
          {
            title: "Tamang paliwanag vs. maling hula ng mag-aaral",
            positiveExample: `Pagpapaliwanag gamit ang nakikitang ebidensya at tamang dahilan.`,
            causalWhy: `Iniuugnay ng tamang paliwanag ang proseso sa pare-parehong prinsipyo ng ${subject}.`,
            contrastiveNonExample: `Pagkabisa ng sagot nang hindi ipinaliliwanag kung bakit nagbago o nanatili ang sistema.`,
            contrastWhyItDiffers: `Walang sanhi at bunga ang pagkabisa kaya madaling magkamali kapag nagbago ang sitwasyon.`,
          },
        ],
        misconceptionDiagnostic: {
          prompt: `Nagbigay ng maling hula ang mag-aaral tungkol sa ${topic}. Ano ang pangunahing maling mental model niya?`,
          options: [
            "Nasusuri niya ang ugnayan ng sanhi at bunga.",
            "Iniuugnay niya lamang ang panlabas na anyo nang hindi tinitingnan ang mekanismo.",
            "Pinagsasama niya ang tamang ebidensya at pormal na depinisyon.",
          ],
          flawedOptionIndex: 1,
          studentMentalModel: "Nakatuon lamang ang mag-aaral sa nakikitang anyo at hindi sa tunay na dahilan.",
          refutation: `Paghambingin ang dalawang halimbawa nang sabay upang makita kung alin ang nanatili at alin ang nagbago.`,
        },
        misconceptionAlerts: [
          {
            question: "Ma'am/Sir, paano ito ginagamit sa totoong sitwasyon?",
            whatStudentImagines: "Iniuugnay lamang ang bagong konsepto sa isang halimbawa, hindi pa ang buong dahilan.",
            practicalResponse: `Magpakita ng dalawang magkatabing halimbawa, itanong ang hula ng klase, at linawin ang dahilan ng ${topic}.`,
          },
          {
            question: "Pareho pa rin ba ang sagot kung mag-iba ang gamit na bagay?",
            whatStudentImagines: "Maaaring tandaan ang bagay ngunit makalimutan ang pangunahing tuntunin.",
            practicalResponse: `Ipatukoy sa klase kung ano ang nagbago at kung ano ang nanatiling pareho sa ${topic}.`,
          },
        ],
        quickSelfCheck: [
          {
            question: `1. Ano ang unang hakbang upang itama ang maling akala sa ${topic}?`,
            options: [
              "Ibigay agad ang kahulugan sa aklat.",
              "Paghambingin ang positibo at kataliwas na halimbawa bago pangalanan ang prinsipyo.",
              "Laktawan ang hula ng klase.",
            ],
            correctIndex: 1,
            feedback: "Mas nauunawaan ang konsepto kapag nakita muna ang kaibahan ng dalawang halimbawa.",
          },
          {
            question: "2. Bakit kailangang banggitin kung saan humihinto ang analohiya?",
            options: [
              "Upang hindi makalikha ng bagong maling akala ang talinghaga.",
              "Para pahabain ang leksyon.",
              "Hindi na kailangan kung maganda ang halimbawa.",
            ],
            correctIndex: 0,
            feedback: "Lahat ng analohiya ay may hangganan na dapat linawin para sa katumpakan.",
          },
          {
            question: "3. Alin ang pinakaligtas at murang kagamitan para sa demonstrasyon?",
            options: [
              "Mamahaling gamit sa laboratoryo kahit wala sa paaralan.",
              "Ligtas na gamit sa bahay o tindahan na may malinaw na gabay sa kaligtasan.",
              "Walang gabay na bukas na apoy.",
            ],
            correctIndex: 1,
            feedback: "Ang mga gamit sa bahay na may ligtas na pamamaraan ay epektibo sa bawat paaralan.",
          },
        ],
        improvisedActivity: {
          title: "Hula, obserbasyon, at paliwanag",
          materials: usesLabEquipment
            ? ["pisara", "gamit sa laboratoryo ng paaralan", "worksheet", "mga sagot ng klase"]
            : ["pisara o papel na manila", "marker o chalk", "dalawang pang-araw-araw na bagay", "mga sagot ng klase"],
          steps: [
            "Ipakita ang halimbawa at ang kataliwas na sitwasyon.",
            "Ipahula sa mga mag-aaral kung ano ang mangyayari at bakit.",
            `Itala ang dalawang sagot at iugnay ang sanhi sa ${topic}.`,
            "Ipasabi sa pares ang pangunahing ideya sa sariling salita.",
          ],
          safetyProtocol: "Panatilihing ligtas ang mga materyales; huwag gumamit ng bukas na apoy o mapanganib na kemikal nang walang pangangasiwa.",
          keyTakeaway: `Mas madaling maunawaan ang ${topic} kapag pinaghahambing ang sanhi ng dalawang malinaw na halimbawa.`,
        },
        simulatedStudentPrompt: {
          studentName: "Jessa",
          openingQuestion: `Ma'am/Sir, sa ${topic}, bakit magkaiba ang nangyayari kahit halos magkapareho lang tingnan ang dalawang halimbawa?`,
          freshCasePrompt: `Ipaliwanag ang ${topic} gamit ang bagong sitwasyon sa bahay o komunidad nang hindi nagdadagdag ng bagong maling ideya.`,
        },
      }
    : isCebuano
    ? {
        bigIdeaSummary: `Sa ${topic}, importante nga idugtong ang makita nga pananglitan sa tinuod nga hinungdan. Magkalahi ang resulta kung mausab ang mekanismo sa likod sa obserbasyon. Klarohon usab ang utlanan sa pagtandi aron tukma ang konsepto.`,
        specialtyBridge: teacherBridge,
        contrastiveExamples: [
          {
            title: "Tukma nga pananglitan vs. sukwahi nga pananglitan",
            positiveExample: `Adlaw-adlaw nga pananglitan sa ${topic} nga klaro nga nagpakita sa hinungdan.`,
            causalWhy: `Nagsunod kini sa nag-unang relasyon sa hinungdan ug epekto sa ${topic}.`,
            contrastiveNonExample: `Sitwasyon nga parehas tan-awon apan lahi ang hinungdan sa resulta.`,
            contrastWhyItDiffers: `Dili kini parehas tungod kay lahi ang kahimtang o gidak-on sa proseso.`,
          },
          {
            title: "Lawom nga pasabot vs. pagsag-ulo lang",
            positiveExample: `Pagpasabot gamit ang makita nga ebidensya ug hinungdan.`,
            causalWhy: `Nagkonektar sa obserbasyon ngadto sa prinsipyo sa ${subject}.`,
            contrastiveNonExample: `Pagbalik-balik sa termino nga walay pasabot nganong nahitabo.`,
            contrastWhyItDiffers: `Dili magamit sa bag-ong pangutana kung walay pagsabot sa hinungdan.`,
          },
        ],
        misconceptionDiagnostic: {
          prompt: `Naghatag og sayop nga tagna ang estudyante sa ${topic}. Unsa ang iyang sayop nga hunahuna?`,
          options: [
            "Nakasabot siya sa hinungdan ug epekto.",
            "Gibasehan lang niya ang panggawas nga panagway imbes ang hinungdan.",
            "Tukma ang iyang pagtandi sa duha ka sitwasyon.",
          ],
          flawedOptionIndex: 1,
          studentMentalModel: "Nagtan-aw lang ang bata sa panagway imbes sa tinuod nga proseso.",
          refutation: "Itandi ang duha ka pananglitan aron makita unsay nausab ug unsay nagpabilin.",
        },
        misconceptionAlerts: [
          {
            question: "Ma'am/Sir, unsaon man ni paggamit sa tinuod nga kahimtang?",
            whatStudentImagines: "Gikonektar pa lang ang konsepto sa pananglitan, dili pa ang tibuok hinungdan.",
            practicalResponse: `Ipakita ang duha ka pananglitan, pangutan-a ang tagna sa klase, ug klarohon ang hinungdan sa ${topic}.`,
          },
          {
            question: "Parehas ra ba gihapon kung mausab ang gigamit nga butang?",
            whatStudentImagines: "Mahinumdoman ang butang apan malimtan ang pangunang prinsipyo.",
            practicalResponse: `Ipatino sa klase unsay mausab ug unsay magpabilin sa ${topic}.`,
          },
        ],
        quickSelfCheck: [
          {
            question: `1. Unsa ang labing maayong buhaton aron maklaro ang ${topic}?`,
            options: [
              "Basahon lang ang depinisyon.",
              "Itandi ang positibo ug sukwahi nga pananglitan sa dili pa ihatag ang pormal nga ngalan.",
              "Laktawan ang pangutana sa estudyante.",
            ],
            correctIndex: 1,
            feedback: "Mas masabtan ang hinungdan pinaagi sa pagtandi sa duha ka kaso.",
          },
          {
            question: "2. Nganong isulti kung asa mohunong ang analohiya?",
            options: [
              "Aron malikayan ang bag-ong sayop nga pagtuo.",
              "Aron motaas ang oras.",
              "Dili na kini kinahanglan.",
            ],
            correctIndex: 0,
            feedback: "Ang matag analohiya adunay utlanan nga angay klarohon.",
          },
          {
            question: "3. Unsang materyales ang labing luwas ug barato?",
            options: [
              "Mahal nga gamit sa lab bisan wala sa eskwelahan.",
              "Luwas nga gamit sa balay o tindahan nga adunay safety guide.",
              "Bukas nga kalayo nga walay bantay.",
            ],
            correctIndex: 1,
            feedback: "Ang luwas ug barato nga gamit sa balay magamit bisan asa.",
          },
        ],
        improvisedActivity: {
          title: "Tagna, obserbasyon, ug pasabot",
          materials: usesLabEquipment
            ? ["pisara", "gamit sa lab sa eskwelahan", "worksheet", "tubag sa klase"]
            : ["pisara o manila paper", "marker o chalk", "duha ka adlaw-adlaw nga butang", "mga tubag sa estudyante"],
          steps: [
            "Ipakita ang pananglitan ug ang sukwahi niini.",
            "Pangutan-a ang mga estudyante unsay ilang tagna ug ngano.",
            `Isulat ang duha ka tubag ug idugtong ang hinungdan sa ${topic}.`,
            "Ipapasabot sa pares ang pangunang ideya sa ilang kaugalingong pulong.",
          ],
          safetyProtocol: "Siguroha nga luwas ang tanang gamit; likayi ang bukas nga kalayo kung adunay mas luwas nga paagi.",
          keyTakeaway: `Mas masabtan ang ${topic} kung itandi ang hinungdan sa duha ka konkretong pananglitan.`,
        },
        simulatedStudentPrompt: {
          studentName: "Jessa",
          openingQuestion: `Ma'am/Sir, sa ${topic}, nganong magkalahi man ang nahitabo bisan og halos parehas ra tan-awon ang duha ka pananglitan?`,
          freshCasePrompt: `Ipasabot ang ${topic} gamit ang laing pananglitan sa balay o komunidad nga walay bag-ong sayop.`,
        },
      }
    : {
        bigIdeaSummary: `${topic} works because of a consistent underlying relationship rather than surface appearance alone. Comparing a positive case with a contrasting non-example helps learners isolate why the concept applies. Always clarify where an everyday analogy stops so students finish with accurate ${subject} reasoning.`,
        specialtyBridge: teacherBridge,
        contrastiveExamples: [
          {
            title: `Positive case vs. contrasting non-example for ${topic}`,
            positiveExample: `Observable classroom case that cleanly demonstrates ${topic}.`,
            causalWhy: `The underlying cause directly produces the expected outcome under these conditions.`,
            contrastiveNonExample: `A superficially similar situation that does NOT follow the same rule.`,
            contrastWhyItDiffers: `Because the controlling condition differs, the same mechanism does not apply here.`,
          },
          {
            title: "Causal explanation vs. procedural recall",
            positiveExample: `Stating both what happens and why the underlying mechanism drives it.`,
            causalWhy: `Connects observable evidence to the governing ${subject} principle.`,
            contrastiveNonExample: `Repeating a rule or activity step without explaining why it works.`,
            contrastWhyItDiffers: `Rote steps fail as soon as the learner encounters a fresh scenario.`,
          },
        ],
        misconceptionDiagnostic: {
          prompt: `A learner gives a surface-level answer about ${topic}. Which mental model best explains their mistake?`,
          options: [
            "They are applying causal reasoning consistently.",
            "They focus on surface appearance instead of the underlying mechanism.",
            "They already distinguish positive examples from non-examples.",
          ],
          flawedOptionIndex: 1,
          studentMentalModel: `Learners often treat visible surface features as the whole explanation for ${topic}.`,
          refutation: `Pair one positive example with a contrasting non-example and ask what changed versus what stayed the same.`,
        },
        misconceptionAlerts: [
          {
            question: "Ma'am/Sir, how does this work in a real everyday situation?",
            whatStudentImagines: "The learner sees a single example but has not yet connected it to the underlying rule.",
            practicalResponse: `Show one positive case beside a contrasting non-example, ask for a prediction, then name the rule in ${topic}.`,
          },
          {
            question: "Does the exact same answer still hold if we change the materials?",
            whatStudentImagines: `The learner memorizes the object rather than the governing principle in ${topic}.`,
            practicalResponse: `Ask the class to identify what changes and what stays invariant, linking that pattern back to ${topic}.`,
          },
        ],
        quickSelfCheck: [
          {
            question: `1. What helps learners move beyond memorizing steps in ${topic}?`,
            options: [
              "Reading definitions silently.",
              "Comparing a positive example with a contrastive non-example and asking why.",
              "Skipping student predictions.",
            ],
            correctIndex: 1,
            feedback: "Contrastive examples isolate causal reasoning from rote classroom procedures.",
          },
          {
            question: "2. Why must every Specialty Bridge include an explicit limitation note?",
            options: [
              "To prevent the metaphor from creating a new conceptual error.",
              "To replace the DepEd curriculum guide.",
              "To make the explanation longer.",
            ],
            correctIndex: 0,
            feedback: "Stating where the analogy breaks down protects scientific and disciplinary accuracy.",
          },
          {
            question: "3. Which materials list follows BANSAY's local feasibility rule?",
            options: [
              "Specialized lab gear unavailable in local schools.",
              "Low-cost household or sari-sari store items with clear safety steps.",
              "Unattended open flames in a crowded classroom.",
            ],
            correctIndex: 1,
            feedback: "Household items paired with clear safety protocols work reliably in low-resource settings.",
          },
        ],
        improvisedActivity: {
          title: "Contrastive predict, observe, explain",
          materials: usesLabEquipment
            ? ["chalkboard", "school lab apparatus", "two test items", "learner prediction notes"]
            : ["chalkboard or manila paper", "marker or chalk", "two everyday household items", "learner prediction notes"],
          steps: [
            "Show the everyday example alongside a contrasting non-example.",
            "Ask learners to predict what will happen in each and explain why.",
            `Record two answers and connect the causal pattern to ${topic}.`,
            "Have pairs restate the key idea and limitation in their own words.",
          ],
          safetyProtocol: usesLabEquipment
            ? "Follow standard school laboratory supervision and heat/glassware precautions."
            : "Use safe room-temperature or sunlit household setups; avoid open flames or hazardous chemicals.",
          keyTakeaway: `${topic} becomes clear when learners test a positive case against a contrasting non-example and state why.`,
        },
        simulatedStudentPrompt: {
          studentName: "Jessa",
          openingQuestion: `Ma'am/Sir, in ${topic}, why do those two examples turn out differently when they look almost the same at first?`,
          freshCasePrompt: `Explain ${topic} with a fresh everyday scenario from home or the community without introducing a new error.`,
        },
      };

  const evalResult = evaluateDeterministicScores(raw, usesLabEquipment);
  const judgeReport: LlmJudgeReport = {
    scores: {
      conceptualAccuracy: evalResult.conceptualAccuracy,
      analogyFidelity: evalResult.analogyFidelity,
      misconceptionDepth: evalResult.misconceptionDepth,
      localFeasibility: evalResult.localFeasibility,
      mobileScannability: evalResult.mobileScannability,
    },
    regenerationCount: 0,
    passed: allCriteriaAtLeastTwo(evalResult),
    notes: evalResult.notes,
  };

  return {
    demo: true,
    support: {
      bigIdea: {
        summary: raw.bigIdeaSummary,
        curriculumGrounding,
        ppstIndicators,
      },
      specialtyBridge: raw.specialtyBridge,
      contrastiveExamples: raw.contrastiveExamples,
      misconceptionDiagnostic: raw.misconceptionDiagnostic,
      misconceptionAlerts: raw.misconceptionAlerts,
      quickSelfCheck: raw.quickSelfCheck,
      improvisedActivity: {
        ...raw.improvisedActivity,
        usesLabEquipment,
      },
      simulatedStudentPrompt: raw.simulatedStudentPrompt,
      judgeReport,
    },
  };
}

export async function generateValidatedConceptPack({
  subject,
  gradeLevel,
  topic,
  teacherMajor,
  language,
  careerStage = "2",
  startingMaterial,
  usesLabEquipment = false,
  imageData,
}: {
  subject: SubjectName;
  gradeLevel: string;
  topic: string;
  teacherMajor: string;
  language: BansayLanguage;
  careerStage?: CareerStage;
  startingMaterial?: string;
  usesLabEquipment?: boolean;
  imageData?: { mimeType: string; data: string };
}): Promise<{ support: GeneratedLessonSupport; demo: boolean; providerFallback?: boolean }> {
  if (!hasOpenRouterProvider()) {
    return createDemoConceptPack({
      subject,
      gradeLevel,
      topic,
      teacherMajor,
      language,
      careerStage,
      usesLabEquipment,
    });
  }

  const targetLang = languageName(language);
  const curriculumGrounding = curriculumFrameworkForGrade(gradeLevel);
  const ppstIndicators = buildPpstIndicators(careerStage);
  const careerFocus =
    careerStage === "1"
      ? "Level 1 (Unfamiliar with this topic): provide step-by-step foundational accuracy, explicit scaffolding, and common pitfalls to avoid."
      : careerStage === "3"
      ? "Level 3 (Confident with this topic): focus on sharper contrastive examples, probing learner questions, and diagnostic checks."
      : careerStage === "4"
      ? "Level 4 (Ready / Extending): emphasize higher-order synthesis, alternative student solution paths, and inquiry extensions."
      : "Level 2 (Developing / Need a refresher): emphasize cross-disciplinary bridges, causal explanations, misconception diagnosis, and safe improvised setups.";

  let regenerationCount = 0;
  let lastNotes = "";

  for (let attempt = 0; attempt <= 2; attempt += 1) {
    const promptText = `You are designing a low-bandwidth 10-minute Concept Pack for an out-of-field secondary teacher in Iligan City, Philippines.

Layer 1 Context:
- Teacher College Major: ${teacherMajor}
- Assigned Subject & Grade: ${subject} (${gradeLevel})
- DepEd Topic / Competency: ${topic}
- Target Output Language: ${targetLang}
- Self-Calibrated Lesson Proficiency for This Topic: ${careerFocus}
Layer 2 Curriculum Grounding:
- Ground strictly in ${curriculumGrounding} (${curriculumGrounding === "MATATAG (K-9)" ? "DepEd Order No. 010, s. 2024 MATATAG Guides" : "DepEd K to 12 MELCs"}).
${startingMaterial ? `- Teacher starting notes: ${startingMaterial}` : ""}
${lastNotes ? `Previous Judge revision requirement: ${lastNotes}` : ""}

Return schema-compliant JSON strictly in ${targetLang}:
1. bigIdeaSummary: <= 3 concise sentences stating the core concept clearly.
2. specialtyBridge:
   - PURPOSE: Help the TEACHER personally understand ${topic} by explaining the lesson topic itself through concrete concepts from their college background (${teacherMajor}). Do NOT instruct the teacher to teach ${teacherMajor} to students or mention ${teacherMajor} in classroom speech.
   - title: Name the ${teacherMajor} concept or mental model that unlocks ${topic} for the teacher.
   - explanation: 3-4 sentences written directly FOR THE TEACHER explaining why and how ${topic} works by mapping its mechanism to authentic concepts in ${teacherMajor} (e.g., if Computer Science, map to state, granularity/abstraction, invariant rules, or filters; if MAPEH, rhythm/mechanics; if Business, balance/rates).
   - trySaying: 1-2 spoken sentences FOR STUDENTS in everyday ${gradeLevel} classroom language explaining ${topic} cleanly WITHOUT any ${teacherMajor} jargon.
   - limitationNote: Where the ${teacherMajor} analogy breaks down for the teacher AND the exact ${subject} rule students must learn.
3. contrastiveExamples: 2 to 3 worked examples; each MUST pair positiveExample + causalWhy (why it works) with contrastiveNonExample + contrastWhyItDiffers.
4. misconceptionDiagnostic: 1 interactive MCQ (3 options, flawedOptionIndex 0-2, studentMentalModel, refutation).
5. misconceptionAlerts: Exactly 2 likely learner questions with whatStudentImagines and practicalResponse.
6. quickSelfCheck: Exactly 3 short formative questions (3 options each, correctIndex 0-2, feedback).
7. improvisedActivity: ${usesLabEquipment ? "Practical school demonstration" : "Use ONLY cheap household/sari-sari items (water, salt, sugar, strainer, cloth, saucer, paper, sunlight); no lab gear"} + explicit safetyProtocol (prefer sunlight/safe handling over open flame).
8. simulatedStudentPrompt: Filipino student first name, realistic opening conceptual question, and a freshCasePrompt.`;

    let raw: RawConceptPack;
    try {
      raw = await generateOpenRouterJson<RawConceptPack>({
        name: "concept_pack_6_part",
        instructions:
          "Generate a grounded, low-bandwidth 6-part Concept Pack. Use specialtyBridge.explanation to explain the topic itself to the teacher via their college major, and specialtyBridge.trySaying for plain student-ready classroom phrasing without major jargon. Return schema-compliant JSON only.",
        input: promptText,
        schema: CONCEPT_PACK_SCHEMA,
        imageData,
      });
    } catch {
      return {
        ...createDemoConceptPack({
          subject,
          gradeLevel,
          topic,
          teacherMajor,
          language,
          careerStage,
          usesLabEquipment,
        }),
        providerFallback: true,
      };
    }

    const deterministic = evaluateDeterministicScores(raw, usesLabEquipment);
    let judgeScores: LlmJudgeScores & { notes: string } = deterministic;

    try {
      const llmJudge = await generateOpenRouterJson<LlmJudgeScores & { notes: string }>({
        name: "concept_pack_5_criterion_judge",
        instructions:
          "Score the Concept Pack strictly on a 0-3 integer scale across all 5 criteria. Penalize analogyFidelity (<2) if specialtyBridge.explanation tells the teacher to teach students using their college major instead of explaining the topic to the teacher through authentic major concepts, or if trySaying uses college-major jargon. Return JSON only.",
        input: `Teacher Major: ${teacherMajor}\nTarget Class: ${gradeLevel} ${subject} — ${topic}\nEvaluate this Concept Pack on a 0-3 scale (conceptualAccuracy, analogyFidelity, misconceptionDepth, localFeasibility, mobileScannability) and explain briefly in notes:\n${JSON.stringify(raw)}`,
        schema: JUDGE_SCHEMA,
      });
      judgeScores = {
        conceptualAccuracy: Math.min(llmJudge.conceptualAccuracy, deterministic.conceptualAccuracy),
        analogyFidelity: Math.min(llmJudge.analogyFidelity, deterministic.analogyFidelity),
        misconceptionDepth: Math.min(llmJudge.misconceptionDepth, deterministic.misconceptionDepth),
        localFeasibility: Math.min(llmJudge.localFeasibility, deterministic.localFeasibility),
        mobileScannability: Math.min(llmJudge.mobileScannability, deterministic.mobileScannability),
        notes: llmJudge.notes || deterministic.notes,
      };
    } catch {
      judgeScores = deterministic;
    }

    if (allCriteriaAtLeastTwo(judgeScores) || attempt === 2) {
      return {
        demo: false,
        support: {
          bigIdea: {
            summary: raw.bigIdeaSummary,
            curriculumGrounding,
            ppstIndicators,
          },
          specialtyBridge: raw.specialtyBridge,
          contrastiveExamples: raw.contrastiveExamples.slice(0, 3),
          misconceptionDiagnostic: raw.misconceptionDiagnostic,
          misconceptionAlerts: raw.misconceptionAlerts.slice(0, 2),
          quickSelfCheck: raw.quickSelfCheck.slice(0, 3),
          improvisedActivity: {
            ...raw.improvisedActivity,
            usesLabEquipment,
          },
          simulatedStudentPrompt: raw.simulatedStudentPrompt,
          judgeReport: {
            scores: {
              conceptualAccuracy: judgeScores.conceptualAccuracy,
              analogyFidelity: judgeScores.analogyFidelity,
              misconceptionDepth: judgeScores.misconceptionDepth,
              localFeasibility: judgeScores.localFeasibility,
              mobileScannability: judgeScores.mobileScannability,
            },
            regenerationCount,
            passed: allCriteriaAtLeastTwo(judgeScores),
            notes: judgeScores.notes,
          },
        },
      };
    }

    regenerationCount += 1;
    lastNotes = judgeScores.notes || "Ensure <=3 sentence Big Idea, explicit analogy boundary, 2+ contrastive examples, 3 self-check items, and safe household materials.";
  }

  return createDemoConceptPack({
    subject,
    gradeLevel,
    topic,
    teacherMajor,
    language,
    careerStage,
    usesLabEquipment,
  });
}
