import assert from "node:assert/strict";
import test from "node:test";
import {
  CONCEPT_PACK_SCHEMA,
  GAS_LAWS_GRADE10_FACT_SHEET,
  countSentences,
  parseOptionalFactSheet,
  shortFieldName,
  validateConceptPack,
  validateModelSources,
} from "./conceptPackValidator.ts";
import {
  ConceptPackUnavailableError,
  PACK_UNAVAILABLE_ERROR_MESSAGE,
  generatePackWithSingleRetry,
  generateValidatedConceptPack,
} from "./conceptPackEngine.ts";
import type { ValidatedConceptPack } from "../types/bansay.ts";
import {
  CONCEPT_PACK_UNAVAILABLE_MESSAGE,
  requestConceptPack,
} from "../lib/conceptPackRequest.ts";

const scienceGasLawsPack: ValidatedConceptPack = {
  understand: {
    big_idea_lines: [
      "Heating air inside a rigid sealed bottle raises gas pressure because the trapped air particles hit the walls harder.",
      "With constant volume and a fixed amount of gas, particle speed increases as temperature rises in kelvin.",
      "Because gas pressure depends on collision rate and force, converting Celsius to kelvin keeps the ratio proportional.",
    ],
    diagram: {
      template: "two-panel-comparison",
      title: "Cool vs. warm gas particles at constant volume",
      caption: "Warmer air moves faster and hits the bottle walls more forcefully than cooler air.",
      items: [
        { label: "At 27 °C (300 K)", detail: "Particles move slower and strike the rigid walls with 1.00 atm pressure." },
        { label: "At 57 °C (330 K)", detail: "Particles have higher kinetic energy and push outward at 1.10 atm." },
      ],
    },
    key_terms: [
      { term: "Kinetic molecular theory", definition: "Explains pressure as gas particles colliding with container walls." },
      { term: "Kelvin", definition: "Absolute temperature scale where 0 K represents zero thermal motion." },
      { term: "Gay-Lussac relationship", definition: "At constant volume, gas pressure increases directly with kelvin temperature." },
    ],
  },
  model: {
    steps: [
      "Identify that the rigid container keeps volume and amount of gas constant.",
      "Heating raises the gas particles' average kinetic energy so they move faster.",
      "Faster particles create more frequent, harder collisions with the inner walls, raising pressure.",
      "Relate initial and final states with kelvin temperature using Gay-Lussac's law.",
    ],
    when_it_applies: "Rigid, intact sealed containers holding a fixed amount of gas whose temperature changes in kelvin.",
    when_it_does_not_apply: "Flexible balloons or open bottles where volume expands or gas escapes.",
    formula: {
      law: "Gay-Lussac's law",
      equation: "P1 / T1 = P2 / T2",
      variables: [
        { symbol: "P1", definition: "initial pressure", unit: "atm" },
        { symbol: "T1", definition: "initial temperature", unit: "K" },
        { symbol: "P2", definition: "final pressure", unit: "atm" },
        { symbol: "T2", definition: "final temperature", unit: "K" },
      ],
    },
  },
  connect: {
    short_field_label: "Computer Science",
    mappings: [
      {
        field_feature: "Fixed thread pool in a bounded buffer",
        lesson_concept: "Constant amount of gas inside a fixed volume",
        explanation: "No new workers enter a closed pool just as heating adds no extra air molecules to a sealed container.",
      },
      {
        field_feature: "Increasing request clock speed per core",
        lesson_concept: "Higher kinetic energy and wall collisions",
        explanation: "Faster processing loops hit a fixed interface queue more often, raising pressure on the boundary.",
      },
    ],
    where_comparison_stops:
      "CPU threads follow deterministic scheduler instructions and lack physical momentum, whereas gas pressure arises from random thermal molecular collisions.",
  },
  worked_example: {
    kind: "quantitative",
    problem: "A rigid bottle starts at 1.00 atm and warms from 27 °C (300 K) to 57 °C (330 K). Find the final pressure.",
    steps: [
      "Convert temperatures to kelvin: 27 °C = 300 K and 57 °C = 330 K.",
      "Substitute into Gay-Lussac's ratio: P2 = (1.00 * 330) / 300.",
      "Compute (1.00 * 330) / 300 = 1.10 atm.",
    ],
    answer: "1.10 atm",
    verification: {
      expression: "(1.00 * 330) / 300",
      result: 1.1,
      unit: "atm",
    },
    common_error: {
      error_name: "Substituting Celsius directly",
      wrong_work: "P2 = (1.00 * 57) / 27",
      wrong_result: "2.11 atm",
      why_wrong: "Celsius is not an absolute scale; gas pressure is proportional to kelvin rather than Celsius.",
    },
  },
  misconceptions: {
    prediction_prompt: "Before viewing the cards, what do you think students usually claim happens inside a heated bottle?",
    items: [
      {
        name: "Molecules themselves swell",
        what_students_say: "The air molecules grow bigger when warmed.",
        what_is_really_happening: "Individual molecules stay the same size; their kinetic energy and collision speed increase.",
        teaching_move: "Have students clap faster without widening their hands to model higher speed.",
      },
      {
        name: "Extra air appears from heat",
        what_students_say: "Heating adds new air inside the sealed bottle.",
        what_is_really_happening: "The amount of gas is fixed; only the motion of existing particles changes.",
        teaching_move: "Draw six dots inside two equal boxes and lengthen the motion arrows in the warmer box.",
      },
      {
        name: "Celsius works in ratios",
        what_students_say: "Doubling Celsius from 20 °C to 40 °C doubles pressure.",
        what_is_really_happening: "Pressure ratios only scale with absolute temperature measured in kelvin.",
        teaching_move: "Check what happens at 0 °C if Celsius were placed in the denominator.",
      },
    ],
  },
  self_check: {
    questions: [
      {
        question: "Why does pressure rise when trapped air is warmed inside a rigid tank?",
        options: [
          {
            text: "Air particles gain kinetic energy and collide harder and more often with the walls.",
            correct: true,
            explanation: "Higher thermal motion increases both collision frequency and impact force on fixed walls.",
          },
          {
            text: "Each air molecule expands until the gas fills double the volume.",
            correct: false,
            explanation: "Individual molecules do not swell, and a rigid tank keeps volume constant.",
          },
          {
            text: "Warming creates extra air particles from the metal walls.",
            correct: false,
            explanation: "Heating does not add matter to a sealed container.",
          },
        ],
      },
      {
        question: "A rigid canister at 300 K and 1.00 atm is warmed to 330 K. What happens to pressure?",
        options: [
          {
            text: "It stays 1.00 atm because volume did not change.",
            correct: false,
            explanation: "Pressure increases with kelvin temperature even when volume is fixed.",
          },
          {
            text: "It rises proportionally to 1.10 atm.",
            correct: true,
            explanation: "Multiplying 1.00 atm by 330 K / 300 K yields 1.10 atm.",
          },
          {
            text: "It drops to 0.91 atm as molecules spread out.",
            correct: false,
            explanation: "Heating speeds particles up rather than lowering collision force.",
          },
        ],
      },
      {
        question: "Which temperature unit keeps P1/T1 = P2/T2 mathematically valid?",
        options: [
          {
            text: "Kelvin",
            correct: true,
            explanation: "Kelvin starts at absolute zero, making pressure directly proportional to temperature.",
          },
          {
            text: "Degrees Celsius",
            correct: false,
            explanation: "Celsius zero is the freezing point of water, so ratios distort pressure changes.",
          },
          {
            text: "Degrees Fahrenheit",
            correct: false,
            explanation: "Fahrenheit has an offset zero point just like Celsius.",
          },
        ],
      },
    ],
  },
  teach_it: {
    say_in_class_lines: [
      "Inside a closed rigid bottle, warming the trapped air makes the same air particles move faster.",
      "Those faster particles bump against the inner walls more often and harder, which raises pressure.",
      "Because gas pressure tracks absolute thermal motion, we convert Celsius to kelvin before calculating.",
    ],
    activity: {
      title: "Balloon on a bottle in warm and cool water",
      time_needed: "15 minutes",
      prepare_before_class: "Fill one basin with cool tap water and one with warm (not hot) water.",
      materials: GAS_LAWS_GRADE10_FACT_SHEET.approvedDemoMaterials.map((name) => ({
        name,
        amount: GAS_LAWS_GRADE10_FACT_SHEET.demo!.materialAmounts[name],
      })),
      predict_prompt: "Ask students what will happen to the deflated balloon when the bottle sits in warm water.",
      steps: GAS_LAWS_GRADE10_FACT_SHEET.demo!.procedure.map((instruction, i) => ({
        number: i + 1,
        instruction,
      })),
      observe_prompt: "Students observe the balloon inflate slightly in warm water and shrink in cool water.",
      explain_prompt: "Connect faster particle motion to balloon expansion, and note why a rigid bottle pushes walls instead.",
      scale_note: "This qualitative setup uses warm tap water rather than the high 1.00 atm numerical problem scale.",
      safety_note: "Use warm, not hot, water. Keep the bottle uncapped. Never heat a capped or sealed bottle, and never use a flame.",
    },
  },
};

