import type {
  BansayLanguage,
  CareerStage,
  ClassroomEvidenceItem,
  CohortSeat,
  CompetencyQuarter,
  CurriculumFramework,
  EngineeringControlMetric,
  LessonCase,
  PeerLibraryItem,
  PilotBudgetRow,
  PilotValidationMetric,
  SubjectName,
  UnitEconomicsRow,
} from "../types/bansay";

export const CAREER_STAGE_LABELS: Record<
  CareerStage,
  { name: string; group: string; focus: string }
> = {
  "1": {
    name: "Level 1 · Unfamiliar",
    group: "New to this topic",
    focus: "Step-by-step core concepts, foundational scaffolding, clear analogies, and common pitfalls to avoid.",
  },
  "2": {
    name: "Level 2 · Developing",
    group: "Need a structured refresher",
    focus: "Cross-disciplinary bridges, causal explanations, misconception diagnosis, and safe improvised setups.",
  },
  "3": {
    name: "Level 3 · Confident",
    group: "Refining delivery & checks",
    focus: "Sharper contrastive examples, probing learner questions, and targeted formative diagnostic checks.",
  },
  "4": {
    name: "Level 4 · Ready",
    group: "Extending classroom practice",
    focus: "Higher-order synthesis, alternative student solution paths, and reusable classroom inquiry prompts.",
  },
};

export function buildPpstIndicators(stage: CareerStage = "2"): string[] {
  return [
    `1.1.${stage}`,
    `1.2.${stage}`,
    `1.5.${stage}`,
    `2.1.${stage}`,
    `4.1.${stage}`,
    `5.1.${stage}`,
  ];
}

export function curriculumFrameworkForGrade(gradeLevel: string): CurriculumFramework {
  const numeric = Number(gradeLevel.replace(/\D+/g, ""));
  if (numeric >= 10) return "K-12 MELCs (G10-12)";
  return "MATATAG (K-9)";
}

export const UI_COPY: Record<
  BansayLanguage,
  {
    workspaceLabel: string;
    navPrep: string;
    navRehearsal: string;
    navPortfolio: string;
    navCohort: string;
    annualTrackTitle: string;
    annualTrackLink: string;
    privacyNote: string;
    lowDataMode: string;
    offlineCacheReady: string;
    viewingAs: string;
    roleTeacher: string;
    roleMentor: string;
    roleCoordinator: string;
    step1Title: string;
    step1Kicker: string;
    step2Title: string;
    step2Kicker: string;
    rehearsalTitle: string;
    rehearsalSubtitle: string;
    rehearsalKicker: string;
    portfolioTitle: string;
    portfolioSubtitle: string;
    portfolioKicker: string;
    cohortTitle: string;
    cohortSubtitle: string;
    cohortKicker: string;
    buildSupportBtn: string;
    submitMentorBtn: string;
    openPeerLibraryBtn: string;
    exportPortfolioBtn: string;
  }
> = {
  en: {
    workspaceLabel: "Teacher Workspace",
    navPrep: "Lesson Prep Studio",
    navRehearsal: "Rehearsal & Review",
    navPortfolio: "CPD Portfolio",
    navCohort: "Cohort Oversight",
    annualTrackTitle: "Your annual track",
    annualTrackLink: "View progress",
    privacyNote: "Private, supportive, non-punitive",
    lowDataMode: "Low-Data Mode",
    offlineCacheReady: "Offline cache ready",
    viewingAs: "Viewing as",
    roleTeacher: "Teacher",
    roleMentor: "Subject Mentor",
    roleCoordinator: "School Coordinator",
    step1Title: "Tell us what you're teaching",
    step1Kicker: "Lesson Setup",
    step2Title: "10-Minute Concept Pack",
    step2Kicker: "Lesson Guide",
    rehearsalTitle: "Rehearse. Get one useful next step.",
    rehearsalSubtitle: "Try your explanation in a realistic 3–5 turn learner exchange. This is coaching, not an exam score.",
    rehearsalKicker: "Private Practice Space",
    portfolioTitle: "Your growth, gathered under your custody.",
    portfolioSubtitle: "Rehearsals and classroom implementation logs stay strictly separate. Exports are 100% teacher-initiated.",
    portfolioKicker: "Annual Competency Review",
    cohortTitle: "Four-week pilot cohort oversight",
    cohortSubtitle: "Anonymized participation, restated 160-minute review budget, engineering controls, and falsifiable pilot metrics.",
    cohortKicker: "School & Division Cohort",
    buildSupportBtn: "Build 10-min Concept Pack",
    submitMentorBtn: "Submit rehearsal for review",
    openPeerLibraryBtn: "Open Shared LAC Library",
    exportPortfolioBtn: "Export teacher-custody MOV / CPD summary",
  },
  fil: {
    workspaceLabel: "Espasyo ng Guro",
    navPrep: "Lesson Prep Studio",
    navRehearsal: "Pagsasanay at Pagsusuri",
    navPortfolio: "CPD Portfolio",
    navCohort: "Pagsubaybay sa Cohort",
    annualTrackTitle: "Iyong taunang track",
    annualTrackLink: "Tingnan ang progreso",
    privacyNote: "Pribado, mapagkalinga, hindi mapanghusga",
    lowDataMode: "Low-Data Mode",
    offlineCacheReady: "Handa ang offline cache",
    viewingAs: "Tinitingnan bilang",
    roleTeacher: "Teacher",
    roleMentor: "Subject Mentor",
    roleCoordinator: "School Coordinator",
    step1Title: "Sabihin sa amin ang iyong ituturo",
    step1Kicker: "Paghahanda ng Aralin",
    step2Title: "10-Minutong Concept Pack",
    step2Kicker: "Gabay sa Aralin",
    rehearsalTitle: "Magsanay. Kumuha ng isang kapaki-pakinabang na hakbang.",
    rehearsalSubtitle: "Subukan ang iyong paliwanag sa makatotohanang 3–5 palitang usapan. Pagsasanay ito, hindi marka.",
    rehearsalKicker: "Pribadong Lugar ng Pagsasanay",
    portfolioTitle: "Ang iyong pag-unlad, nasa sarili mong pangangalaga.",
    portfolioSubtitle: "Hiwalay ang rehearsal sa aktwal na patunay sa klase. Ikaw lamang ang nagpapasya sa pag-export.",
    portfolioKicker: "Taunang Pagsusuri ng Kasanayan",
    cohortTitle: "Pagsubaybay sa apat-na-linggong pilot cohort",
    cohortSubtitle: "Anonymized na datos, 160-minutong review budget, engineering controls, at pilot metrics.",
    cohortKicker: "Cohort ng Paaralan at Dibisyon",
    buildSupportBtn: "Buuin ang Concept Pack",
    submitMentorBtn: "Ipasa para sa pagsusuri ng mentor",
    openPeerLibraryBtn: "Buksan ang Shared LAC Library",
    exportPortfolioBtn: "I-export ang MOV / CPD summary",
  },
  ceb: {
    workspaceLabel: "Workspace sa Magtutudlo",
    navPrep: "Lesson Prep Studio",
    navRehearsal: "Pagbansay ug Pagsusi",
    navPortfolio: "CPD Portfolio",
    navCohort: "Pagmonitor sa Cohort",
    annualTrackTitle: "Imong tinuig nga track",
    annualTrackLink: "Tan-awa ang progreso",
    privacyNote: "Pribado, masinabtanon, dili mapanghusga",
    lowDataMode: "Low-Data Mode",
    offlineCacheReady: "Andam ang offline cache",
    viewingAs: "Gitan-aw isip",
    roleTeacher: "Teacher",
    roleMentor: "Subject Mentor",
    roleCoordinator: "School Coordinator",
    step1Title: "Isulti kanamo ang imong itudlo",
    step1Kicker: "Pagpangandam sa Leksyon",
    step2Title: "10-Minuto nga Concept Pack",
    step2Kicker: "Giya sa Leksyon",
    rehearsalTitle: "Pagbansay. Pagkuha og usa ka praktikal nga sunod nga lakang.",
    rehearsalSubtitle: "Sulayi ang imong pagpasabot sa 3–5 ka turno nga pangutana sa estudyante. Pagbansay kini, dili grado.",
    rehearsalKicker: "Pribadong Lugar sa Pagbansay",
    portfolioTitle: "Ang imong paglambo, ubos sa imong pag-amping.",
    portfolioSubtitle: "Lain ang rehearsal ug ebidensya sa klase. Ikaw ra ang mopili kanus-a mag-export.",
    portfolioKicker: "Tinuig nga Pagsusi sa Kahanas",
    cohortTitle: "Pagmonitor sa upat-ka-simana nga pilot cohort",
    cohortSubtitle: "Anonymized nga datus, 160-minuto nga review budget, engineering controls, ug pilot metrics.",
    cohortKicker: "Cohort sa Eskwelahan ug Dibisyon",
    buildSupportBtn: "Himoa ang Concept Pack",
    submitMentorBtn: "Ipasa alang sa pagsusi sa mentor",
    openPeerLibraryBtn: "Ablihi ang Shared LAC Library",
    exportPortfolioBtn: "I-export ang MOV / CPD summary",
  },
};

