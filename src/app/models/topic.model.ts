export interface Topic {
  id: number;
  subjectId: number;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}