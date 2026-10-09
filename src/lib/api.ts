import { API_BASE } from "./config";
import { getKidoLanguage, type KidoLanguage } from "./language-preferences";
import { getDeviceId, persistAuthResponse, refreshAccessToken } from "./auth-session";

type RequestOptions = {
  method?: string;
  body?: any;
  token?: string;
  headers?: Record<string, string>;
};

async function request<T = any>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { method = "GET", body, token, headers = {} } = opts;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(headers || {}),
    },
  };

  // Attach body
  if (body !== undefined && body !== null) {
    // Allow FormData passthrough
    if (body instanceof FormData) {
      fetchOptions.body = body as any;
    } else {
      fetchOptions.headers = {
        ...(fetchOptions.headers as Record<string, string>),
        "Content-Type": "application/json",
      };
      fetchOptions.body = JSON.stringify(body);
    }
  }

  if (token) {
    (fetchOptions.headers as Record<string, string>)["Authorization"] =
      `Bearer ${token}`;
  }

  let res = await fetch(url, fetchOptions);
  const isSessionEndpoint = path === "/users/login" || path === "/users/register" || path === "/users/refresh";
  if (res.status === 401 && token && !isSessionEndpoint) {
    const refreshed = await refreshAccessToken().catch(() => null);
    if (refreshed) {
      (fetchOptions.headers as Record<string, string>)["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(url, fetchOptions);
    }
  }

  if (res.status === 204) return null as unknown as T;

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const message = typeof data === "object" && data?.message ? data.message : `Request failed: ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }
  return data as T;
}

// Public API helpers
export { request };
export const getPlayers = () => request("/players");
export const getUsers = () => request("/users");
export const getUserMe = (token: string) => request("/users/me", { token });
export type SubscriptionPlan = { id: string; code: string; name: string; price: number; currency: string; duration: number; durationUnit: "MONTH" };
export type PaymentStatus = "CREATED" | "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED" | "AMOUNT_MISMATCH";
export const getSubscriptionPlans = () => request<SubscriptionPlan[]>("/subscription/plans");
export const getMySubscription = (token: string) => request<{ hasActiveSubscription: boolean; subscription: null | { id: string; plan: string; planName: string; duration: number; status: string; startedAt: string; expiresAt: string } }>("/subscription/me", { token });
export const createSubscriptionPayment = (planId: string, phoneNumber: string, token: string) =>
  request<{ paymentId: string; status: PaymentStatus; message: string }>("/subscription/pay", { method: "POST", body: { planId, phoneNumber }, token });
export const getSubscriptionPayment = (paymentId: string, token: string) =>
  request<{ paymentId: string; status: PaymentStatus; message?: string; phoneNumber?: string; subscription?: { status: string; expiresAt: string } }>(`/subscription/payments/${encodeURIComponent(paymentId)}`, { token });
export const getOpenSubscriptionPayment = (token: string) =>
  request<{ payment: null | { paymentId: string; status: "CREATED" | "PENDING"; phoneNumber: string } }>("/subscription/payments/current", { token });
export const cancelSubscriptionPayment = (paymentId: string, token: string) =>
  request<{ paymentId: string; status: PaymentStatus; message?: string }>(`/subscription/payments/${encodeURIComponent(paymentId)}/cancel`, { method: "POST", token });
export const updateUserLanguage = (language: KidoLanguage, token: string) =>
  request("/users/me/language", { method: "PATCH", body: { language }, token });
export const getUserById = (id: string | number, token?: string) =>
  request(`/users/${id}`, { token });
export const updateUserAccount = (
  body: { userID?: string; email?: string; DoB?: string; gradeId?: number; schoolCode?: string | null },
  token: string,
) => request("/users/account", { method: "PUT", body, token });

export type SchoolOption = {
  schoolCode: string;
  name: string;
  district: string;
  region: string;
};

export const getSchoolRegions = () =>
  request<{ success: true; regions: string[] }>("/schools/regions");
export const getSchoolDistricts = (region: string) =>
  request<{ success: true; districts: string[] }>(
    `/schools/districts?region=${encodeURIComponent(region)}`,
  );
export const getSchoolByCode = (schoolCode: string) =>
  request<{ success: true; school: SchoolOption }>(
    `/schools/${encodeURIComponent(schoolCode)}`,
  );
export const searchSchools = (query: {
  search?: string;
  region?: string;
  district?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return request<{
    success: true;
    schools: SchoolOption[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/schools?${params.toString()}`);
};