export const DEPED_TOPIC_PRESETS: Record<
  SubjectName,
  Array<{ gradeLevel: string; topic: string }>
> = {
  Science: [
    { gradeLevel: "Grade 7", topic: "Solutions: Why a strainer cannot recover dissolved sugar" },
    { gradeLevel: "Grade 7", topic: "Separating mixtures: Evaporation and filtration with everyday tools" },
    { gradeLevel: "Grade 7", topic: "Particle model of matter: Solid, liquid, and gas behavior" },
    { gradeLevel: "Grade 8", topic: "Newton's Laws of Motion: Explaining inertia using daily commutes" },
    { gradeLevel: "Grade 8", topic: "Work, power, and energy transformation in everyday machines" },
    { gradeLevel: "Grade 9", topic: "Chemical bonding: How ionic and covalent bonds affect salt vs. sugar" },
    { gradeLevel: "Grade 9", topic: "Photosynthesis and cellular respiration energy cycling" },
    { gradeLevel: "Grade 10", topic: "Gas Laws: Why sealed bottles expand under direct heat" },
    { gradeLevel: "Grade 10", topic: "Plate tectonics: Explaining earthquakes and subduction zones" },
    { gradeLevel: "Grade 11", topic: "Earth & Life Science: Rock cycle and weathering processes" },
    { gradeLevel: "Grade 11", topic: "Physical Science: Intermolecular forces and boiling point differences" },
    { gradeLevel: "Grade 12", topic: "General Physics: Projectile motion horizontal and vertical independence" },
    { gradeLevel: "Grade 12", topic: "General Chemistry: Stoichiometry and limiting reactants in reactions" },
  ],
  Mathematics: [
    { gradeLevel: "Grade 7", topic: "Adding unlike fractions: Why 1/2 + 1/3 is not 2/5" },
    { gradeLevel: "Grade 7", topic: "Integers and negative numbers using elevation and temperature" },
    { gradeLevel: "Grade 8", topic: "Linear equations and slope using local jeepney fare steps" },
    { gradeLevel: "Grade 8", topic: "Triangle congruence postulates in structural trusses" },
    { gradeLevel: "Grade 9", topic: "Quadratic functions: Modeling projectile paths and maximum height" },
    { gradeLevel: "Grade 9", topic: "Right triangle trigonometry: Finding inaccessible heights" },
    { gradeLevel: "Grade 10", topic: "Permutations vs. combinations in committee selection" },
    { gradeLevel: "Grade 10", topic: "Arithmetic and geometric sequences in savings plans" },
    { gradeLevel: "Grade 11", topic: "General Mathematics: Simple vs. compound interest growth" },
    { gradeLevel: "Grade 11", topic: "Statistics & Probability: Interpreting normal distribution z-scores" },
    { gradeLevel: "Grade 12", topic: "Basic Calculus: Instantaneous rate of change vs. average rate" },
    { gradeLevel: "Grade 12", topic: "Pre-Calculus: Conic sections in parabolic reflectors" },
  ],
  English: [
    { gradeLevel: "Grade 7", topic: "Distinguishing literal vs. figurative meaning in Philippine poetry" },
    { gradeLevel: "Grade 7", topic: "Subject-verb agreement with collective nouns and intervening phrases" },
    { gradeLevel: "Grade 8", topic: "Distinguishing textual evidence from inference in character motives" },
    { gradeLevel: "Grade 8", topic: "Cohesive devices and transitions in explanatory paragraphs" },
    { gradeLevel: "Grade 9", topic: "Evaluating two defensible interpretations using line-level citations" },
    { gradeLevel: "Grade 9", topic: "Modals of obligation, permission, and prohibition in context" },
    { gradeLevel: "Grade 10", topic: "Analyzing ethos, pathos, and logos in civic speeches" },
    { gradeLevel: "Grade 10", topic: "Formulating claims of fact, policy, and value in argumentative essays" },
    { gradeLevel: "Grade 11", topic: "Reading & Writing: Explicit vs. implicit claims and counterclaims" },
    { gradeLevel: "Grade 11", topic: "Oral Communication: Repairing communication breakdowns across cultures" },
    { gradeLevel: "Grade 12", topic: "EAPP: Summarizing and synthesizing academic sources without plagiarism" },
    { gradeLevel: "Grade 12", topic: "21st Century Literature: Analyzing socio-historical context in short fiction" },
  ],
};

export const TEACHER_MAJORS = [
  "MAPEH",
  "English",
  "Social Studies",
  "Mathematics",
  "Filipino",
  "TLE",
  "Values Education / GMRC",
];

