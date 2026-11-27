export type BansayLanguage = "en" | "fil" | "ceb";

export type UserRole = "teacher" | "mentor" | "coordinator";

export type CareerStage = "1" | "2" | "3" | "4";

export type ActiveSection = "prep" | "rehearsal" | "library" | "portfolio" | "cohort";

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
  studentName: string;
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

export interface ValidatedConceptPack {
  grounding: {
    competency: string;
    evidence_summary: string;
    sources: Array<{ title: string; url: string }>;
  };
  say_in_class: string;
  mechanism: string;
  formula: {
    law: string;
    equation: string;
    conditions: string;
    variables: Array<{
      symbol: string;
      definition: string;
      unit: string;
    }>;
  };
  bridge: {
    analogy: string;
    where_it_breaks_down: string;
  };
  worked_example: {
      problem: string;
    steps: string[];
      answer: string;
  };
  contrast: {
    error_name: string;
    wrong_work: string;
    wrong_result: string;
    why_wrong: string;
  };
  misconceptions: Array<{
    name: string;
    what_students_say: string;
    what_is_really_happening: string;
    teaching_move: string;
  }>;
  self_check: Array<{
    question: string;
    options: Array<{
      text: string;
      correct: boolean;
      explanation: string;
    }>;
  }>;
  demo: {
    title: string;
    materials: Array<{
      name: string;
      amount: string;
    }>;
    steps: Array<{
      number: number;
      instruction: string;
    }>;
    expected_observation: string;
    safety_note: string;
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
