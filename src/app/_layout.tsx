import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import BottomNavigation from "../components/bottom-navigation";
import { LanguageProvider } from "../lib/language-context";

export default function RootLayout() {
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
  },
});
