import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useDarkTheme() {
  const [darkTheme, setDarkTheme] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void AsyncStorage.getItem("kido.theme")
        .then((theme) => {
          if (active) setDarkTheme(theme === "dark");
        })
        .catch(() => {
          if (active) setDarkTheme(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return darkTheme;
}