const mathSlopePack: ValidatedConceptPack = {
  understand: {
    big_idea_lines: [
      "A linear relationship grows by the same constant amount for every single-unit step forward.",
      "Slope tells us that steady step size, while the y-intercept gives the starting value before moving.",
      "In a local jeepney ride, the flag-down fare is the starting value and the per-kilometer charge is the slope.",
    ],
    diagram: {
      template: "number-line",
      title: "Jeepney fare growth per extra kilometer",
      caption: "Starting from the 13.00 peso base fare, each extra kilometer adds a constant 1.50 pesos.",
      items: [
        { label: "0 extra km", detail: "13.00 pesos base fare" },
        { label: "2 extra km", detail: "16.00 pesos (+3.00)" },
        { label: "4 extra km", detail: "19.00 pesos (+6.00)" },
      ],
    },
    key_terms: [
      { term: "Slope (m)", definition: "Constant change in y per 1-unit increase in x." },
      { term: "y-intercept (b)", definition: "Starting value of y when x equals zero." },
    ],
  },
  model: {
    steps: [
      "Separate the one-time starting value b from the repeated per-unit rate m.",
      "Write the linear equation in slope-intercept form y = mx + b.",
      "Multiply the rate m by the input x, then add the starting value b.",
    ],
    when_it_applies: "Situations where the rate of change stays constant for every equal step in input.",
    when_it_does_not_apply: "Situations with accelerating growth, discounts per tier, or curved paths.",
    formula: {
      law: "Slope-intercept form",
      equation: "y = mx + b",
      variables: [
        { symbol: "m", definition: "constant rate of change", unit: "pesos/km" },
        { symbol: "x", definition: "extra distance beyond base", unit: "km" },
        { symbol: "b", definition: "initial flag-down fare", unit: "pesos" },
      ],
    },
  },
  connect: {
    short_field_label: "Economics",
    mappings: [
      {
        field_feature: "Fixed overhead cost plus constant marginal cost",
        lesson_concept: "y-intercept b plus slope m",
        explanation: "In a total cost curve C = MC·q + FC, fixed cost is paid at zero units just like b, while marginal cost adds the same amount per unit like slope m.",
      },
      {
        field_feature: "Slope of a linear budget or cost line",
        lesson_concept: "Rise over run",
        explanation: "Every one-unit horizontal increase in quantity shifts total cost vertically by the constant unit price.",
      },
    ],
    where_comparison_stops:
      "Economic marginal cost eventually rises due to capacity limits, whereas an algebraic linear model assumes constant slope across all real numbers.",
  },
  worked_example: {
    kind: "quantitative",
    problem: "A jeepney charges a 13.00 peso base fare plus 1.50 pesos per extra kilometer. Find the total fare for 4 extra kilometers.",
    steps: [
      "Identify b = 13.00 pesos and m = 1.50 pesos/km.",
      "Substitute x = 4 into y = 1.50 * 4 + 13.00.",
      "Compute (1.50 * 4) + 13.00 = 19.00 pesos.",
    ],
    answer: "19.00 pesos",
    verification: {
      expression: "(1.50 * 4) + 13.00",
      result: 19,
      unit: "pesos",
    },
    common_error: {
      error_name: "Swapping slope and y-intercept",
      wrong_work: "y = (13.00 * 4) + 1.50",
      wrong_result: "53.50 pesos",
      why_wrong: "The 13.00 peso base fare is paid once, not multiplied by every extra kilometer.",
    },
  },
  misconceptions: {
    prediction_prompt: "Before revealing, guess what students often mistake the 13.00 peso base fare for when writing an equation.",
    items: [
      {
        name: "Swapping m and b",
        what_students_say: "The bigger number 13 goes next to x.",
        what_is_really_happening: "Students pick numbers by size rather than checking which amount repeats per kilometer.",
        teaching_move: "Ask which peso amount gets paid once versus every kilometer.",
      },
      {
        name: "Lines pass through origin",
        what_students_say: "At 0 extra km the total should be 0 pesos.",
        what_is_really_happening: "Only proportional lines with b = 0 start at (0, 0).",
        teaching_move: "Ask what a passenger pays right when boarding at 0 extra km.",
      },
      {
        name: "Higher start means steeper line",
        what_students_say: "Raising the flag-down fare makes the line steeper.",
        what_is_really_happening: "Changing b shifts the line up or down without tilting its slope.",
        teaching_move: "Plot a 15-peso base fare with the same 1.50-peso step beside it.",
      },
    ],
  },
  self_check: {
    questions: [
      {
        question: "In y = 2.00x + 15.00 for a fare, what does 2.00 represent?",
        options: [
          {
            text: "Additional fare added for each extra kilometer",
            correct: true,
            explanation: "The coefficient multiplying x is the constant rate added per kilometer.",
          },
          {
            text: "Initial flag-down fare before moving",
            correct: false,
            explanation: "The starting value when x = 0 is the constant 15.00.",
          },
          {
            text: "Total distance traveled in kilometers",
            correct: false,
            explanation: "Distance is represented by x, not the rate coefficient.",
          },
        ],
      },
      {
        question: "Two rides add 1.50 pesos per km, one starting at 13 pesos and one at 15 pesos. How do their graphs compare?",
        options: [
          {
            text: "They are parallel lines with the same steepness.",
            correct: true,
            explanation: "Equal slopes produce identical tilt while different y-intercepts shift the vertical height.",
          },
          {
            text: "The 15-peso line is steeper.",
            correct: false,
            explanation: "Steepness is controlled by slope, not the starting y-intercept.",
          },
          {
            text: "They cross at (1.5, 0).",
            correct: false,
            explanation: "Parallel lines with different y-intercepts never intersect.",
          },
        ],
      },
      {
        question: "What is the cost of 3 extra km if y = 1.50x + 13.00?",
        options: [
          {
            text: "17.50 pesos",
            correct: true,
            explanation: "Three steps of 1.50 pesos add 4.50 pesos to the 13.00 base fare.",
          },
          {
            text: "40.50 pesos",
            correct: false,
            explanation: "This wrongly multiplies the 13-peso base fare by 3.",
          },
          {
            text: "14.50 pesos",
            correct: false,
            explanation: "This only adds one kilometer instead of three.",
          },
        ],
      },
    ],
  },
  teach_it: {
    say_in_class_lines: [
      "Every linear equation has two distinct roles: where you start and how much you add each step.",
      "The fixed amount paid once sits alone, while the steady change per step multiplies x.",
      "Let's build a table from 0 to 4 kilometers to see that equal step on a grid.",
    ],
    activity: {
      title: "Jeepney fare step-table and chalk grid",
      time_needed: "15 minutes",
      prepare_before_class: "Draw a 0–4 km grid axis on one sheet of Manila paper or on the chalkboard.",
      materials: [
        { name: "Manila paper with grid", amount: "1 sheet" },
        { name: "Blackboard marker", amount: "1 marker" },
      ],
      predict_prompt: "Ask students whether 4 extra kilometers doubles the 2-kilometer total fare.",
      steps: [
        { number: 1, instruction: "Fill out total fare for 0, 1, 2, 3, and 4 extra km using +1.50 each row." },
        { number: 2, instruction: "Plot all five ordered pairs on the Manila paper grid and draw the straight line." },
      ],
      observe_prompt: "Students notice each 1-km step rises evenly by 1.50 pesos and starts above zero.",
      explain_prompt: "Have pairs point out why 4 km is 19.00 pesos rather than double the 2-km total.",
      scale_note: "Uses the exact 13.00 peso base and 1.50 peso/km figures from the worked example.",
      safety_note: "Standard classroom activity; keep aisles clear when students come to the board.",
    },
  },
};

