import AppText from "../components/app-text";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Play() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <AppText style={styles.text}>this is play screen</AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18, fontWeight: "700", color: "#333" },
});
