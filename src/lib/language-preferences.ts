import AsyncStorage from "@react-native-async-storage/async-storage";

export type KidoLanguage = "EN" | "SW";

export const KIDO_LANGUAGE_KEY = "kido.language";

export const getKidoLanguage = async (): Promise<KidoLanguage> => {
  try {
    return (await AsyncStorage.getItem(KIDO_LANGUAGE_KEY)) === "SW" ? "SW" : "EN";
  } catch {
    return "EN";
  }
};
