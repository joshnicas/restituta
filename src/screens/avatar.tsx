import AppText from "../components/app-text";
import { StyleSheet, View } from "react-native";

export default function AvatarScreen() {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Avatar</AppText>
      <AppText style={styles.subtitle}>Your avatar customizer is ready.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    color: "#334155",
    fontSize: 16,
  },
});