const englishRhetoricPack: ValidatedConceptPack = {
  understand: {
    big_idea_lines: [
      "Persuasive speakers rely on three kinds of appeals: credibility (ethos), audience feeling (pathos), and reasons or evidence (logos).",
      "Strong civic speeches blend these appeals within a passage rather than isolating them into separate paragraphs.",
      "Naming each appeal lets readers separate trustworthy expertise and genuine stakes from empty claims.",
    ],
    diagram: {
      template: "labeled-parts",
      title: "Three rhetorical appeals in a speech",
      caption: "Each line in a speech can draw on speaker trust, shared values, or supporting evidence.",
      items: [
        { label: "Ethos (Credibility)", detail: "Signals why the listener can trust the speaker's experience or fairness." },
        { label: "Pathos (Emotion)", detail: "Connects the issue to human care, urgency, pride, or concern." },
        { label: "Logos (Logic)", detail: "Gives concrete facts, records, or cause-and-effect reasoning." },
      ],
    },
    key_terms: [
      { term: "Ethos", definition: "Appeal rooted in the speaker's character, role, or trustworthiness." },
      { term: "Pathos", definition: "Appeal that engages the audience's emotions or shared values." },
      { term: "Logos", definition: "Appeal built on evidence, numbers, or logical structure." },
    ],
  },
  model: {
    steps: [
      "Read the target line and identify the speaker's main claim.",
      "Highlight phrases pointing to speaker authority (ethos), human stakes (pathos), or evidence (logos).",
      "Check whether any emotional or authority cue is backed by sound reasoning rather than replacing proof.",
    ],
    when_it_applies: "Evaluating speeches, editorial articles, community notices, and persuasive student essays.",
    when_it_does_not_apply: "Purely technical reference tables or laboratory manuals without persuasive intent.",
    formula: {
      law: "Not applicable",
      equation: "Not applicable",
      variables: [],
    },
  },
  connect: {
    short_field_label: "Nursing",
    mappings: [
      {
        field_feature: "Patient health education before discharge",
        lesson_concept: "Ethos, pathos, and logos working together",
        explanation: "A nurse establishes trust through clinical competence (ethos), acknowledges family worry calmly (pathos), and explains blood-pressure logs clearly (logos).",
      },
      {
        field_feature: "Checking vital signs against reported discomfort",
        lesson_concept: "Testing whether pathos is backed by logos",
        explanation: "Just as clinical care pairs empathy with measured data, readers check whether a speech pairs emotional urgency with verifiable facts.",
      },
    ],
    where_comparison_stops:
      "Clinical assessment produces an objective physical diagnosis, whereas rhetorical analysis interprets how language persuades varied audiences.",
  },
  worked_example: {
    kind: "conceptual",
    problem:
      "Analyze the line: 'As our barangay health worker for ten years, I ask you to drain stagnant jars before Friday, because clinic cases doubled this month.'",
    steps: [
      "Spot ethos: 'As our barangay health worker for ten years' signals direct community expertise.",
      "Spot logos: 'because clinic cases doubled this month' supplies an empirical reason for acting now.",
      "Spot pathos: 'I ask you... before Friday' appeals to shared urgency to protect neighbors.",
    ],
    answer: "The sentence pairs ethos (ten years of service) and pathos (urgent call to protect neighbors) with logos (doubled clinic cases).",
    verification: {
      expression: "",
      result: 0,
      unit: "",
    },
    common_error: {
      error_name: "Treating any number or strong exclamation as logos",
      wrong_work: "Labeling 'Everyone knows we need action 100% right now!' as logos because it includes 100%.",
      wrong_result: "Misclassifying emphatic hyperbole as logical proof",
      why_wrong: "Logos requires verifiable evidence or reasoning that supports a claim, not emphatic percentages.",
    },
  },
  misconceptions: {
    prediction_prompt: "Before checking the list, what shortcuts do Grade 10 students often use when labeling appeals?",
    items: [
      {
        name: "One appeal per sentence",
        what_students_say: "A line can only be ethos, pathos, or logos—never two at once.",
        what_is_really_happening: "Effective sentences frequently layer speaker credibility with evidence.",
        teaching_move: "Have pairs underline distinct phrases inside the same quote using two labels.",
      },
      {
        name: "Pathos is always bad",
        what_students_say: "Emotional appeals mean the speaker is lying or manipulating.",
        what_is_really_happening: "Civic speeches legitimately connect evidence to human stakes unless emotion replaces proof.",
        teaching_move: "Compare grounded urgency with empty fear-mongering side by side.",
      },
      {
        name: "Any title proves the claim",
        what_students_say: "Because the speaker has ethos, their conclusion is logically proven.",
        what_is_really_happening: "Credibility earns attention, while logos tests whether the evidence supports the claim.",
        teaching_move: "Ask what evidence would still be needed even if we trust the speaker.",
      },
    ],
  },
  self_check: {
    questions: [
      {
        question: "Which phrase in a barangay speech functions primarily as logos?",
        options: [
          {
            text: "'Waste pickup missed 14 of 20 streets during last week's storm.'",
            correct: true,
            explanation: "Specific recorded figures provide verifiable logical evidence for the claim.",
          },
          {
            text: "'Speaking as your elected councilor for eight terms...'",
            correct: false,
            explanation: "Mentioning tenure establishes speaker authority (ethos), not logical proof.",
          },
          {
            text: "'Imagine our children walking through rising floodwater tomorrow.'",
            correct: false,
            explanation: "Invoking vivid worry appeals to audience emotion (pathos).",
          },
        ],
      },
      {
        question: "Why can one sentence display both ethos and pathos?",
        options: [
          {
            text: "A speaker can reference trusted experience while calling on shared community care.",
            correct: true,
            explanation: "Separate clauses inside one sentence often address both speaker credibility and audience values.",
          },
          {
            text: "Ethos and pathos are identical words with the same definition.",
            correct: false,
            explanation: "Ethos focuses on speaker trust while pathos engages audience emotion.",
          },
          {
            text: "Grammar rules forbid using logos alongside credibility.",
            correct: false,
            explanation: "Writers routinely combine credibility, evidence, and care in one passage.",
          },
        ],
      },
      {
        question: "What makes '100% of students feel stressed!' weak as logos?",
        options: [
          {
            text: "It uses an unverified exaggeration rather than actual evidence.",
            correct: true,
            explanation: "Numbers only count as logos when backed by credible observation or data.",
          },
          {
            text: "It is shorter than two lines.",
            correct: false,
            explanation: "Logical strength depends on support, not sentence length.",
          },
          {
            text: "It lacks the speaker's academic degree.",
            correct: false,
            explanation: "Adding a degree affects ethos rather than supplying data.",
          },
        ],
      },
    ],
  },
  teach_it: {
    say_in_class_lines: [
      "When reading a speech, ask three quick questions: Why trust the speaker? Why care? What proof is given?",
      "Good speakers often layer trust, care, and proof inside a single sentence.",
      "Do not treat every exclamation or stray percentage as logical evidence—check what supports the claim.",
    ],
    activity: {
      title: "Three-appeal speech excerpt sort",
      time_needed: "15 minutes",
      prepare_before_class: "Write three short 2-line community speech excerpts on index cards or the chalkboard.",
      materials: [
        { name: "Chalkboard speech excerpts", amount: "3 short lines" },
        { name: "Index cards or half-sheets of paper", amount: "1 card per pair" },
      ],
      predict_prompt: "Before sorting, ask students which appeal they expect will appear most often in community speeches.",
      steps: [
        { number: 1, instruction: "Pairs read each excerpt and mark words showing speaker trust, feeling, or evidence." },
        { number: 2, instruction: "Groups share one line that blends two appeals and defend their reason aloud." },
      ],
      observe_prompt: "Students produce labeled phrase notes showing overlapping appeals inside single sentences.",
      explain_prompt: "Ask groups to explain how missing evidence weakens a strong emotional line.",
      scale_note: "Uses the same short-line civic format modeled in the worked example.",
      safety_note: "Standard classroom discussion activity; keep peer critiques respectful and focused on text.",
    },
  },
};

