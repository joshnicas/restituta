import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import BottomNavigation from "../components/bottom-navigation";
import { startAuthSessionKeeper } from "../lib/auth-session";
import { LanguageProvider } from "../lib/language-context";

export default function RootLayout() {
  useEffect(() => startAuthSessionKeeper(), []);
  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });
  const pathname = usePathname();
  const router = useRouter();
  const showNavigation =
    pathname === "/home" || pathname === "/land" || pathname === "/songs" || pathname === "/practice" || pathname === "/subscription";
  const activeItem =
    pathname === "/subscription" ? "subscribe" : pathname === "/practice" ? "practice" : pathname === "/land" ? "land" : pathname === "/songs" ? "songs" : "home";

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <>
        {Platform.OS === "web" ? (
          <Head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
            />
          </Head>
        ) : null}
        <View style={styles.root}>
          <Stack screenOptions={{ headerShown: false }} />
          {showNavigation && (
            <View style={styles.navigationLayer}>
              <BottomNavigation
                activeItem={activeItem}
                onSelect={(item) => {
                  if (item === "subscribe") {
                    router.push("/subscription");
                  } else if (item === "home") {
                    router.push("/home");
                  } else if (item === "land") {
                    router.push("/land");
                  } else if (item === "songs") {
                    router.push("/songs");
                  } else if (item === "practice") {
                    router.push("/practice");
                  }
                }}
              />
            </View>
          )}
        </View>
      </>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navigationLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 100,
    elevation: 100,
  },
});
