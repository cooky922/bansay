export type BansayLanguage = "en" | "fil" | "ceb";

export type UserRole = "teacher" | "mentor" | "coordinator";

export type CareerStage = "1" | "2" | "3" | "4";

export type ActiveSection = "prep" | "rehearsal" | "library" | "portfolio" | "cohort" | "privacy";

export type SubjectName = "Science" | "Mathematics" | "English";

export type CurriculumFramework = "MATATAG (K-9)" | "K-12 MELCs (G10-12)";

export type LeadTimeTier = "standard-sla" | "best-effort";

export type ConceptPackStatus = "ai-draft" | "mentor-verified";

export type MediaTier = "local-webcam" | "cot-video" | "voice-note" | "setup-photo";

export interface AuthUserProfile {
  id: string;
  email: string;
  displayName: string;
  degree: string;
  major: string | null;
  schoolDivision: string;
  preferredLanguage: BansayLanguage;
  careerStage: CareerStage;
  role: UserRole;
  lowDataMode: boolean;
  biologicalSex: "female" | "male" | "prefer-not-to-say";
  createdAt: string;
}

export interface BigIdeaSection {
  summary: string;
  curriculumGrounding: CurriculumFramework;
  ppstIndicators: string[];
}

export interface SpecialtyBridge {
  title: string;
  explanation: string;
  trySaying: string;
  limitationNote: string;
}

export interface ContrastiveWorkedExample {
  title: string;
  positiveExample: string;
  causalWhy: string;
  contrastiveNonExample: string;
  contrastWhyItDiffers: string;
}

export interface MisconceptionDiagnostic {
  prompt: string;
  options: string[];
  flawedOptionIndex: number;
  studentMentalModel: string;
  refutation: string;
}

export interface QuickSelfCheckItem {
  question: string;
  options: string[];
  correctIndex: number;
  feedback: string;
}

export interface MisconceptionAlert {
  question: string;
  whatStudentImagines: string;
  practicalResponse: string;
}

export interface ImprovisedActivity {
  title: string;
  materials: string[];
  steps: string[];
  keyTakeaway: string;
  safetyProtocol: string;
  usesLabEquipment?: boolean;
}

export interface SimulatedStudentPrompt {

  openingQuestion: string;
  freshCasePrompt: string;
}

export interface LlmJudgeScores {
  conceptualAccuracy: number;
  analogyFidelity: number;
  misconceptionDepth: number;
  localFeasibility: number;
  mobileScannability: number;
}

export interface LlmJudgeReport {
  scores: LlmJudgeScores;
  regenerationCount: number;
  passed: boolean;
  notes: string;
}

export type DiagramTemplateType =
  | "two-panel-comparison"
  | "process-flow"
  | "cycle"
  | "labeled-parts"
  | "number-line";

export interface ConceptPackDiagram {
  template: DiagramTemplateType;
  title: string;
  caption: string;
  items: Array<{
    label: string;
    detail: string;
  }>;
}

export interface FactSheetReference {
  title: string;
  type: string;
  grade: string | number;
  quarter: string | number;
  url: string;
  last_checked: string;
  page?: string | number;
  lesson?: string | number;
}

export interface ValidatedConceptPack {
  curriculum?: {
    framework: string;
    competencyCode: string;
    competency: string;
    sourceTitle: string;
    sourceUrl: string;
    references?: FactSheetReference[];
  };
  understand: {
    big_idea_lines: string[];
    diagram: ConceptPackDiagram;
    key_terms: Array<{
      term: string;
      definition: string;
    }>;
  };
  model: {
    steps: string[];
    when_it_applies: string;
    when_it_does_not_apply: string;
    formula: {
      law: string;
      equation: string;
      variables: Array<{
        symbol: string;
        definition: string;
        unit: string;
      }>;
    };
  };
  connect: {
    short_field_label: string;
    mappings: Array<{
      field_feature: string;
      lesson_concept: string;
      explanation: string;
    }>;
    where_comparison_stops: string;
  };
  worked_example: {
    kind: "quantitative" | "conceptual";
    problem: string;
    steps: string[];
    answer: string;
    verification: {
      expression: string;
      result: number;
      unit: string;
    };
    common_error: {
      error_name: string;
      wrong_work: string;
      wrong_result: string;
      why_wrong: string;
    };
  };
  misconceptions: {
    prediction_prompt: string;
    items: Array<{
      name: string;
      what_students_say: string;
      what_is_really_happening: string;
      teaching_move: string;
    }>;
  };
  self_check: {
    questions: Array<{
      question: string;
      options: Array<{
        text: string;
        correct: boolean;
        explanation: string;
      }>;
    }>;
  };
  teach_it: {
    say_in_class_lines: string[];
    activity: {
      title: string;
      time_needed: string;
      prepare_before_class: string;
      materials: Array<{
        name: string;
        amount: string;
      }>;
      predict_prompt: string;
      steps: Array<{
        number: number;
        instruction: string;
      }>;
      observe_prompt: string;
      explain_prompt: string;
      scale_note: string;
      safety_note: string;
    };
  };
}