let loginInFlight: { userID: string; promise: Promise<any> } | null = null;
export const postAuthLogin = async (body: { userID: string }) => {
  if (loginInFlight?.userID === body.userID) return loginInFlight.promise;
  const promise = (async () => {
    const deviceId = await getDeviceId();
    const result = await request<any>("/users/login", { method: "POST", body, headers: { "X-Device-ID": deviceId } });
    await persistAuthResponse(result);
    return result;
  })();
  loginInFlight = { userID: body.userID, promise };
  try { return await promise; }
  finally { if (loginInFlight?.promise === promise) loginInFlight = null; }
};

export const getAuthToken = (response: any) =>
  response?.token ??
  response?.accessToken ??
  response?.data?.token ??
  response?.data?.accessToken ??
  response?.user?.token ??
  response?.user?.accessToken;

export const postAuthRegister = async (body: any) => {
  const deviceId = await getDeviceId();
  const result = await request<any>("/users/register", { method: "POST", body, headers: { "X-Device-ID": deviceId } });
  await persistAuthResponse(result);
  return result;
};

export type UserGameProfileInput = {
  userId: string | number;
  key?: string | null;
  xp: number;
  coins: number;
  stars: number;
  currentStreak: number;
  longestStreak: number;
};

export type UserGameProfileGenreStat = {
  genreId: string;
  genreName: string;
  xp: number;
  stars: number;
};

export type UserGameProfile = UserGameProfileInput & {
  genreStats?: UserGameProfileGenreStat[];
};

export const postUserGameProfile = (body: UserGameProfileInput) =>
  request("/profiles", { method: "POST", body });

export const getUserGameProfile = (userId: string | number) =>
  request<{ success: boolean; profile: UserGameProfile }>(`/profiles/me?userId=${userId}`);

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  userID: string;
  profilePic: string | null;
  xp: number;
  stars: number;
  longestStreak: number;
  school?: SchoolOption | null;
};