test("JSON schema encodes all seven Concept Pack steps without invented curriculum URLs", () => {
  assert.deepEqual(CONCEPT_PACK_SCHEMA.required, [
    "understand",
    "model",
    "connect",
    "worked_example",
    "misconceptions",
    "self_check",
    "teach_it",
  ]);
  const props = CONCEPT_PACK_SCHEMA.properties as Record<string, unknown>;
  assert.equal("grounding" in props, false);
  assert.equal("curriculum" in props, false);
  assert.deepEqual(
    CONCEPT_PACK_SCHEMA.properties.understand.properties.diagram.properties.template.enum,
    ["two-panel-comparison", "process-flow", "cycle", "labeled-parts", "number-line"]
  );
});

test("validates three full 7-step Concept Packs across Science, Mathematics, and English with distinct teacher majors", () => {
  assert.equal(
    countSentences("Near Earth's surface, gravity accelerates objects at 9.8 m/s². E.g., a 1.5 kg book experiences a 14.7 N pull."),
    2
  );
  assert.equal(shortFieldName("Bachelor of Science in Computer Science"), "Computer Science");

  assert.deepEqual(
    validateConceptPack(
      scienceGasLawsPack,
      GAS_LAWS_GRADE10_FACT_SHEET,
      "Gas Laws: Why sealed bottles expand under direct heat",
      { teacherDegree: "Bachelor of Science in Computer Science", teacherMajor: "Computer Science" }
    ),
    []
  );

  assert.deepEqual(
    validateConceptPack(
      mathSlopePack,
      undefined,
      "Linear equations and slope using local jeepney fare steps",
      { teacherDegree: "Bachelor of Arts in Economics", teacherMajor: "Economics" }
    ),
    []
  );

  assert.deepEqual(
    validateConceptPack(
      englishRhetoricPack,
      undefined,
      "Analyzing ethos, pathos, and logos in civic speeches",
      { teacherDegree: "Bachelor of Science in Nursing", teacherMajor: "Nursing" }
    ),
    []
  );
});

