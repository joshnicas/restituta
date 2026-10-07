import { Platform } from "react-native";

const DEFAULT_PORT = 8000;

// EXPO_PUBLIC_API_BASE is bundled into the client; it must never contain secrets.
const envBase =
  (typeof process !== "undefined" &&
    (process as any).env &&
    process.env.EXPO_PUBLIC_API_BASE) ||
  (typeof process !== "undefined" && (process as any).env?.API_BASE) ||
  (typeof globalThis !== "undefined" && (globalThis as any).API_BASE);

function makeBase() {
  if (envBase) return envBase;

  // Android emulator should use 10.0.2.2 instead of localhost.
  // This special IP routes to the host machine's localhost.
  if (Platform.OS === "android") {
    return `http://192.168.1.156:${DEFAULT_PORT}`;
  }

  // Default to localhost for iOS, web and other platforms
  return `http://localhost:${DEFAULT_PORT}`;
}

export const API_BASE = makeBase();

export default { API_BASE };
