import type {
  BansayLanguage,
  ClassroomEvidenceItem,
  CohortSeat,
  CompetencyQuarter,
  LessonCase,
  PeerLibraryItem,
  SubjectName,
} from "../types/bansay";

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
    roleTeacher: "Out-of-Field Teacher",
    roleMentor: "Subject Mentor",
    roleCoordinator: "School Coordinator",
    step1Title: "Tell us what you're teaching",
    step1Kicker: "Step 1 · Lesson Intake",
    step2Title: "Your ready-to-use support",
    step2Kicker: "Step 2 · Immediate Preparation",
    rehearsalTitle: "Rehearse. Get one useful next step.",
    rehearsalSubtitle: "Try your explanation in a realistic learner exchange. This is coaching, not an exam score.",
    rehearsalKicker: "Private Practice Space",
    portfolioTitle: "Your growth, gathered in one place.",
    portfolioSubtitle: "Track online rehearsals and classroom implementation logs separately for DepEd and partner CPD review.",
    portfolioKicker: "Annual Competency Review",
    cohortTitle: "Four-week pilot cohort oversight",
    cohortSubtitle: "Anonymized school-level participation, two-school-day feedback turnaround, and continuation thresholds.",
    cohortKicker: "School & Division Cohort",
    buildSupportBtn: "Build my lesson support",
    submitMentorBtn: "Submit for mentor review",
    openPeerLibraryBtn: "Open peer library",
    exportPortfolioBtn: "Export portfolio summary",
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
    roleTeacher: "Out-of-Field Teacher",
    roleMentor: "Subject Mentor",
    roleCoordinator: "School Coordinator",
    step1Title: "Sabihin sa amin ang iyong ituturo",
    step1Kicker: "Hakbang 1 · Pagtanggap ng Aralin",
    step2Title: "Handa nang gabay sa pagtuturo",
    step2Kicker: "Hakbang 2 · Agarang Paghahanda",
    rehearsalTitle: "Magsanay. Kumuha ng isang kapaki-pakinabang na hakbang.",
    rehearsalSubtitle: "Subukan ang iyong paliwanag sa makatotohanang usapan sa mag-aaral. Pagsasanay ito, hindi marka sa pagsusulit.",
    rehearsalKicker: "Pribadong Lugar ng Pagsasanay",
    portfolioTitle: "Ang iyong pag-unlad, tinipon sa isang lugar.",
    portfolioSubtitle: "Hiwalay na itala ang online rehearsal at aktwal na patunay sa klase para sa pagsusuri ng DepEd at CPD partner.",
    portfolioKicker: "Taunang Pagsusuri ng Kasanayan",
    cohortTitle: "Pagsubaybay sa apat-na-linggong pilot cohort",
    cohortSubtitle: "Anonymized na datos sa antas ng paaralan, dalawang-araw na target ng mentor, at mga batayan sa pagpapatuloy.",
    cohortKicker: "Cohort ng Paaralan at Dibisyon",
    buildSupportBtn: "Buuin ang gabay sa aralin",
    submitMentorBtn: "Ipasa para sa pagsusuri ng mentor",
    openPeerLibraryBtn: "Buksan ang peer library",
    exportPortfolioBtn: "I-export ang buod ng portfolio",
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
    roleTeacher: "Out-of-Field Teacher",
    roleMentor: "Subject Mentor",
    roleCoordinator: "School Coordinator",
    step1Title: "Isulti kanamo ang imong itudlo",
    step1Kicker: "Lakang 1 · Pagsulod sa Leksyon",
    step2Title: "Andam nga tabang sa pagtudlo",
    step2Kicker: "Lakang 2 · Diha-diha nga Pagpangandam",
    rehearsalTitle: "Pagbansay. Pagkuha og usa ka praktikal nga sunod nga lakang.",
    rehearsalSubtitle: "Sulayi ang imong pagpasabot sa tinuod nga pangutana sa estudyante. Pagbansay kini, dili grado sa eksam.",
    rehearsalKicker: "Pribadong Lugar sa Pagbansay",
    portfolioTitle: "Ang imong paglambo, gitigom sa usa ka dapit.",
    portfolioSubtitle: "Lain ang pagrekord sa online rehearsal ug aktwal nga ebidensya sa klase alang sa DepEd ug CPD partner.",
    portfolioKicker: "Tinuig nga Pagsusi sa Kahanas",
    cohortTitle: "Pagmonitor sa upat-ka-simana nga pilot cohort",
    cohortSubtitle: "Anonymized nga datus sa eskwelahan, duha-ka-adlaw nga target sa mentor, ug sukdanan sa pagpadayon.",
    cohortKicker: "Cohort sa Eskwelahan ug Dibisyon",
    buildSupportBtn: "Himoa ang akong gabay sa leksyon",
    submitMentorBtn: "Ipasa alang sa pagsusi sa mentor",
    openPeerLibraryBtn: "Ablihi ang peer library",
    exportPortfolioBtn: "I-export ang summary sa portfolio",
  },
};

