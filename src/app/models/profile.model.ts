export interface User {
  id: number;
  userID: string;
  email: string;
  name: string;
  DoB: string | null;
  gradeId: number | null;
  profilePic: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserGameProfile {
  userId: number;
  xp: number;
  coins: number;
  stars: number;
  currentStreak: number;
  longestStreak: number;
  updatedAt: string;
}