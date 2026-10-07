import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "../components/app-text";
import { LanguageProvider } from "../lib/language-context";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/splash");
  }, [router]);

  return (
    <LanguageProvider>
      <View style={styles.container}>
        <AppText>Redirecting…</AppText>
      </View>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
