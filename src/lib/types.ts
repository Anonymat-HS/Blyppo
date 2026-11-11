export interface Course {
  id: string;
  user_id: string;
  titre: string;
  texte_extrait: string;
  created_at: string;
}

/** A course without its (potentially very large) extracted text. */
export type CourseSummary = Pick<Course, "id" | "titre" | "created_at">;

export interface CourseWithCounts extends CourseSummary {
  quiz_count: number;
  flashcard_count: number;
}

export interface QuizItem {
  id: string;
  course_id: string;
  question: string;
  options: string[];
  bonne_reponse: string;
  explication: string | null;
  created_at: string;
}

export type QuizQuestion = Pick<
  QuizItem,
  "id" | "question" | "options" | "bonne_reponse" | "explication"
>;

export interface Flashcard {
  id: string;
  course_id: string;
  recto: string;
  verso: string;
  created_at: string;
}

export type FlashcardReviewCard = Pick<Flashcard, "id" | "recto" | "verso">;

export interface UserProgress {
  id: string;
  user_id: string;
  quiz_id: string;
  correct: boolean | null;
  tentatives: number;
  last_reviewed: string;
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  niveau: "nouveau" | "difficile" | "bien" | "facile";
  last_reviewed: string;
  next_review: string | null;
  intervalle_jours: number;
}

export interface QuizAttempt {
  id: string;
  course_id: string;
  score: number;
  total: number;
  created_at: string;
}

export interface StudyEvent {
  kind: "quiz_answer" | "flashcard_review";
  created_at: string;
}

export interface QuizOptions {
  numberOfQuestions?: number;
}

export interface FlashcardOptions {
  numberOfCards?: number;
}