export const DEPED_TOPIC_PRESETS: Record<
  SubjectName,
  Array<{ gradeLevel: string; topic: string }>
> = {
  Science: [
    { gradeLevel: "Grade 7", topic: "Solutions: Why a strainer cannot recover dissolved sugar" },
    { gradeLevel: "Grade 7", topic: "Separating mixtures: Evaporation and filtration with everyday tools" },
    { gradeLevel: "Grade 8", topic: "Newton's Laws of Motion: Explaining inertia using daily commutes" },
  ],
  Mathematics: [
    { gradeLevel: "Grade 7", topic: "Adding unlike fractions: Why 1/2 + 1/3 is not 2/5" },
    { gradeLevel: "Grade 8", topic: "Linear equations and slope using local jeepney fare steps" },
  ],
  English: [
    { gradeLevel: "Grade 8", topic: "Distinguishing textual evidence from inference in character motives" },
    { gradeLevel: "Grade 9", topic: "Evaluating two defensible interpretations using line-level citations" },
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
    bridgeTitle: string;
    bridgeExplanation: string;
    trySaying: string;
    limitationNote: string;
    misconceptions: Array<{
      question: string;
      whatStudentImagines: string;
      practicalResponse: string;
    }>;
    activityTitle: string;
    materials: string[];
    steps: string[];
    keyTakeaway: string;
    studentQuestion: string;
    freshCasePrompt: string;
    mentorGap: string;
    mentorMove: string;
  }
> = {
  en: {
    bridgeTitle: "Think of it like a dance formation",
    bridgeExplanation:
      "As a MAPEH major, picture sugar particles as dancers who have spread between water molecules. A strainer's holes are like a wide gymnasium doorway: both the water and the tiny dissolved sugar dancers pass straight through together.",
    trySaying:
      "\"Imagine our sugar particles are dancers who have spread throughout the whole formation of water dancers—they didn't vanish, they just became small enough to fit through the strainer's spaces together.\"",
    limitationNote:
      "Remind learners that real sugar particles are far smaller than visible dancers and do not decide where to move; thermal motion mixes them evenly.",
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
    bridgeTitle: "Isipin ito bilang isang dance formation",
    bridgeExplanation:
      "Bilang MAPEH major, isipin ang mga partikulo ng asukal bilang mga mananayaw na kumalat sa pagitan ng mga molekula ng tubig. Ang mga butas ng salaan ay parang maluwag na pintuan ng gym: sabay na nakakalusot ang tubig at ang maliliit na natunaw na partikulo.",
    trySaying:
      "\"Isipin ninyong mga mananayaw ang maliliit na partikulo ng asukal na sumingit sa buong formation ng tubig—hindi sila nawala, lumiit lang sila nang sapat para makalusot nang sabay sa salaan.\"",
    limitationNote:
      "Paalalahanan ang klase na hindi kusang gumagalaw ang mga molekula tulad ng tao; pantay silang nahahalo dahil sa natural na galaw ng init.",
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
    bridgeTitle: "Hunahunaa kini sama sa usa ka dance formation",
    bridgeExplanation:
      "Isip MAPEH major, hunahunaa ang mga partikulo sa asukar isip mga mananayaw nga nikuyanap taliwala sa mga molekula sa tubig. Ang mga buslot sa salaan sama sa lapad nga pultahan sa gym: dungan nga makalusot ang tubig ug ang gagmay kaayong natunaw nga asukar.",
    trySaying:
      "\"Hunahunaa nga ang mga partikulo sa asukar mga mananayaw nga nakig-ipon sa tibuok formation sa tubig—wala sila mawala, nigamay lang sila og igo aron makalusot dungan sa tubig sa salaan.\"",
    limitationNote:
      "Pahinumdomi ang klase nga dili pareho sa tawo ang mga molekula nga magbuot og lihok; parehas silang masagol tungod sa natural nga lihok sa kainit.",
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
    classDate: "2026-11-30",
    submittedAt: "2026-11-25",
    language: "en",
    startingMaterial:
      "DepEd Grade 7 Science Quarter 1 module on saturated and unsaturated solutions, plus sugar, water, and a small kitchen strainer.",
    baselineFirst: true,
    baselineExplanation:
      "When sugar dissolves in water it breaks into tiny pieces so small that they pass right through the holes of a strainer along with the water.",
    submissionFormat: "live-ai",
    support: {
      specialtyBridge: {
        title: TRILINGUAL_SUGAR_CASE.en.bridgeTitle,
        explanation: TRILINGUAL_SUGAR_CASE.en.bridgeExplanation,
        trySaying: TRILINGUAL_SUGAR_CASE.en.trySaying,
        limitationNote: TRILINGUAL_SUGAR_CASE.en.limitationNote,
      },
      misconceptionAlerts: TRILINGUAL_SUGAR_CASE.en.misconceptions,
      improvisedActivity: {
        title: TRILINGUAL_SUGAR_CASE.en.activityTitle,
        materials: TRILINGUAL_SUGAR_CASE.en.materials,
        steps: TRILINGUAL_SUGAR_CASE.en.steps,
        keyTakeaway: TRILINGUAL_SUGAR_CASE.en.keyTakeaway,
      },
      simulatedStudentPrompt: {
        studentName: "Jessa",
        openingQuestion: TRILINGUAL_SUGAR_CASE.en.studentQuestion,
        freshCasePrompt: TRILINGUAL_SUGAR_CASE.en.freshCasePrompt,
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
    },
    teacherRevision: "",
    freshCaseResponse: "",
    freshCaseStatus: "ready",
    cachedOffline: true,
  },
  {
    id: "case-math-fractions-02",
    subject: "Mathematics",
    gradeLevel: "Grade 7",
    topic: "Adding unlike fractions: Why 1/2 + 1/3 is not 2/5",
    teacherName: "Carlos Mendoza",
    teacherMajor: "English",
    classDate: "2026-12-01",
    submittedAt: "2026-11-25",
    language: "en",
    startingMaterial: "Learner wrote 1/2 + 1/3 = 2/5 on seatwork.",
    baselineFirst: true,
    baselineExplanation:
      "You cannot add the bottom numbers directly because the slices are different sizes. We need a common denominator of 6 first.",
    submissionFormat: "live-ai",
    support: {
      specialtyBridge: {
        title: "Think of it like comparing different stanza beats",
        explanation:
          "Just as you wouldn't add two different poetic meter counts without matching the beat unit, adding halves and thirds requires converting both into equal-sized sixths before counting total pieces.",
        trySaying:
          "\"Before we count total slices, let's cut both bibingka pans into equal-sized sixths so every slice represents the same unit.\"",
        limitationNote:
          "Keep the focus on equal-sized wholes; if two fractions come from different-sized wholes, even common denominators cannot be added directly.",
      },
      misconceptionAlerts: [
        {
          question: "\"Sir, we added top plus top and bottom plus bottom—why is 2/5 wrong?\"",
          whatStudentImagines: "The student treats numerators and denominators as two independent whole numbers.",
          practicalResponse:
            "Draw two equal paper strips side by side: 1/2 is already larger than 2/5, proving 1/2 + 1/3 cannot shrink below 1/2.",
        },
        {
          question: "\"Does multiplying denominators always give the only right answer?\"",
          whatStudentImagines: "Students memorize cross-multiplication mechanically without understanding equivalent units.",
          practicalResponse:
            "Credit any valid common unit (e.g., 6ths or 12ths) as long as the student shows equal-sized partitions.",
        },
      ],
      improvisedActivity: {
        title: "Folded paper strips for equal-sized wholes",
        materials: [
          "3 identical strips of bond paper or newsprint",
          "1 pencil or marker",
          "Scissors (optional)",
        ],
        steps: [
          "Fold Strip 1 into 2 equal parts and shade 1/2.",
          "Fold Strip 2 into 3 equal parts and shade 1/3.",
          "Fold both into 6 equal parts to show 3/6 + 2/6 = 5/6 visibly exceeds 1/2.",
        ],
        keyTakeaway:
          "Adding fractions means counting equal-sized parts of the same whole, never adding denominators.",
      },
      simulatedStudentPrompt: {
        studentName: "Marco",
        openingQuestion:
          "Sir, when I combine 1 correct out of 2 items and 1 correct out of 3 items in a quiz, that's 2 out of 5. Why isn't 1/2 + 1/3 equal to 2/5?",
        freshCasePrompt:
          "A student says 1/4 + 1/4 = 2/8 because you add both tops and bottoms. How will you elicit their rule and guide them using equal-sized wholes?",
      },
    },
    rehearsalMessages: [
      {
        id: "m-2",
        sender: "student",
        text: "Sir, when I combine 1 correct out of 2 items and 1 correct out of 3 items in a quiz, that's 2 out of 5. Why isn't 1/2 + 1/3 equal to 2/5?",
        timestamp: "07:45 PM",
      },
      {
        id: "m-3",
        sender: "teacher",
        text: "In a quiz score you are combining two different totals into a ratio, whereas in fraction addition both fractions represent parts of one same whole.",
        timestamp: "07:49 PM",
      },
    ],
    mentorReview: {
      mentorName: "Lourdes Tan",
      mentorAffiliation: "Iligan Math Lead Mentor",
      backupMentorName: "Ramon Villamor",
      languagesCovered: ["en", "ceb"],
      reviewedAt: "Awaiting review",
      focusedGap: "",
      teachingMove: "",
      quickRefresher: "",
      masteredSkill: "",
      practiceSkill: "",
      status: "pending",
    },
    teacherRevision: "",
    freshCaseResponse: "",
    freshCaseStatus: "locked",
    cachedOffline: true,
  },
  {
    id: "case-english-evidence-03",
    subject: "English",
    gradeLevel: "Grade 8",
    topic: "Distinguishing textual evidence from inference in character motives",
    teacherName: "Maria Reyes",
    teacherMajor: "MAPEH",
    classDate: "2026-12-03",
    submittedAt: "2026-11-25",
    language: "en",
    startingMaterial:
      "Paragraph: 'Elena folded her prepared speech neatly, tucked it inside her notebook, and remained seated even after her name was called twice.'",
    baselineFirst: true,
    baselineExplanation:
      "The answer key says Elena felt nervous, so I tell students that staying seated means she was too shy to speak.",
    submissionFormat: "offline-fallback",
    support: {
      specialtyBridge: {
        title: "Think of it like judging a stage performance",
        explanation:
          "In MAPEH, judges separate what they directly observe (posture, folded hands, timing) from what they interpret (stage fright vs. deliberate artistic pause). Textual evidence is the observable movement; inference is the conclusion.",
        trySaying:
          "\"Before deciding whether the character is nervous or defiant, point to the exact line in the text that a camera could record.\"",
        limitationNote:
          "Remember that more than one interpretation can be valid in English if the learner anchors it in direct lines from the text.",
      },
      misconceptionAlerts: [
        {
          question: "\"Ma'am, the answer key says 'nervous,' so is 'defiant' automatically wrong?\"",
          whatStudentImagines: "Literature has only one single-word answer independent of how lines are justified.",
          practicalResponse:
            "Ask both learners which exact words support their claim, distinguishing observable facts from plausible inference.",
        },
        {
          question: "\"Do I have to quote the whole paragraph to prove my answer?\"",
          whatStudentImagines: "Learners think longer quotes count as better evidence.",
          practicalResponse:
            "Show how pointing to one specific action ('folded her speech neatly' vs. 'remained seated after called twice') sharpens reasoning.",
        },
      ],
      improvisedActivity: {
        title: "Two-column Evidence vs. Inference board check",
        materials: [
          "Chalkboard or manila paper divided into two columns",
          "3-sentence printed or handwritten story excerpt",
        ],
        steps: [
          "Have students list only physical actions seen in the text under Column A (Observation).",
          "In Column B (Inference), invite two different feelings supported by Column A.",
          "Ask pairs to strengthen one interpretation using a line they overlooked.",
        ],
        keyTakeaway:
          "Sound literary interpretation distinguishes direct textual evidence from inference and credits multiple defensible readings.",
      },
      simulatedStudentPrompt: {
        studentName: "Alyssa",
        openingQuestion:
          "Ma'am, my classmate says she was nervous because she folded her speech, but I think she was protesting silently because she stayed seated. Who is right?",
        freshCasePrompt:
          "Another student writes: 'The character was furious because he walked out.' The text only states 'He set his mug down slowly and closed the door behind him.' How do you respond?",
      },
    },
    rehearsalMessages: [
      {
        id: "m-4",
        sender: "student",
        text: "Ma'am, my classmate says she was nervous because she folded her speech, but I think she was protesting silently because she stayed seated. Who is right?",
        timestamp: "09:05 PM",
      },
    ],
    mentorReview: {
      mentorName: "Grace Bautista",
      mentorAffiliation: "MSU-IIT English Education",
      backupMentorName: "Ramon Villamor",
      languagesCovered: ["en", "fil"],
      reviewedAt: "Awaiting review",
      focusedGap: "",
      teachingMove: "",
      quickRefresher: "",
      masteredSkill: "",
      practiceSkill: "",
      status: "pending",
    },
    teacherRevision: "",
    freshCaseResponse: "",
    freshCaseStatus: "locked",
    cachedOffline: true,
  },
];

export const INITIAL_PEER_LIBRARY: PeerLibraryItem[] = [
  {
    id: "lib-1",
    subjectTag: "Science 7",
    subject: "Science",
    title: "Separating mixtures with kitchen materials",
    summary: "Comparing sand suspension vs. dissolved sugar using a household strainer and sun-dried saucer.",
    verifiedExplanation:
      "Focus on particle scale rather than disappearance: dissolved sugar breaks down to molecules smaller than cloth fibers, so filtration catches sand while evaporation leaves sugar or salt crystals behind.",
    improvisedSetup: "2 clear jars, 1 tbsp sugar, 1 tbsp sand, kitchen tea strainer, 1 small saucer left in sunlight.",
    saveCount: 12,
    language: "en",
  },
  {
    id: "lib-2",
    subjectTag: "Mathematics 8",
    subject: "Mathematics",
    title: "Teaching slope using Iligan jeepney routes",
    summary: "Connecting rise-over-run to step changes in PUJ distance fare increments across barangay stops.",
    verifiedExplanation:
      "Define horizontal distance (kilometers past minimum 4 km) as the run and each uniform fare increment as the rise, helping students separate fixed base fare (y-intercept) from rate of change (slope).",
    improvisedSetup: "Hand-drawn coordinate strip on manila paper showing Tibanga to Pala-o stops.",
    saveCount: 9,
    language: "en",
  },
  {
    id: "lib-3",
    subjectTag: "English 9",
    subject: "English",
    title: "Character motive: evidence before inference",
    summary: "Helping learners cite exact textual lines before debating competing character emotions.",
    verifiedExplanation:
      "Accept multiple defensible interpretations when each learner anchors their claim in observable phrasing, then distinguish direct textual fact from reasonable inference.",
    improvisedSetup: "Two-column blackboard chart: Column A (What the text says) · Column B (What we infer).",
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

export const PILOT_BUDGET_ITEMS = [
  { expense: "Subject mentor", basis: "6 h × ₱400", estimatedValue: "₱2,400", donatedCash: "₱0" },
  { expense: "Coordination", basis: "4 h × ₱250", estimatedValue: "₱1,000", donatedCash: "₱0" },
  { expense: "Data, AI and incidentals", basis: "Pilot allowance", estimatedValue: "₱300", donatedCash: "₱300" },
];
