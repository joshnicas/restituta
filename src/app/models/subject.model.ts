export interface Subject {
  id: number;
  name: string;
  code: string;
  icon: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}