export type LeaderboardResponse = {
  success: boolean;
  period: "week" | "month" | "overall";
  metric: "xp" | "stars" | "longestStreak";
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const getLeaderboard = (query: {
  period?: "week" | "month" | "overall";
  metric?: "xp" | "stars" | "longestStreak";
  page?: number;
  limit?: number;
  schoolCode?: string;
  region?: string;
}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return request<LeaderboardResponse>(`/leaderboards?${params.toString()}`);
};

export type StreakWeekDay = {
  date: string;
  day: string;
  complete: boolean;
};

export type HistoricalStreak = {
  startDate: string;
  endDate: string;
  days: number;
};

export type UserStreakResponse = {
  success: true;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  week: StreakWeekDay[];
  historicalStreaks: HistoricalStreak[];
};

export type QuestionAttemptInput = {
  questionId: number;
  isCorrect: boolean;
  pointsEarned?: number;
  coinsEarned?: number;
  timeTaken?: number;
  answerData?: Record<string, unknown>;
};

export type QuestionAttemptResponse = {
  success: true;
  message: string;
  attempt: {
    id: string;
    questionId: number;
    isCorrect: boolean;
    pointsEarned?: number;
    coinsEarned?: number;
    timeTaken?: number;
    answerData?: Record<string, unknown>;
    attemptedAt: string;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
  };
  lives: PlayerLivesResponse;
};

export type PlayerLivesResponse = {
  success?: true;
  lives: number;
  nextLifeAt: string | null;
};

export const getMyLives = (token: string) =>
  request<PlayerLivesResponse>("/users/me/lives", { token });

export const getMyStreak = (token: string) =>
  request<UserStreakResponse>("/users/me/streak", { token });

export const postQuestionAttempt = (
  body: QuestionAttemptInput,
  token: string,
) => request<QuestionAttemptResponse>("/attempts", { method: "POST", body, token });

export const getGrades = () => request("/grades");
export const getGradeSubjects = (gradeId: string | number) =>
  request(`/grades/${gradeId}/subjects`);
export const getGradeSubjectLevels = (gradeSubjectId: string | number) =>
  request(`/grade-subjects/${gradeSubjectId}/levels`);
export const getUserLevelProgress = (token: string) =>
  request("/progress", { token });
export const postUserLevelProgress = (body: Record<string, unknown>, token: string) =>
  request("/progress", { method: "POST", body, token });
export const updateUserLevelProgress = (levelId: string | number, body: Record<string, unknown>, token: string) =>
  request(`/progress/${levelId}`, { method: "PUT", body, token });

export type GameQuestionOption = { id: string; text?: string | null; image?: string | null; audio?: string | null; isCorrect: boolean; order: number };
export type GameQuestionMedia = { id: string; type: "IMAGE" | "AUDIO"; url: string; altText?: string | null; order: number };
export type GameQuestion = {
  id: string;
  gameLevelId?: string | number;
  text: string;
  active?: boolean;
  timeLimit?: number | null;
  gameType: { code: string; name: string };
  topicId?: string | number | null;
  options: GameQuestionOption[];
  trueFalseAnswer?: boolean | null;
  media: GameQuestionMedia[];
};
export type LevelQuestionsResponse = { level: { id: string; levelNumber: number; name: string }; questions: GameQuestion[]; count: number };
export const getLevelQuestions = async (levelId: string | number, language?: KidoLanguage) => {
  const selectedLanguage = language ?? await getKidoLanguage();
  return request<LevelQuestionsResponse>(`/levels/${levelId}/questions?language=${selectedLanguage}`);
};

export type PracticeMode = "QUICK" | "SUBJECT" | "MISTAKES";
export type PracticeOption = { id: string; text?: string | null; image?: string | null; audio?: string | null; order: number };
export type PracticeQuestion = {
  id: string;
  text: string;
  image?: string | null;
  audio?: string | null;
  timeLimit?: number | null;
  gameType: { code: string; name: string };
  topicId?: string | number | null;
  options: PracticeOption[];
  media: GameQuestionMedia[];
};
export type PracticeSession = {
  id: string;
  mode: PracticeMode;
  subjectId: string | null;
  topicId: string | null;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  pointsEarned: number;
  starsEarned: number;
  completed: boolean;
  startedAt: string;
  completedAt: string | null;
};
export type PracticeStartInput = { mode: "QUICK" | "MISTAKES" } | { mode: "SUBJECT"; subjectId: string; topicId?: string };
export type PracticeHomeResponse = {
  success: true;
  hasActiveSubscription?: boolean;
  usedSections?: string[];
  streak: number;
  quickPractice: { available: boolean; questionCount: number };
  mistakes: { questionCount: number; topic: { name: string; accuracy: number } | null; hasWeakTopics: boolean };
  subjects: { id: string; name: string; code: string; icon: string | null; accuracy: number | null; questionsAnswered: number }[];
  stats: { questionsAnswered: number; accuracy: number | null; pointsEarned: number; starsEarned: number };
};
export type PracticeSubjectResponse = {
  success: true;
  hasActiveSubscription?: boolean;
  usedSections?: string[];
  subject: { id: string; name: string; code: string; icon: string | null };
  topics: { id: string; name: string; accuracy: number | null; questionsAnswered: number }[];
};
export type PracticeStartResponse = { success: true; session: PracticeSession; questions: PracticeQuestion[]; answeredQuestionIds?: string[]; result?: PracticeCompleteResponse };
export type PracticeAnswerResponse = {
  success: true;
  correct: boolean;
  correctAnswer: string;
  pointsEarned: number;
  starsEarned: number;
  answeredQuestions: number;
  totalQuestions: number;
};
export type PracticeCompleteResponse = {
  success: true;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  pointsEarned: number;
  starsEarned: number;
};

export const getPracticeHome = (token: string) => request<PracticeHomeResponse>("/practice", { token });
export const getPracticeSubject = (subjectId: string, token: string) =>
  request<PracticeSubjectResponse>(`/practice/subjects/${encodeURIComponent(subjectId)}`, { token });
export const postStartPractice = (body: PracticeStartInput, token: string) =>
  request<PracticeStartResponse>("/practice/start", { method: "POST", body, token });
export const getPracticeSession = (sessionId: string, token: string) =>
  request<PracticeStartResponse>(`/practice/${encodeURIComponent(sessionId)}`, { token });
export const postPracticeAnswer = (
  sessionId: string,
  body: { questionId: string; selectedOptionId?: string; answer?: boolean },
  token: string,
) => request<PracticeAnswerResponse>(`/practice/${encodeURIComponent(sessionId)}/answer`, { method: "POST", body, token });
export const postCompletePractice = (sessionId: string, token: string) =>
  request<PracticeCompleteResponse>(`/practice/${encodeURIComponent(sessionId)}/complete`, { method: "POST", token });


export type Gift = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  type: string;
  pointsAwarded: number;
  starsAwarded: number;
};

