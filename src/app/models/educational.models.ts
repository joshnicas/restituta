export interface Grade {
  id: number;
  name: string;
  code: string;
  level: number;
  stage: string;
  active: boolean;
}

export interface GradeSubject {
  id: number;
  gradeId: number;
  subjectId: number;
  name: string;
  subject: {
    id: number;
    name: string;
    code: string;
    icon?: string;
  };
}

export interface Topic {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  active?: boolean;
  subjectId?: number;
  gradeSubjectTopics?: Array<{
    gradeSubject: {
      id: number;
      grade: { id: number };
      subject: { id: number; name: string };
    };
  }>;
}

export interface GameLevel {
  id: number;
  gradeSubjectId: number;
  levelNumber: number;
  name: string;
  description?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  requiredPoints?: number;
  timeLimit?: number | null;
  active?: boolean;
}

export interface GameType {
  id: number;
  name: string;
  code: string;
  description?: string | null;
}

export interface Question {
  id: number;
  text: string;
  image?: string | null;
  audio?: string | null;
  explanation?: string | null;
  points: number;
  timeLimit?: number | null;
  active: boolean;
  gameType: {
    id: number;
    name: string;
    code: string;
  };
  topic?: {
    id: number;
    name: string;
  };
  gameLevel?: {
    id: number;
    gradeSubject: {
      id: number;
      grade: { id: number; name: string };
      subject: { id: number; name: string };
    };
  };
  options?: QuestionOption[];
  trueFalseAnswer?: boolean | null;
  matchingPairs?: MatchPair[];
  orderingItems?: OrderingItem[];
  acceptedAnswers?: AcceptedAnswer[];
  media?: QuestionMedia[];
}

export interface QuestionOption {
  text?: string | null;
  image?: string | null;
  audio?: string | null;
  isCorrect?: boolean;
  order?: number;
}

export interface MatchPair {
  leftText?: string | null;
  leftImage?: string | null;
  rightText?: string | null;
  rightImage?: string | null;
  order?: number;
}

export interface OrderingItem {
  text?: string | null;
  image?: string | null;
  correctOrder: number;
}

export interface AcceptedAnswer {
  answer: string;
  isCaseSensitive?: boolean;
}

export interface QuestionMedia {
  type: 'IMAGE' | 'AUDIO';
  url: string;
  altText?: string | null;
  order?: number;
}

export interface CreateLevelPayload {
  gradeSubjectId: number;
  levelNumber: number;
  name?: string;
  description?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  requiredPoints?: number;
  timeLimit?: number | null;
  active?: boolean;
}

export interface UpdateLevelPayload {
  gradeSubjectId?: number;
  levelNumber?: number;
  name?: string;
  description?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  requiredPoints?: number;
  timeLimit?: number | null;
  active?: boolean;
}

export interface CreateSubjectPayload {
  name: string;
  code?: string;
  icon?: string | null;
  description?: string | null;
  active?: boolean;
  gradeIds?: number[];
}

export interface CreateQuestionPayload {
  gameLevelId: number;
  gameTypeId: number;
  topicId?: number | null;
  text: string;
  explanation?: string | null;
  points?: number;
  timeLimit?: number | null;
  active?: boolean;
  options?: QuestionOption[];
  trueFalseAnswer?: boolean;
  matchingPairs?: MatchPair[];
  orderingItems?: OrderingItem[];
  acceptedAnswers?: AcceptedAnswer[];
  media?: QuestionMedia[];
  competencyIds?: number[];
  themeIds?: number[];
}

export interface CreateTopicPayload {
  subjectId: number;
  name: string;
  code?: string;
  description?: string | null;
  active?: boolean;
  gradeSubjectIds?: number[];
}

export interface UpdateTopicPayload {
  subjectId?: number;
  name?: string;
  code?: string;
  description?: string | null;
  active?: boolean;
  gradeSubjectIds?: number[];
}

export type GameTypeCode = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'IMAGE_CHOICE' | 'MATCHING' | 'DRAG_AND_DROP' | 'FILL_IN_THE_BLANK' | 'ORDERING' | 'MEMORY';
