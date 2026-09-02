export interface UserQuestionAttempt {
  id: number;
  userId: number;
  questionId: number;
  isCorrect: boolean;
  pointsEarned: number;
  coinsEarned: number;
  starsEarned: number;
  timeTaken: number | null;
  answerData: unknown;
  attemptedAt: string;
}