export type UserGift = {
  id: string;
  awardedAt: string;
  isViewed: boolean;
  gift: Gift;
};

export type UserGiftsResponse = {
  success: true;
  userGifts: UserGift[];
  total: number;
  newCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const getUserGifts = (userId: string | number, token: string, page = 1, limit = 20) =>
  request<UserGiftsResponse>(`/users/${encodeURIComponent(String(userId))}/gifts?page=${page}&limit=${limit}`, { token });

export const getAllUserGifts = async (userId: string | number, token: string) => {
  const firstPage = await getUserGifts(userId, token, 1, 100);
  if (firstPage.totalPages <= 1) return firstPage.userGifts;
  const remaining = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getUserGifts(userId, token, index + 2, 100),
    ),
  );
  return [...firstPage.userGifts, ...remaining.flatMap((page) => page.userGifts)];
};

export const getUserGift = (userId: string | number, userGiftId: string, token: string) =>
  request<{ success: true; userGift: UserGift }>(`/users/${encodeURIComponent(String(userId))}/gifts/${encodeURIComponent(userGiftId)}`, { token });

export const markUserGiftViewed = (userId: string | number, userGiftId: string, token: string) =>
  request<{ success: true; userGift: UserGift }>(`/users/${encodeURIComponent(String(userId))}/gifts/${encodeURIComponent(userGiftId)}/view`, { method: "PATCH", token });

export type ChallengeType = "DAILY" | "WEEKLY" | "SPECIAL" | "SPEED" | "PERFECT";

export type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  type: ChallengeType;
  gradeId?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  targetQuestions: number;
  timeLimit?: number | null;
  pointsReward: number;
  starsReward: number;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
};

export type UserChallenge = {
  id: string;
  userId: string;
  challengeId: string;
  selectedGradeSubjectId?: string | null;
  periodKey: string;
  questionsAnswered: number;
  correctAnswers: number;
  completed: boolean;
  claimed: boolean;
  failed: boolean;
  completedAt?: string | null;
  pointsEarned: number;
  starsEarned: number;
  startedAt: string;
  updatedAt: string;
  challenge: Challenge;
};

export type ChallengeListResponse = {
  success: true;
  challenges: Challenge[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UserChallengesResponse = {
  success: true;
  userChallenges: UserChallenge[];
};

export type UserChallengeProgressInput = {
  questionsAnswered?: number;
  correctAnswers?: number;
  selectedGradeSubjectId?: string;
};

export const getChallenges = (query: {
  type?: ChallengeType;
  gradeId?: string | number;
  subjectId?: string | number;
  topicId?: string | number;
  page?: number;
  limit?: number;
} = {}) => {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  const suffix = search.toString();
  return request<ChallengeListResponse>(`/challenges${suffix ? `?${suffix}` : ""}`);
};

export const joinChallenge = (challengeId: string, token: string) =>
  request<{ success: true; message: string; userChallenge: UserChallenge }>(
    `/challenges/${encodeURIComponent(challengeId)}/join`,
    { method: "POST", token },
  );

export const getUserChallenges = (token: string) =>
  request<UserChallengesResponse>("/user-challenges", { token });

export const claimUserChallenge = (userChallengeId: string, token: string) =>
  request<{ success: true; message: string; userChallenge: UserChallenge }>(
    `/user-challenges/${encodeURIComponent(userChallengeId)}/claim`,
    { method: "POST", token },
  );

export const updateUserChallengeProgress = (
  userChallengeId: string,
  body: UserChallengeProgressInput,
  token: string,
) => request<{ success: true; message: string; userChallenge: UserChallenge }>(
  `/user-challenges/${encodeURIComponent(userChallengeId)}/progress`,
  { method: "PATCH", body, token },
);

export default {
  API_BASE,
  request,
  getPlayers,
  getUsers,
  getUserMe,
  getUserById,
  updateUserAccount,
  postAuthLogin,
  getAuthToken,
  postAuthRegister,
  postUserGameProfile,
  getMyStreak,
  postQuestionAttempt,
  getGrades,
  getGradeSubjects,
  getGradeSubjectLevels,
  getUserLevelProgress,
  postUserLevelProgress,
  updateUserLevelProgress,
  getLevelQuestions,
  getChallenges,
  joinChallenge,
  getUserChallenges,
  claimUserChallenge,
  updateUserChallengeProgress,
};
