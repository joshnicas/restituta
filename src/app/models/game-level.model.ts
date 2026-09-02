export interface GameLevel {
  id: number;
  gradeSubjectId: number;
  levelNumber: number;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  requiredPoints: number;
  timeLimit: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Difficulty =
  | 'EASY'
  | 'MEDIUM'
  | 'HARD'
  | 'EXPERT';