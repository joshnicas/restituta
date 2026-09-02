export interface Question {
  id: number;
  gameLevelId: number;
  topicId: number | null;
  gameTypeId: number;
  text: string;
  image: string | null;
  audio: string | null;
  explanation: string | null;
  points: number;
  timeLimit: number | null;
  active: boolean;

  options: QuestionOption[];
}

export interface QuestionOption {
  id: number;
  questionId: number;
  text: string | null;
  image: string | null;
  audio: string | null;
  isCorrect: boolean;
  order: number;
}