export const TRILINGUAL_SUGAR_CASE: Record<
  BansayLanguage,
  {
    bigIdeaSummary: string;
    bridgeTitle: string;
    bridgeExplanation: string;
    trySaying: string;
    limitationNote: string;
    contrastiveExamples: Array<{
      title: string;
      positiveExample: string;
      causalWhy: string;
      contrastiveNonExample: string;
      contrastWhyItDiffers: string;
    }>;
    misconceptionDiagnostic: {
      prompt: string;
      options: string[];
      flawedOptionIndex: number;
      studentMentalModel: string;
      refutation: string;
    };
    quickSelfCheck: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      feedback: string;
    }>;
    misconceptions: Array<{
      question: string;
      whatStudentImagines: string;
      practicalResponse: string;
    }>;
    activityTitle: string;
    materials: string[];
    steps: string[];
    safetyProtocol: string;
    keyTakeaway: string;
    studentQuestion: string;
    freshCasePrompt: string;
    mentorGap: string;
    mentorMove: string;
  }
> = {
  en: {
    bigIdeaSummary:
      "When sugar dissolves in water, its molecules separate to a scale smaller than cloth or strainer fibers without disappearing. Filtration traps larger undissolved particles like sand, while evaporation removes water so dissolved sugar remains behind.",
    bridgeTitle: "Think of it like a dance formation",
    bridgeExplanation:
      "As a MAPEH major, picture sugar particles as dancers who have spread between water molecules. A strainer's holes are like a wide gymnasium doorway: both the water and the tiny dissolved sugar dancers pass straight through together.",
    trySaying:
      "\"Imagine our sugar particles are dancers who have spread throughout the whole formation of water dancers—they didn't vanish, they just became small enough to fit through the strainer's spaces together.\"",
    limitationNote:
      "Remind learners that real sugar particles are far smaller than visible dancers and do not decide where to move; thermal motion mixes them evenly.",
    contrastiveExamples: [
      {
        title: "Dissolved sugar in water vs. sand in water",
        positiveExample: "1 tbsp sugar stirred completely into 1 glass of clear tap water.",
        causalWhy: "Individual sugar molecules separate and mingle among water molecules, making every particle smaller than strainer pores.",
        contrastiveNonExample: "1 tbsp clean sand stirred into 1 glass of tap water.",
        contrastWhyItDiffers: "Sand grains stay clumped as visible solid particles larger than cloth fibers, so the strainer catches them.",
      },
      {
        title: "Evaporation vs. filtration for recovery",
        positiveExample: "Leaving 1 tsp of sugar water on a sunny saucer until dry crystals appear.",
        causalWhy: "Water evaporates into vapor at daytime temperatures while heavier sugar stays behind and recrystallizes.",
        contrastiveNonExample: "Pouring the same sugar water through folded cotton cloth twice.",
        contrastWhyItDiffers: "Folding the cloth reduces visible gaps slightly, yet molecular sugar remains far smaller than fabric spaces.",
      },
    ],
    misconceptionDiagnostic: {
      prompt: "A student says: \"The strainer caught nothing, so the sugar turned into water.\" Which diagnosis best explains their mental model?",
      options: [
        "They recognize conservation of mass at the molecular level.",
        "They equate invisibility with matter disappearing or transforming into liquid.",
        "They understand filtration depends on relative particle size.",
      ],
      flawedOptionIndex: 1,
      studentMentalModel: "Students often assume unseen solids vanished or melted permanently into water.",
      refutation: "Tasting a clean drop or drying a saucer in sunlight proves the sugar was conserved and remained sugar throughout.",
    },
    quickSelfCheck: [
      {
        question: "1. If 10 g of sugar dissolves in 100 g of water, what is the total mass of the solution?",
        options: ["100 g", "110 g", "90 g"],
        correctIndex: 1,
        feedback: "Mass is conserved (100 g + 10 g = 110 g) because dissolved sugar particles are still present.",
      },
      {
        question: "2. Why does a folded cotton handkerchief fail to trap dissolved sugar?",
        options: [
          "Cloth gaps are still far larger than individual sugar molecules.",
          "Sugar melts into gas inside tap water.",
          "Water dissolves the cotton fibers.",
        ],
        correctIndex: 0,
        feedback: "Filtration relies on particle size relative to pore size; molecules pass right through woven cloth.",
      },
      {
        question: "3. Which low-cost evidence shows dissolved sugar is still recoverable?",
        options: [
          "Shining a flashlight through clear water only.",
          "Evaporating a spoonful on a sunlit saucer to reveal crystals.",
          "Stirring faster with a metal spoon.",
        ],
        correctIndex: 1,
        feedback: "Solar evaporation removes water vapor and leaves the solute crystals visibly behind.",
      },
    ],
    misconceptions: [
      {
        question: "\"Ma'am, if the strainer catches nothing, did the sugar disappear for good?\"",
        whatStudentImagines: "Students equate invisibility with matter ceasing to exist.",
        practicalResponse:
          "Compare a pinch of sand in water with sugar in water, then set aside a drop on a saucer to evaporate and reveal the crystals again.",
      },
      {
        question: "\"What if we use a cloth with really, really tiny holes?\"",
        whatStudentImagines: "They treat dissolved particles like very fine powder grains trapped by tighter weave.",
        practicalResponse:
          "Explain that dissolved sugar separates into individual molecules smaller than cloth fiber gaps, so filtration separates undissolved solids (sand), while evaporation recovers dissolved solids (sugar or salt).",
      },
    ],
    activityTitle: "Kitchen strainer vs. evaporated saucer comparison",
    materials: [
      "2 clear drinking glasses or recycled jars",
      "1 tbsp white sugar + 1 tbsp clean sand",
      "1 kitchen tea strainer or folded clean cloth",
      "1 small saucer left in sunlight or warm spot",
    ],
    steps: [
      "Stir sand into Glass A and sugar into Glass B so students compare cloudy suspension vs. clear solution.",
      "Pour both through a kitchen strainer or cloth into separate jars. Ask students what stays on the strainer.",
      "Place 1 teaspoon of the clear sugar water onto a small saucer ahead of time and show the dried crystals next day.",
    ],
    safetyProtocol: "Use sunlight or a warm windowsill for evaporation rather than an open flame; remind learners not to taste classroom samples unless prepared in food-safe cups.",
    keyTakeaway:
      "Filtration catches undissolved particles (sand) larger than the mesh, whereas dissolved sugar spreads at the molecular level and requires evaporation to recover.",
    studentQuestion: "\"What if we use a cloth with really, really tiny holes?\"",
    freshCasePrompt:
      "A Grade 7 learner asks: \"When we leave saltwater in a saucer under the sun, only salt stays behind. Why didn't the salt fly away with the water?\" Explain clearly without introducing new errors.",
    mentorGap:
      "Focus on particle size, not visibility—otherwise learners think finer cloth eventually catches dissolved sugar.",
    mentorMove:
      "Ask learners to predict first, then compare sand-water vs. sugar-water through the same cloth before showing the dried saucer.",
  },
  fil: {
    bigIdeaSummary:
      "Kapag natunaw ang asukal sa tubig, naghihiwalay ang mga molekula nito sa sukat na mas maliit pa sa butas ng salaan o tela nang hindi nawawala. Hinuhuli ng pagsala ang malalaking buhangin, habang nagpapasingaw ng tubig ang pagpapatuyo upang maiwan ang asukal.",
    bridgeTitle: "Isipin ito bilang isang dance formation",
    bridgeExplanation:
      "Bilang MAPEH major, isipin ang mga partikulo ng asukal bilang mga mananayaw na kumalat sa pagitan ng mga molekula ng tubig. Ang mga butas ng salaan ay parang maluwag na pintuan ng gym: sabay na nakakalusot ang tubig at ang maliliit na natunaw na partikulo.",
    trySaying:
      "\"Isipin ninyong mga mananayaw ang maliliit na partikulo ng asukal na sumingit sa buong formation ng tubig—hindi sila nawala, lumiit lang sila nang sapat para makalusot nang sabay sa salaan.\"",
    limitationNote:
      "Paalalahanan ang klase na hindi kusang gumagalaw ang mga molekula tulad ng tao; pantay silang nahahalo dahil sa natural na galaw ng init.",
    contrastiveExamples: [
      {
        title: "Natunaw na asukal sa tubig vs. buhangin sa tubig",
        positiveExample: "1 kutsarang asukal na hinalo sa 1 basong malinaw na tubig.",
        causalWhy: "Ang mga molekula ng asukal ay humihiwalay at mas maliit sa butas ng salaan.",
        contrastiveNonExample: "1 kutsarang buhangin na hinalo sa 1 basong tubig.",
        contrastWhyItDiffers: "Nananatiling buo ang malalaking butil ng buhangin kaya naiiwan ito sa salaan.",
      },
      {
        title: "Pagpapatuyo (evaporation) vs. pagsala",
        positiveExample: "Pagbibilad ng 1 kutsaritang tubig-asukal sa platito sa araw.",
        causalWhy: "Sumisingaw ang tubig ngunit naiiwan ang kristal ng asukal sa platito.",
        contrastiveNonExample: "Pagbuhos nang dalawang beses sa makapal na panyo.",
        contrastWhyItDiffers: "Mas maliit pa rin ang molekula ng asukal kaysa hibla ng panyo.",
      },
    ],
    misconceptionDiagnostic: {
      prompt: "Sabi ng estudyante: \"Walang naiwan sa salaan kaya naging tubig na ang asukal.\" Ano ang nasa isip niya?",
      options: [
        "Alam niyang nananatili ang kabuuang timbang ng halo.",
        "Iniuugnay niya ang pagiging hindi nakikita sa tuluyang pagkawala ng bagay.",
        "Nauunawaan niya ang laki ng molekula.",
      ],
      flawedOptionIndex: 1,
      studentMentalModel: "Akala ng mag-aaral ay naglaho o nag-iba ng anyo ang natunaw na asukal.",
      refutation: "Ipinapakita ng tuyong kristal sa platito na nanatiling asukal ito sa loob ng tubig.",
    },
    quickSelfCheck: [
      {
        question: "1. Kung 10 g ng asukal ay natunaw sa 100 g ng tubig, ano ang kabuuang timbang?",
        options: ["100 g", "110 g", "90 g"],
        correctIndex: 1,
        feedback: "Nananatili ang kabuuang mass (110 g) dahil naroon pa rin ang mga partikulo ng asukal.",
      },
      {
        question: "2. Bakit hindi mahuhuli ng panyo ang natunaw na asukal?",
        options: [
          "Mas maliit ang molekula ng asukal kaysa gintang ng hibla ng tela.",
          "Naging hangin ang asukal.",
          "Sinisira ng tubig ang panyo.",
        ],
        correctIndex: 0,
        feedback: "Nakadepende ang pagsala sa laki ng butas kumpara sa laki ng partikulo.",
      },
      {
        question: "3. Paano maibabalik ang asukal mula sa malinaw na solusyon?",
        options: [
          "Itapat sa ilaw.",
          "Patuyuin sa platito sa ilalim ng araw.",
          "Haluin nang mas mabilis.",
        ],
        correctIndex: 1,
        feedback: "Pinapasingaw ng init ng araw ang tubig at iniiwan ang mga kristal.",
      },
    ],
    misconceptions: [
      {
        question: "\"Ma'am, kung walang naiwan sa salaan, nawala na po ba nang tuluyan ang asukal?\"",
        whatStudentImagines: "Iniisip ng mga mag-aaral na kapag hindi na nakikita, tuluyan nang naglaho ang bagay.",
        practicalResponse:
          "Ihambing ang buhangin sa tubig at asukal sa tubig, saka magtira ng kaunting patak sa platito upang matuyo at makitang muli ang kristal.",
      },
      {
        question: "\"Paano kung gumamit tayo ng telang may sobrang liit na mga butas?\"",
        whatStudentImagines: "Akala nila ay parang pinong pulbos pa rin ang natunaw na asukal na kaya pang salain.",
        practicalResponse:
          "Ipaliwanag na ang natunaw na asukal ay naghihiwalay sa antas ng molekula na mas maliit pa sa hibla ng tela, kaya pagpapatuyo (evaporation) ang kailangan upang maibalik ito.",
      },
    ],
    activityTitle: "Paghahambing ng salaan sa kusina at pinatuyong platito",
    materials: [
      "2 malinaw na baso o garapon",
      "1 kutsarang asukal + 1 kutsarang malinis na buhangin",
      "1 salaan sa kusina o malinis na tela",
      "1 maliit na platito na ibinilad sa araw",
    ],
    steps: [
      "Haluin ang buhangin sa Baso A at asukal sa Baso B upang makita ang pagkakaiba ng malabo at malinaw na halo.",
      "Ibuhos ang dalawa sa salaan o tela. Tanungin ang klase kung ano ang naiwan.",
      "Maglagay ng kaunting tubig-asukal sa platito nang mas maaga at ipakita ang natuyong kristal sa susunod na araw.",
    ],
    safetyProtocol: "Gumamit ng sikat ng araw sa pagpapatuyo sa halip na bukas na apoy; huwag ipatikim ang mga sample sa klase maliban kung food-safe.",
    keyTakeaway:
      "Nahuhuli ng salaan ang hindi natunaw na buhangin, samantalang ang natunaw na asukal ay lumulusot sa antas ng molekula at nababawi sa pagpapatuyo.",
    studentQuestion: "\"Paano kung gumamit tayo ng telang may sobrang liit na mga butas?\"",
    freshCasePrompt:
      "Nagtanong ang isang mag-aaral: \"Kapag ibinilad natin ang tubig-alat sa platito, bakit asin lang ang naiiwan at hindi ito sumasama sa singaw ng tubig?\" Ipaliwanag nang malinaw.",
    mentorGap:
      "Ituon ang paliwanag sa laki ng partikulo, hindi sa pagiging hindi nakikita—upang hindi isiping mas pipino pang tela ay makakahuli na ng natunaw na asukal.",
    mentorMove:
      "Tanungin muna ang hula ng klase, pagkatapos ay ihambing ang tubig-buhangin at tubig-asukal sa parehong tela bago ipakita ang tuyong platito.",
  },
  ceb: {
    bigIdeaSummary:
      "Kung matunaw ang asukar sa tubig, mabahin ang mga molekula niini ngadto sa gidak-on nga mas gamay pa sa buslot sa salaan o panapton nga wala mawala. Madakpan sa salaan ang dagkong balas, samtang ang pagpauga moalisngaw sa tubig aron mabilin ang asukar.",
    bridgeTitle: "Hunahunaa kini sama sa usa ka dance formation",
    bridgeExplanation:
      "Isip MAPEH major, hunahunaa ang mga partikulo sa asukar isip mga mananayaw nga nikuyanap taliwala sa mga molekula sa tubig. Ang mga buslot sa salaan sama sa lapad nga pultahan sa gym: dungan nga makalusot ang tubig ug ang gagmay kaayong natunaw nga asukar.",
    trySaying:
      "\"Hunahunaa nga ang mga partikulo sa asukar mga mananayaw nga nakig-ipon sa tibuok formation sa tubig—wala sila mawala, nigamay lang sila og igo aron makalusot dungan sa tubig sa salaan.\"",
    limitationNote:
      "Pahinumdomi ang klase nga dili pareho sa tawo ang mga molekula nga magbuot og lihok; parehas silang masagol tungod sa natural nga lihok sa kainit.",
    contrastiveExamples: [
      {
        title: "Natunaw nga asukar sa tubig vs. balas sa tubig",
        positiveExample: "1 ka kutsarang asukar nga gikutaw sa 1 ka basong tin-aw nga tubig.",
        causalWhy: "Mabahin ang mga molekula sa asukar nga mas gamay pa kaysa buslot sa salaan.",
        contrastiveNonExample: "1 ka kutsarang balas nga gikutaw sa 1 ka basong tubig.",
        contrastWhyItDiffers: "Magpabiling dagko ang lugas sa balas busa mabilin kini sa salaan.",
      },
      {
        title: "Pagpauga (evaporation) vs. pagsala",
        positiveExample: "Pagbulad sa 1 ka kutsaritang tubig-asukar sa platito ilawom sa adlaw.",
        causalWhy: "Moalisngaw ang tubig ug mabilin ang kristal sa asukar.",
        contrastiveNonExample: "Pagbubo kaduha sa nipis nga panapton.",
        contrastWhyItDiffers: "Mas gamay gihapon ang molekula sa asukar kaysa lanot sa panapton.",
      },
    ],
    misconceptionDiagnostic: {
      prompt: "Miingon ang bata: \"Walay nabilin sa salaan mao nga nahimong tubig na ang asukar.\" Unsa ang iyang gihunahuna?",
      options: [
        "Nakaila siya sa conservation of mass.",
        "Nagtuo siya nga ang dili makita nawala na o nahimong likido.",
        "Nakasabot siya sa molecular scale.",
      ],
      flawedOptionIndex: 1,
      studentMentalModel: "Abi sa bata nga nawala ang butang kung dili na makita.",
      refutation: "Ang uga nga kristal sa platito nagpakita nga nagpabilin gihapon ang asukar.",
    },
    quickSelfCheck: [
      {
        question: "1. Kung ang 10 g nga asukar matunaw sa 100 g nga tubig, pila ang tibuok nga gibug-aton?",
        options: ["100 g", "110 g", "90 g"],
        correctIndex: 1,
        feedback: "Nagpabilin ang tibuok mass (110 g) kay anaa gihapon ang asukar.",
      },
      {
        question: "2. Nganong dili madakpan sa panyo ang natunaw nga asukar?",
        options: [
          "Mas gamay ang molekula sa asukar kaysa buslot sa panapton.",
          "Nahimong hangin ang asukar.",
          "Natunaw usab ang panapton.",
        ],
        correctIndex: 0,
        feedback: "Ang pagsala nagdepende sa gidak-on sa partikulo ug buslot.",
      },
      {
        question: "3. Unsaon pagbawi sa asukar gikan sa tin-aw nga sagol?",
        options: [
          "Ipadan-ag sa suga.",
          "Paughan sa platito ilawom sa adlaw.",
          "Kutawon og mas paspas.",
        ],
        correctIndex: 1,
        feedback: "Ang pagpauga moalisngaw sa tubig aron mabilin ang kristal.",
      },
    ],
    misconceptions: [
      {
        question: "\"Ma'am, kung walay nabilin sa salaan, nawala na ba gyud hangtod sa hangtod ang asukar?\"",
        whatStudentImagines: "Nagtuo ang mga bata nga kung dili na makita sa mata, wala na gyud ang butang.",
        practicalResponse:
          "Itandi ang balas sa tubig ug asukar sa tubig, dayon pagbilin og gamayng tulo sa platito aron mauga ug makita pagbalik ang kristal.",
      },
      {
        question: "\"Unsaon kung mogamit tag panapton nga gagmay kaayo og buslot?\"",
        whatStudentImagines: "Abi nila og sama ra sa pinong abog ang natunaw nga asukar nga madakpan gihapon sa mas pino nga panapton.",
        practicalResponse:
          "Ipasabot nga ang natunaw nga asukar nabahin ngadto sa gagmay kaayong molekula nga mas gamay pa kaysa gintang sa lanot sa panapton, busa pagpauga (evaporation) ang makabalik niini.",
      },
    ],
    activityTitle: "Pagtandi gamit ang salaan sa kusina ug gipaughan nga platito",
    materials: [
      "2 ka tin-aw nga baso o garapon",
      "1 ka kutsarang asukar + 1 ka kutsarang limpyo nga balas",
      "1 ka salaan sa kusina o limpyo nga panapton",
      "1 ka gamayng platito nga gibutang sa init",
    ],
    steps: [
      "Kutawa ang balas sa Baso A ug asukar sa Baso B aron makita sa mga bata ang kalainan sa lubog ug tin-aw nga sagol.",
      "Ibubo ang duha sa salaan o panapton. Pangutan-a sila unsay nabilin sa ibabaw.",
      "Pagbutang og gamayng tubig nga naay asukar sa platito daan ug ipakita ang uga nga kristal pagkaugma.",
    ],
    safetyProtocol: "Gamita ang kainit sa adlaw sa pagpauga imbes nga siga; likayi ang pagpatilaw gawas kung limpyo ug food-safe ang mga baso.",
    keyTakeaway:
      "Madakpan sa salaan ang wala matunaw nga balas, apan ang natunaw nga asukar molusot sa lebel sa molekula ug mabalik pinaagi sa pagpauga.",
    studentQuestion: "\"Unsaon kung mogamit tag panapton nga gagmay kaayo og buslot?\"",
    freshCasePrompt:
      "Nangutana ang Grade 7 nga estudyante: \"Kung atong paughan ang tubig nga naay asin sa platito, nganong asin ra man ang mabilin ug dili mokuyog sa alisngaw?\" Ipasabot kini nga walay bag-ong sayop.",
    mentorGap:
      "Ipokus ang pasabot sa gidak-on sa partikulo, dili sa pagkadili makita—aron dili maghunahuna ang klase nga mas pino nga panapton makadakop na og natunaw nga asukar.",
    mentorMove:
      "Pangutan-a una ang ilang gitag-an, dayon itandi ang tubig-balas ug tubig-asukar sa parehong panapton sa dili pa ipakita ang gipaughan nga platito.",
  },
};

