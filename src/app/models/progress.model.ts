export interface UserLevelProgress {
  id: number;
  userId: number;
  gradeId: number | null;
  gameLevelId: number;
  completed: boolean;
  score: number;
  stars: number;
  bestScore: number;
  attempts: number;
  completedAt: string | null;
  updatedAt: string;
}