test("rejects topic/degree repetition, generic slop, raw SVG, bad math, unsafe steps, meta-quiz, and major jargon in class script", () => {
  const bad = structuredClone(scienceGasLawsPack);
  bad.understand.big_idea_lines = [
    "Gas Laws: Why sealed bottles expand under direct heat cleanly demonstrates the underlying mechanism.",
    "Gas Laws: Why sealed bottles expand under direct heat shows Gas Laws: Why sealed bottles expand under direct heat.",
    "Gas Laws: Why sealed bottles expand under direct heat appears again cleanly demonstrates.",
  ];
  bad.understand.diagram.caption = "<svg><circle /></svg> diagram caption";
  bad.connect.short_field_label = "Bachelor of Science in Computer Science";
  bad.connect.where_comparison_stops =
    "Bachelor of Science in Computer Science is mentioned twice: Bachelor of Science in Computer Science.";
  bad.worked_example.answer = "2.50 atm";
  bad.self_check.questions[0].question = "Which step in BANSAY shows the Concept Pack script?";
  bad.teach_it.say_in_class_lines[0] = "Remember your Computer Science thread pool while warming gas!";
  bad.teach_it.activity.steps[1].instruction = "Heat the sealed bottle over an open flame and taste a drop.";

  const errors = validateConceptPack(
    bad,
    GAS_LAWS_GRADE10_FACT_SHEET,
    "Gas Laws: Why sealed bottles expand under direct heat",
    { teacherDegree: "Bachelor of Science in Computer Science", teacherMajor: "Computer Science" }
  );

  assert.ok(errors.some((e) => e.includes("no more than 3 times")));
  assert.ok(errors.some((e) => e.includes("full teacher degree name")));
  assert.ok(errors.some((e) => e.includes("Banned generic phrase")));
  assert.ok(errors.some((e) => e.includes("raw SVG")));
  assert.ok(errors.some((e) => e.includes("does not match the recomputed result")));
  assert.ok(errors.some((e) => e.includes("never the app or teaching script")));
  assert.ok(errors.some((e) => e.includes("without the teacher's major jargon")));
  assert.ok(errors.some((e) => e.includes("open flame")));
  assert.ok(errors.some((e) => e.includes("sealed or capped container")));
  assert.ok(errors.some((e) => e.includes("taste or ingest")));
});