export const INITIAL_CASES: LessonCase[] = [
  {
    id: "case-science-sugar-01",
    subject: "Science",
    gradeLevel: "Grade 7",
    topic: "Solutions: Why a strainer cannot recover dissolved sugar",
    teacherName: "Maria Reyes",
    teacherMajor: "MAPEH",
    classDate: "2026-12-03",
    careerStage: "2",
    submittedAt: "2026-11-26",
    language: "en",
    startingMaterial:
      "DepEd Grade 7 MATATAG Science Quarter 1 module on saturated and unsaturated solutions, plus sugar, water, and a small kitchen strainer.",
    baselineFirst: true,
    baselineExplanation:
      "When sugar dissolves in water it breaks into tiny pieces so small that they pass right through the holes of a strainer along with the water.",
    submissionFormat: "live-ai",
    packStatus: "mentor-verified",
    leadTimeTier: "standard-sla",
    daysUntilClass: 7,
    usesLabEquipment: false,
    diagnosticCompleted: true,
    selfCheckScore: 3,
    matchedLacPackId: "lib-1",
    postClassReflection: "",
    mediaAssets: [],
    support: {
      bigIdea: {
        summary: TRILINGUAL_SUGAR_CASE.en.bigIdeaSummary,
        curriculumGrounding: "MATATAG (K-9)",
        ppstIndicators: buildPpstIndicators("2"),
      },
      specialtyBridge: {
        title: TRILINGUAL_SUGAR_CASE.en.bridgeTitle,
        explanation: TRILINGUAL_SUGAR_CASE.en.bridgeExplanation,
        trySaying: TRILINGUAL_SUGAR_CASE.en.trySaying,
        limitationNote: TRILINGUAL_SUGAR_CASE.en.limitationNote,
      },
      contrastiveExamples: TRILINGUAL_SUGAR_CASE.en.contrastiveExamples,
      misconceptionDiagnostic: TRILINGUAL_SUGAR_CASE.en.misconceptionDiagnostic,
      misconceptionAlerts: TRILINGUAL_SUGAR_CASE.en.misconceptions,
      quickSelfCheck: TRILINGUAL_SUGAR_CASE.en.quickSelfCheck,
      improvisedActivity: {
        title: TRILINGUAL_SUGAR_CASE.en.activityTitle,
        materials: TRILINGUAL_SUGAR_CASE.en.materials,
        steps: TRILINGUAL_SUGAR_CASE.en.steps,
        safetyProtocol: TRILINGUAL_SUGAR_CASE.en.safetyProtocol,
        keyTakeaway: TRILINGUAL_SUGAR_CASE.en.keyTakeaway,
        usesLabEquipment: false,
      },
      simulatedStudentPrompt: {
        studentName: "Jessa",
        openingQuestion: TRILINGUAL_SUGAR_CASE.en.studentQuestion,
        freshCasePrompt: TRILINGUAL_SUGAR_CASE.en.freshCasePrompt,
      },
      judgeReport: {
        scores: {
          conceptualAccuracy: 3,
          analogyFidelity: 3,
          misconceptionDepth: 3,
          localFeasibility: 3,
          mobileScannability: 3,
        },
        regenerationCount: 0,
        passed: true,
        notes: "Passed 5-criterion gate on first pass (<=3 sentence Big Idea, explicit analogy boundary, household whitelist, solar safety).",
      },
    },
    rehearsalMessages: [
      {
        id: "m-1",
        sender: "student",
        text: "What if we use a cloth with really, really tiny holes?",
        timestamp: "08:14 PM",
      },
    ],
    mentorReview: {
      mentorName: "Ramon Villamor",
      mentorAffiliation: "MSU-IIT Science Specialist",
      backupMentorName: "Elena Villanueva",
      languagesCovered: ["en", "fil", "ceb"],
      reviewedAt: "Within 18 hours",
      focusedGap: TRILINGUAL_SUGAR_CASE.en.mentorGap,
      teachingMove: TRILINGUAL_SUGAR_CASE.en.mentorMove,
      quickRefresher: "",
      masteredSkill: "Uses concrete everyday comparison (strainer doorway)",
      practiceSkill: "Distinguishing particle scale from visible powder grains",
      status: "returned",
      reviewQueueLane: "standard-sla",
      packAuditDurationSec: 112,
      transcriptReviewDurationSec: 215,
      packSubstantiveRewrite: false,
      packVerifiedAt: "2026-11-26T10:15:00Z",
    },
    teacherRevision: "",
    freshCaseResponse: "",
    freshCaseStatus: "ready",
    cachedOffline: true,
  },
];

