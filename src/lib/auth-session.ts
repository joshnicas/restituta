import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { API_BASE } from "./config";

const REFRESH_TOKEN_KEY = "kido.refreshToken";
const DEVICE_ID_KEY = "kido.deviceId";
const MIGRATED_KEY = "kido.refreshSessionMigrated";
let refreshInFlight: Promise<string | null> | null = null;
let deviceIdInFlight: Promise<string> | null = null;

export async function getDeviceId(): Promise<string> {
  if (!deviceIdInFlight) {
    deviceIdInFlight = (async () => {
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = `kido-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    })().finally(() => { deviceIdInFlight = null; });
  }
  return deviceIdInFlight;
}

async function readRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    const secureValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return secureValue ?? await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY).catch(() => null);
  }
}

async function writeRefreshToken(value: string): Promise<void> {
  if (Platform.OS === "web") await AsyncStorage.setItem(REFRESH_TOKEN_KEY, value);
  else await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value).catch(() => AsyncStorage.setItem(REFRESH_TOKEN_KEY, value));
}

export async function persistAuthResponse(data: any): Promise<void> {
  const accessToken = data?.token ?? data?.accessToken;
  const refreshToken = data?.refreshToken;
  if (accessToken) await AsyncStorage.setItem("kido.authToken", String(accessToken));
  if (refreshToken) {
    await writeRefreshToken(String(refreshToken));
    await AsyncStorage.setItem(MIGRATED_KEY, "true");
  }
}

async function requestNewSession(path: string, body: unknown, headers: Record<string, string>): Promise<any | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function renewSession(): Promise<string | null> {
  const refreshToken = await readRefreshToken();
  let data: any;
  if (refreshToken) {
    data = await requestNewSession("/users/refresh", { refreshToken }, {});
  } else {
    // One-time compatibility upgrade for installations that predate refresh sessions.
    const migrated = await AsyncStorage.getItem(MIGRATED_KEY);
    const userID = await AsyncStorage.getItem("kido.userId");
    if (migrated || !userID) return null;
    const deviceId = await getDeviceId();
    data = await requestNewSession("/users/login", { userID }, { "X-Device-ID": deviceId });
  }
  if (!data?.token || !data?.refreshToken) return null;
  await persistAuthResponse(data);
  return String(data.token);
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = renewSession().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export function startAuthSessionKeeper(): () => void {
  const refresh = () => { void refreshAccessToken().catch(() => null); };
  const interval = setInterval(refresh, 7 * 60 * 1000);
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") refresh();
  });
  return () => { clearInterval(interval); subscription.remove(); };
}

export async function logoutAuthSession(): Promise<void> {
  const refreshToken = await readRefreshToken();
  if (refreshToken) await requestNewSession("/users/logout", { refreshToken }, {});
  if (Platform.OS === "web") await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
  await AsyncStorage.multiRemove(["kido.authToken", REFRESH_TOKEN_KEY]);
  await AsyncStorage.setItem(MIGRATED_KEY, "true");
}