test("parses valid JSON or text fact sheets and rejects incomplete fact sheets", () => {
  const textSheet = parseOptionalFactSheet(
    "Competency: Explain linear slope using fare increments.\nCompetency Code: M8AL-Ie-1\nCore explanation: Slope equals constant rate of change over equal intervals.\nKey terms: Slope, y-intercept\nApproved materials: Manila paper with grid, Blackboard marker",
    { subject: "Mathematics", gradeLevel: "Grade 8", topic: "Slope", language: "en" }
  );
  assert.equal(textSheet?.competencyCode, "M8AL-Ie-1");
  assert.deepEqual(textSheet?.requiredScienceTerms, ["Slope", "y-intercept"]);

  assert.throws(
    () =>
      parseOptionalFactSheet(
        JSON.stringify({ depedCompetency: "Short" }),
        { subject: "Science", gradeLevel: "Grade 10", topic: "Gas Laws", language: "en" }
      ),
    /missing required competency or core explanation/i
  );
});

test("retries after validation failure and attaches curriculum only when the fact sheet lists references", async () => {
  const promptsSeen: string[] = [];
  const brokenMathPack = structuredClone(mathSlopePack);
  brokenMathPack.worked_example.answer = "99.00 pesos";

  const outcome = await generatePackWithSingleRetry({
    subject: "Mathematics",
    gradeLevel: "Grade 8",
    topic: "Linear equations and slope using local jeepney fare steps",
    shortField: "Economics",
    language: "en",
    usesLabEquipment: false,
    factSheet: undefined,
    validationOptions: { teacherDegree: "BA Economics", teacherMajor: "Economics" },
    invokeModel: async (promptInput, attempt) => {
      promptsSeen.push(promptInput);
      return attempt === 0 ? brokenMathPack : mathSlopePack;
    },
  });

  assert.equal(outcome.attemptsUsed, 2);
  assert.equal(outcome.pack.curriculum, undefined);
  assert.match(promptsSeen[1], /does not match the recomputed result/);

  const withSheetOptions: Parameters<typeof generatePackWithSingleRetry>[0] = {
    subject: "Science",
    gradeLevel: "Grade 10",
    topic: "Gas Laws: Why sealed bottles expand under direct heat",
    shortField: "Computer Science",
    language: "en",
    usesLabEquipment: false,
    factSheet: GAS_LAWS_GRADE10_FACT_SHEET,
    validationOptions: { teacherDegree: "BS Computer Science", teacherMajor: "Computer Science" },
    invokeModel: async (prompt) => {
      assert.ok(!prompt.includes(GAS_LAWS_GRADE10_FACT_SHEET.competencyCode));
      assert.ok(!prompt.includes(GAS_LAWS_GRADE10_FACT_SHEET.depedCompetency));
      assert.ok(!prompt.includes(GAS_LAWS_GRADE10_FACT_SHEET.references![0].url));
      return structuredClone(scienceGasLawsPack);
    },
  };
  const withSheet = await generatePackWithSingleRetry(withSheetOptions);
  const withoutReferences = await generatePackWithSingleRetry({
    ...withSheetOptions,
    factSheet: { ...GAS_LAWS_GRADE10_FACT_SHEET, references: [] },
  });
  assert.equal(withoutReferences.pack.curriculum, undefined);

  assert.equal(withSheet.attemptsUsed, 1);
  assert.equal(withSheet.pack.curriculum?.competencyCode, "S10MT-IVa-b-21");
});