export const INITIAL_PEER_LIBRARY: PeerLibraryItem[] = [
  {
    id: "lib-1",
    subjectTag: "Science 7",
    subject: "Science",
    gradeLevel: "Grade 7",
    title: "Solutions: Why a strainer cannot recover dissolved sugar",
    summary: "Comparing sand suspension vs. dissolved sugar using a household strainer and sun-dried saucer.",
    bigIdeaSummary:
      "Dissolved sugar separates into individual molecules smaller than strainer pores without disappearing. Filtration traps sand, while evaporation leaves sugar crystals behind.",
    limitationNote: "Remind learners that real molecules move by thermal motion rather than intentional choice.",
    verifiedExplanation:
      "Focus on particle scale rather than disappearance: dissolved sugar breaks down to molecules smaller than cloth fibers, so filtration catches sand while evaporation leaves sugar or salt crystals behind.",
    improvisedSetup: "2 clear jars, 1 tbsp sugar, 1 tbsp sand, kitchen tea strainer, 1 small saucer left in sunlight.",
    ppstIndicators: buildPpstIndicators("2"),
    saveCount: 12,
    language: "en",
  },
  {
    id: "lib-2",
    subjectTag: "Mathematics 8",
    subject: "Mathematics",
    gradeLevel: "Grade 8",
    title: "Linear equations and slope using local jeepney fare steps",
    summary: "Connecting rise-over-run to step changes in PUJ distance fare increments across barangay stops.",
    bigIdeaSummary:
      "Slope represents a constant rate of change between two quantities, distinct from the starting value (y-intercept). In jeepney fares, the base flag-down fare is fixed while each extra kilometer adds a steady increment.",
    limitationNote: "Actual PUJ fares step in whole pesos per kilometer rather than smooth continuous decimals.",
    verifiedExplanation:
      "Define horizontal distance (kilometers past minimum 4 km) as the run and each uniform fare increment as the rise, helping students separate fixed base fare (y-intercept) from rate of change (slope).",
    improvisedSetup: "Hand-drawn coordinate strip on manila paper showing Tibanga to Pala-o stops.",
    ppstIndicators: buildPpstIndicators("2"),
    saveCount: 9,
    language: "en",
  },
  {
    id: "lib-3",
    subjectTag: "English 8",
    subject: "English",
    gradeLevel: "Grade 8",
    title: "Distinguishing textual evidence from inference in character motives",
    summary: "Helping learners cite exact textual lines before debating competing character emotions.",
    bigIdeaSummary:
      "Textual evidence consists of explicit actions or words directly recorded in a text, whereas inference is a reasoned conclusion drawn from those clues. Multiple inferences can be valid when anchored in exact lines.",
    limitationNote: "Not every personal guess counts as a sound inference; each claim must align with observable details in the passage.",
    verifiedExplanation:
      "Accept multiple defensible interpretations when each learner anchors their claim in observable phrasing, then distinguish direct textual fact from reasonable inference.",
    improvisedSetup: "Two-column blackboard chart: Column A (What the text says) · Column B (What we infer).",
    ppstIndicators: buildPpstIndicators("2"),
    saveCount: 11,
    language: "en",
  },
];

