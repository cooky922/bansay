export type BansayLanguage = "en" | "fil" | "ceb";

export type UserRole = "teacher" | "mentor" | "coordinator";

export type ActiveSection = "prep" | "rehearsal" | "portfolio" | "cohort";

export type SubjectName = "Science" | "Mathematics" | "English";

export interface SpecialtyBridge {
  title: string;
  explanation: string;
  trySaying: string;
  limitationNote: string;
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
}

export interface SimulatedStudentPrompt {
  studentName: string;
  openingQuestion: string;
  freshCasePrompt: string;
}

export interface GeneratedLessonSupport {
  specialtyBridge: SpecialtyBridge;
  misconceptionAlerts: MisconceptionAlert[];
  improvisedActivity: ImprovisedActivity;
  simulatedStudentPrompt: SimulatedStudentPrompt;
}

export interface RehearsalMessage {
  id: string;
  sender: "student" | "teacher";
  text: string;
  timestamp: string;
  attachmentType?: "text" | "voice-note" | "handwritten-photo";
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
}

export interface LessonCase {
  id: string;
  subject: SubjectName;
  gradeLevel: string;
  topic: string;
  teacherName: string;
  teacherMajor: string;
  classDate: string;
  submittedAt: string;
  language: BansayLanguage;
  startingMaterial: string;
  uploadedImagePreview?: string;
  baselineFirst: boolean;
  baselineExplanation: string;
  submissionFormat: "live-ai" | "offline-fallback";
  support: GeneratedLessonSupport;
  rehearsalMessages: RehearsalMessage[];
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
  title: string;
  summary: string;
  verifiedExplanation: string;
  improvisedSetup: string;
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
