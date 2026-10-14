import AsyncStorage from "@react-native-async-storage/async-storage";

export const MAX_PLAYER_LIVES = 3;
export const PLAYER_LIFE_INTERVAL_MS = 60_000;

export type PlayerLivesState = {
  lives: number;
  nextLifeAt: string | null;
};

const storageKey = (userKey: string) => `kido.playerLives.${userKey}`;

const normalize = (value: unknown): PlayerLivesState | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PlayerLivesState>;
  if (!Number.isFinite(record.lives)) return null;
  const lives = Math.max(0, Math.min(MAX_PLAYER_LIVES, Math.floor(Number(record.lives))));
  const timestamp = record.nextLifeAt ? new Date(record.nextLifeAt).getTime() : NaN;
  return {
    lives,
    nextLifeAt: lives < MAX_PLAYER_LIVES && Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString()
      : null,
  };
};

export const recoverPlayerLives = (state: PlayerLivesState, now = Date.now()): PlayerLivesState => {
  if (state.lives >= MAX_PLAYER_LIVES) return { lives: MAX_PLAYER_LIVES, nextLifeAt: null };
  if (!state.nextLifeAt) return state;
  const deadline = new Date(state.nextLifeAt).getTime();
  if (!Number.isFinite(deadline) || deadline > now) return state;

  const recovered = Math.floor((now - deadline) / PLAYER_LIFE_INTERVAL_MS) + 1;
  const lives = Math.min(MAX_PLAYER_LIVES, state.lives + recovered);
  return {
    lives,
    nextLifeAt: lives >= MAX_PLAYER_LIVES
      ? null
      : new Date(deadline + recovered * PLAYER_LIFE_INTERVAL_MS).toISOString(),
  };
};

export const loadPlayerLives = async (userKey: string): Promise<PlayerLivesState> => {
  const stored = await AsyncStorage.getItem(storageKey(userKey));
  const parsed = stored ? normalize(JSON.parse(stored)) : null;
  const state = recoverPlayerLives(parsed ?? { lives: MAX_PLAYER_LIVES, nextLifeAt: null });
  if (!parsed || state.lives !== parsed.lives || state.nextLifeAt !== parsed.nextLifeAt) {
    await savePlayerLives(userKey, state);
  }
  return state;
};

export const savePlayerLives = async (userKey: string, state: PlayerLivesState): Promise<void> => {
  const normalized = normalize(state) ?? { lives: MAX_PLAYER_LIVES, nextLifeAt: null };
  await AsyncStorage.setItem(storageKey(userKey), JSON.stringify(normalized));
};

export const consumePlayerLife = (state: PlayerLivesState, now = Date.now()): PlayerLivesState => {
  const recovered = recoverPlayerLives(state, now);
  if (recovered.lives <= 0) return recovered;
  const lives = recovered.lives - 1;
  return {
    lives,
    nextLifeAt: lives < MAX_PLAYER_LIVES
      ? recovered.nextLifeAt ?? new Date(now + PLAYER_LIFE_INTERVAL_MS).toISOString()
      : null,
  };
};