export interface GeneratedLessonSupport {
  validatedPack?: ValidatedConceptPack;
  bigIdea: BigIdeaSection;
  specialtyBridge: SpecialtyBridge;
  contrastiveExamples: ContrastiveWorkedExample[];
  misconceptionDiagnostic: MisconceptionDiagnostic;
  misconceptionAlerts: MisconceptionAlert[];
  quickSelfCheck: QuickSelfCheckItem[];
  improvisedActivity: ImprovisedActivity;
  simulatedStudentPrompt: SimulatedStudentPrompt;
  judgeReport: LlmJudgeReport;
}

export interface RehearsalMessage {
  id: string;
  sender: "student" | "teacher";
  text: string;
  timestamp: string;
  opening?: boolean;
  studentName?: string;
  scripted?: boolean;
  sharedWithMentor?: boolean;
  closing?: "understood" | "turn-limit" | "finished";
  attachmentType?: "text" | "voice-note" | "video-note" | "handwritten-photo";
}

export interface MediaAssetRecord {
  id: string;
  caseId: string;
  tier: MediaTier;
  step: 2 | 4 | 7;
  consentConfirmed: boolean;
  noStudentFacesConfirmed: boolean;
  retentionDays: 0 | 7 | 14 | 30;
  hasContent?: boolean;
  sharedForReview?: boolean;
  expiresAt: string | null;
  portfolioIncluded: boolean;
  status: "local-only" | "active" | "stripped-from-portfolio" | "purged";
  label: string;
  createdAt: string;
}

export interface MentorReviewNote {
  mentorName: string;
  mentorAffiliation: string;
  backupMentorName: string;
  languagesCovered: BansayLanguage[];
  reviewedAt: string;
  focusedGap: string;
  teachingMove: string;
  quickRefresher?: string;
  masteredSkill: string;
  practiceSkill: string;
  status: "pending" | "returned" | "completed";
  submittedForReview?: boolean;
  assignment?: "unsubmitted" | "waiting" | "assigned";
  reviewQueueLane?: LeadTimeTier;
  packAuditDurationSec?: number;
  transcriptReviewDurationSec?: number;
  packSubstantiveRewrite?: boolean;
  packVerifiedAt?: string;
}

export interface LessonCase {
  id: string;
  subject: SubjectName;
  gradeLevel: string;
  topic: string;
  teacherName: string;
  teacherMajor: string;
  classDate: string;
  careerStage: CareerStage;
  submittedAt: string;
  language: BansayLanguage;
  startingMaterial: string;
  uploadedImagePreview?: string;
  baselineFirst: boolean;
  baselineExplanation: string;
  submissionFormat: "live-ai" | "offline-fallback";
  packStatus: ConceptPackStatus;
  leadTimeTier: LeadTimeTier;
  daysUntilClass: number;
  usesLabEquipment?: boolean;
  diagnosticCompleted?: boolean;
  selfCheckScore?: number;
  matchedLacPackId?: string | null;
  postClassReflection?: string;
  support: GeneratedLessonSupport;
  rehearsalMessages: RehearsalMessage[];
  mediaAssets: MediaAssetRecord[];
  mentorReview: MentorReviewNote;
  teacherRevision: string;
  freshCaseResponse: string;
  freshCaseStatus: "locked" | "ready" | "submitted" | "verified";
  cachedOffline: boolean;
}

export interface PeerLibraryItem {
  id: string;
  subjectTag: string;
  subject: SubjectName;
  gradeLevel: string;
  title: string;
  summary: string;
  bigIdeaSummary: string;
  limitationNote: string;
  verifiedExplanation: string;
  improvisedSetup: string;
  ppstIndicators: string[];
  saveCount: number;
  language: BansayLanguage;
}

export interface CompetencyQuarter {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  title: string;
  description: string;
  completedCount: number;
  targetCount: number;
  status: "verified" | "in-progress" | "upcoming";
}

export interface ClassroomEvidenceItem {
  id: string;
  title: string;
  subject: string;
  date: string;
  revisionUsed: string;
  classroomOutcome: string;
  evidenceType: "Improvised Lab Setup" | "Classroom Reflection" | "Colleague Observation";
  verificationStatus: "Mentor verified" | "Teacher logged" | "Colleague observed";
  photoRetentionNotice?: string;
}

export interface CohortSeat {
  seatCode: string;
  subjectArea: SubjectName;
  majorBackground: string;
  cyclesCompleted: number;
  onTimeReviews: number;
  freshCaseImproved: boolean | null;
  submissionChannel: "Live AI" | "Offline Prompt";
  status: "Completed 2 cycles" | "In cycle 2" | "Cycle 1 active";
}

export interface EngineeringControlMetric {
  id: string;
  control: string;
  specification: string;
  purpose: string;
  passCount: number;
  totalCount: number;
}

export interface PilotValidationMetric {
  id: string;
  metric: string;
  threshold: string;
  currentValue: string;
  dataSource: string;
  meetsThreshold: boolean;
}

export interface PilotBudgetRow {
  expense: string;
  basis: string;
  estimatedValue: string;
  cashOutlay: string;
}

export interface UnitEconomicsRow {
  tier: string;
  buyer: string;
  variableCogs: string;
  targetPrice: string;
  grossProfit: string;
  grossMargin: string;
  status: string;
}