export const INITIAL_COMPETENCY_QUARTERS: CompetencyQuarter[] = [
  {
    quarter: "Q1",
    title: "Content foundations",
    description: "Specialty bridges & core concept checks across Matter & Mixtures",
    completedCount: 3,
    targetCount: 3,
    status: "verified",
  },
  {
    quarter: "Q2",
    title: "Learner reasoning",
    description: "Interpreting student misconceptions and unexpected answers",
    completedCount: 3,
    targetCount: 3,
    status: "verified",
  },
  {
    quarter: "Q3",
    title: "Adaptive instruction",
    description: "Applying mentor teaching moves independently to fresh cases",
    completedCount: 2,
    targetCount: 3,
    status: "in-progress",
  },
  {
    quarter: "Q4",
    title: "Evidence & reflection",
    description: "Documented classroom demonstrations & peer LAC sharing",
    completedCount: 0,
    targetCount: 3,
    status: "upcoming",
  },
];

export const INITIAL_EVIDENCE_ITEMS: ClassroomEvidenceItem[] = [
  {
    id: "ev-1",
    title: "Evaporative setup using kitchen materials",
    subject: "Science 7 · Solutions",
    date: "2026-11-18",
    revisionUsed: "Compared sand-water and sugar-water through the same strainer before revealing the dried saucer.",
    classroomOutcome: "Students predicted why crystals stayed behind; two learners corrected their assumption that sugar vanished.",
    evidenceType: "Improvised Lab Setup",
    verificationStatus: "Mentor verified",
  },
  {
    id: "ev-2",
    title: "Reflection: questions that revealed reasoning",
    subject: "Science 7 · Particle Scale",
    date: "2026-11-21",
    revisionUsed: "Added a prediction prompt asking students what they expected to see on the saucer before showing it.",
    classroomOutcome: "Heard three learners' reasoning aloud before giving the formal particle explanation.",
    evidenceType: "Classroom Reflection",
    verificationStatus: "Teacher logged",
  },
];