test("failed generation throws unavailable state without ever showing template fallback text", async () => {
  const brokenEnglish = structuredClone(englishRhetoricPack);
  brokenEnglish.self_check.questions[0].options[0].explanation = "Too short";

  await assert.rejects(
    () =>
      generatePackWithSingleRetry({
        subject: "English",
        gradeLevel: "Grade 10",
        topic: "Analyzing ethos, pathos, and logos in civic speeches",
        shortField: "Nursing",
        language: "en",
        usesLabEquipment: false,
        validationOptions: { teacherDegree: "BS Nursing", teacherMajor: "Nursing" },
        invokeModel: async () => brokenEnglish,
      }),
    (err: unknown) =>
      err instanceof ConceptPackUnavailableError &&
      err.message === PACK_UNAVAILABLE_ERROR_MESSAGE
  );

  // Also test full server engine unavailability when no API keys exist in env
  const oldGem = process.env.GEMINI_API_KEY;
  const oldOr = process.env.OPENROUTER_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    await assert.rejects(
      () =>
        generateValidatedConceptPack({
          subject: "English",
          gradeLevel: "Grade 10",
          topic: "Analyzing ethos, pathos, and logos in civic speeches",
          teacherMajor: "BS Nursing",
          language: "en",
        }),
      (err: unknown) =>
        err instanceof ConceptPackUnavailableError &&
        err.message === PACK_UNAVAILABLE_ERROR_MESSAGE
    );
  } finally {
    if (oldGem !== undefined) process.env.GEMINI_API_KEY = oldGem;
    if (oldOr !== undefined) process.env.OPENROUTER_API_KEY = oldOr;
  }

  const clientOutcome = await requestConceptPack(async () => {
    throw new Error("503 unavailable");
  });
  assert.deepEqual(clientOutcome, {
    ok: false,
    message: CONCEPT_PACK_UNAVAILABLE_MESSAGE,
  });
  assert.doesNotMatch(
    clientOutcome.message,
    /cleanly demonstrates|underlying mechanism|surface appearance|two everyday household items/i
  );
});

test("rejects model-created source metadata, URLs, codes, and fact-sheet quotes", () => {
  const sheet = GAS_LAWS_GRADE10_FACT_SHEET;
  for (const candidate of [
    { curriculum: {} },
    { references: [] },
    { section: ["See https://example.test/material"] },
    { section: [sheet.competencyCode] },
    { section: [sheet.depedCompetency] },
  ]) assert.equal(validateModelSources(candidate, sheet).length, 1);
  assert.deepEqual(validateModelSources(scienceGasLawsPack, sheet), []);
});
