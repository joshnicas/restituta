import { Platform } from "react-native";

const envBase =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_API_BASE) ||
  (typeof process !== "undefined" && (process as any).env?.API_BASE) ||
  (typeof globalThis !== "undefined" && (globalThis as any).API_BASE);

function makeBase(): string {
  const base = envBase?.trim();

  if (base) {
    return base.replace(/\/+$/, "");
  }

  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8000";
    }

    return "http://localhost:8000";
  }

  throw new Error(
    "EXPO_PUBLIC_API_BASE is not configured. Set it before building Kido."
  );
}

export const API_BASE = makeBase();

export default { API_BASE };