export const INITIAL_COHORT_SEATS: CohortSeat[] = [
  { seatCode: "Teacher A (Anon)", subjectArea: "Science", majorBackground: "MAPEH", cyclesCompleted: 2, onTimeReviews: 2, freshCaseImproved: true, submissionChannel: "Live AI", status: "Completed 2 cycles" },
  { seatCode: "Teacher B (Anon)", subjectArea: "Science", majorBackground: "English", cyclesCompleted: 2, onTimeReviews: 2, freshCaseImproved: true, submissionChannel: "Live AI", status: "Completed 2 cycles" },
  { seatCode: "Teacher C (Anon)", subjectArea: "Science", majorBackground: "Social Studies", cyclesCompleted: 2, onTimeReviews: 2, freshCaseImproved: true, submissionChannel: "Offline Prompt", status: "Completed 2 cycles" },
  { seatCode: "Teacher D (Anon)", subjectArea: "Science", majorBackground: "TLE", cyclesCompleted: 2, onTimeReviews: 2, freshCaseImproved: true, submissionChannel: "Live AI", status: "Completed 2 cycles" },
  { seatCode: "Teacher E (Anon)", subjectArea: "Science", majorBackground: "Filipino", cyclesCompleted: 2, onTimeReviews: 2, freshCaseImproved: true, submissionChannel: "Live AI", status: "Completed 2 cycles" },
  { seatCode: "Teacher F (Anon)", subjectArea: "Science", majorBackground: "Values Ed", cyclesCompleted: 2, onTimeReviews: 1, freshCaseImproved: false, submissionChannel: "Offline Prompt", status: "Completed 2 cycles" },
  { seatCode: "Teacher G (Anon)", subjectArea: "Science", majorBackground: "MAPEH", cyclesCompleted: 1, onTimeReviews: 1, freshCaseImproved: null, submissionChannel: "Live AI", status: "In cycle 2" },
  { seatCode: "Teacher H (Anon)", subjectArea: "Science", majorBackground: "English", cyclesCompleted: 1, onTimeReviews: 1, freshCaseImproved: null, submissionChannel: "Offline Prompt", status: "Cycle 1 active" },
];

// Restated Table 4: Five (5) Pre-Delivery Concept Pack Engineering Controls
export const ENGINEERING_CONTROLS_TABLE: EngineeringControlMetric[] = [
  {
    id: "ctrl-1",
    control: "1. Analogical Boundary Guardrail",
    specification: "Mandatory where_analogy_breaks_down paired with every Specialty Bridge",
    purpose: "Prevents cross-disciplinary metaphors from introducing scientific misconceptions",
    passCount: 16,
    totalCount: 16,
  },
  {
    id: "ctrl-2",
    control: "2. Contrastive Causal Worked Examples",
    specification: "Positive example + contrastive non-example isolating causal why from procedure",
    purpose: "Closes the interview gap where teachers run activities without explaining why",
    passCount: 16,
    totalCount: 16,
  },
  {
    id: "ctrl-3",
    control: "3. Cognitive-Conflict Misconception & Self-Check",
    specification: "Diagnostic MCQ + 3-item formative check with instant feedback",
    purpose: "Builds diagnostic empathy and active retrieval in under 3 minutes",
    passCount: 15,
    totalCount: 16,
  },
  {
    id: "ctrl-4",
    control: "4. Resource-Constrained Local Materials Whitelist",
    specification: "Household/sari-sari items unless lab equipment is explicitly toggled on",
    purpose: "Guarantees 100% classroom feasibility in under-resourced public high schools",
    passCount: 16,
    totalCount: 16,
  },
  {
    id: "ctrl-5",
    control: "5. Automated 5-Criterion LLM-Judge Gate",
    specification: "0–3 scale across 5 criteria; auto-regenerates up to 2x if any score < 2",
    purpose: "Enforces a deterministic quality floor before serving an AI Draft pack",
    passCount: 16,
    totalCount: 16,
  },
];

// Restated Table 5: Four (4) Falsifiable Pilot Validation Metrics
export const PILOT_VALIDATION_METRICS_TABLE: PilotValidationMetric[] = [
  {
    id: "met-1",
    metric: "1. Concept Pack Mentor Edit Rate",
    threshold: "<= 20% substantive rewrites (<= 3 of 16 packs)",
    currentValue: "2 / 16 (12.5%)",
    dataSource: "Logged diff between AI Draft JSON and Mentor-Verified pack",
    meetsThreshold: true,
  },
  {
    id: "met-2",
    metric: "2. Pre-Rehearsal Diagnostic Lift",
    threshold: ">= 75% error elimination OR >= +1.0 pt mean gain (0–3)",
    currentValue: "13 / 16 (81.3%, +1.35 pt)",
    dataSource: "Baseline First vs. self-check & Turn 1 rehearsal accuracy",
    meetsThreshold: true,
  },
  {
    id: "met-3",
    metric: "3. Mentor 4-Minute Transcript Review Compliance",
    threshold: "Median <= 4.0 min; >= 81.25% (>= 13/16) within 2-day SLA",
    currentValue: "3.6 min median · 14 / 16 (87.5%)",
    dataSource: "Timestamped mentor queue logs across initial & fresh-case reviews",
    meetsThreshold: true,
  },
  {
    id: "met-4",
    metric: "4. Independent Fresh-Case Transfer Rate",
    threshold: ">= 62.5% (>= 5 of 8 cohort teachers) improved without error",
    currentValue: "5 / 8 (62.5%)",
    dataSource: "Blinded second-reviewer comparison of baseline vs. fresh case",
    meetsThreshold: true,
  },
];

// Restated Table 6: Pilot Direct Delivery Cost Reconciliation (160 min direct + 200 min prep = 360 min)
export const PILOT_BUDGET_ITEMS: PilotBudgetRow[] = [
  {
    expense: "Subject Mentor Labor",
    basis: "6.0 hr (360 min) x ₱400/hr: 96 min initial (16x[2m+4m]) + 64 min fresh (16x4m) + 200 min prep & calibration",
    estimatedValue: "₱2,400",
    cashOutlay: "₱0",
  },
  {
    expense: "Cohort Coordination",
    basis: "4.0 hr x ₱250/hr (intake triage, SLA tracking, backup routing & closeout)",
    estimatedValue: "₱1,000",
    cashOutlay: "₱0",
  },
  {
    expense: "AI Inference (LLM Compute)",
    basis: "16 cycles x ~₱2.50/cycle (Concept Pack + 5-crit Judge + 20% regen + AI student) + ₱10 buffer",
    estimatedValue: "₱50",
    cashOutlay: "₱50",
  },
  {
    expense: "Mobile Data & Incidentals",
    basis: "Prepaid mobile-data allowance & SMS deadline notifications for 8 pilot teachers",
    estimatedValue: "₱250",
    cashOutlay: "₱250",
  },
];

// Restated Table 7: Pilot Baseline vs. Updated Commercial Unit Economics
export const UNIT_ECONOMICS_TABLE: UnitEconomicsRow[] = [
  {
    tier: "Pilot Cohort (Baseline)",
    buyer: "Host school / STTP+ R&D trial",
    variableCogs: "₱3,700 (₱300 cash)",
    targetPrice: "₱3,700",
    grossProfit: "₱0 (-₱300 cash)",
    grossMargin: "0.0%",
    status: "Active 4-week baseline",
  },
  {
    tier: "Free Preparation Tier (B2C)",
    buyer: "Individual teachers (2 cycles/mo)",
    variableCogs: "~₱5.00/user/mo",
    targetPrice: "₱0",
    grossProfit: "-₱5.00/mo",
    grossMargin: "Acquisition CAC",
    status: "Active funnel",
  },
  {
    tier: "Mentored Cohort (Commercial)",
    buyer: "DepEd SDO (HRTD), LGU (SEF), Private Schools",
    variableCogs: "₱3,700/cohort",
    targetPrice: "₱12,000/cohort",
    grossProfit: "₱8,300",
    grossMargin: "69.2%",
    status: "Pricing hypothesis",
  },
  {
    tier: "School-Wide SaaS License",
    buyer: "Public/Private High Schools (MOOE LAC/ICT)",
    variableCogs: "₱1,800/school/yr (50% LAC cache)",
    targetPrice: "₱18,000/school/yr",
    grossProfit: "₱16,200",
    grossMargin: "90.0%",
    status: "Pricing hypothesis",
  },
  {
    tier: "Teacher Pro + CPD Pass",
    buyer: "Individual teachers (optional B2C)",
    variableCogs: "₱90/teacher/yr",
    targetPrice: "₱599/teacher/yr",
    grossProfit: "₱509",
    grossMargin: "85.0%",
    status: "Contingent on CPD accred.",
  },
];

// 4-Tier Media Capture, Retention & RA 10173 Privacy Policy
export const MEDIA_POLICY_TIERS = [
  {
    tier: "1. Core Rehearsal Webcam Video (Step 4)",
    storageRule: "Browser-Local Only (0 KB uploaded)",
    consentRule: "Held strictly in browser memory for teacher self-review; never transmitted.",
    retentionWindow: "0 hours (purged on tab close/refresh)",
    portfolioInclusion: "Excluded (Never Uploaded)",
  },
  {
    tier: "2. Phase 2 COT Quick-Review Video (Single Exception)",
    storageRule: "Encrypted Server Upload (Paid Add-On)",
    consentRule: "Separate informed consent modal confirming teacher/materials-only framing (no student faces).",
    retentionWindow: "Auto-deleted within 7 calendar days after mentor feedback",
    portfolioInclusion: "Video Stripped (Written COT note saved only)",
  },
  {
    tier: "3. Opt-In Rehearsal Voice Notes (Step 4)",
    storageRule: "Encrypted Server Upload (~150 KB/min Opus)",
    consentRule: "Explicit microphone permission & submission consent; visible only to assigned mentor.",
    retentionWindow: "Auto-deleted within 14 calendar days (or on cycle closeout)",
    portfolioInclusion: "Audio Stripped (Teacher-verified transcript kept)",
  },
  {
    tier: "4. Optional Setup / Lesson Photos (Steps 2 & 7)",
    storageRule: "Encrypted Private Portfolio Vault (<= 1 MB)",
    consentRule: "Teacher confirms zero student faces or personal learner data before upload.",
    retentionWindow: "Active school year; purged within 30 days of deletion/expiry",
    portfolioInclusion: "Included (Opt-In teacher custody only)",
  },
];
