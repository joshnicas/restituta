import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const lands = [
  {
    key: "kilimanjaro",
    label: "Kilimanjaro",
    source: require("../assets/lands/kilimanjaro.png"),
  },
  {
    key: "mwanza",
    label: "Mwanza",
    source: require("../assets/lands/mwanza.png"),
  },
];

const SELECTED_LAND_KEY = "kido.selectedLand";

export default function Land() {
  const [selectedLand, setSelectedLand] = useState(lands[0]);
  const backgroundOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    backgroundOpacity.setValue(0);
    Animated.timing(backgroundOpacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [backgroundOpacity, selectedLand]);

  // load persisted selected land on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const key = await AsyncStorage.getItem(SELECTED_LAND_KEY);
        if (!mounted) return;
        const found = lands.find((l) => l.key === key) ?? lands[0];
        setSelectedLand(found);
        if (key !== found.key) await AsyncStorage.setItem(SELECTED_LAND_KEY, found.key);
      } catch {
        // ignore
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText style={styles.title}>Choose Your Land</AppText>
          <AppText style={styles.subtitle}>{selectedLand.label}</AppText>
        </View>

        <Animated.View style={[styles.preview, { opacity: backgroundOpacity }]}>
          <ImageBackground
            source={selectedLand.source}
            resizeMode="cover"
            style={styles.previewImage}
            imageStyle={styles.previewImageStyle}
          >
            <View style={styles.previewShade} />
            <View style={styles.previewCaption}>
              <AppText style={styles.previewEyebrow}>YOUR LAND</AppText>
              <AppText style={styles.previewTitle}>{selectedLand.label}</AppText>
            </View>
          </ImageBackground>
        </Animated.View>

        <View style={styles.selectorSection}>
          <View style={styles.selectorHeading}>
            <AppText style={styles.selectorTitle}>Lands</AppText>
            <AppText style={styles.selectorHint}>Choose a place to explore</AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selector}
          >
            {lands.map((land) => {
              const selected = land.key === selectedLand.key;

              return (
                <Pressable
                  key={land.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${land.label}`}
                  onPress={() => {
                    setSelectedLand(land);
                    try {
                      AsyncStorage.setItem(SELECTED_LAND_KEY, land.key);
                    } catch {
                      // ignore storage errors
                    }
                  }}
                  style={[styles.landCard, selected && styles.selectedLandCard]}
                >
                  <Image source={land.source} style={styles.landThumbnail} />
                  <View style={styles.landLabelRow}>
                    <AppText
                      style={[
                        styles.landLabel,
                        selected && styles.selectedLandLabel,
                      ]}
                    >
                      {land.label}
                    </AppText>
                    {selected && <AppText style={styles.selectedCheck}>✓</AppText>}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#8bd6ef",
  },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 126,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontFamily: "FredokaBold",
    fontSize: 28,
    color: "#3a2a1b",
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "FredokaMedium",
    fontSize: 15,
    color: "#746047",
  },
  preview: {
    width: "100%",
    height: 300,
    maxHeight: 360,
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 27,
    borderWidth: 3,
    borderColor: "#fff4d0",
    backgroundColor: "#fff4d0",
    marginBottom: 22,
  },
  previewImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  previewImageStyle: {
    borderRadius: 24,
  },
  previewShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38, 34, 23, 0.12)",
  },
  previewCaption: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "rgba(34, 31, 24, 0.56)",
  },
  previewEyebrow: {
    fontFamily: "FredokaBold",
    fontSize: 11,
    letterSpacing: 1,
    color: "#ffe9a8",
  },
  previewTitle: {
    marginTop: 2,
    fontFamily: "FredokaBold",
    fontSize: 24,
    color: "#ffffff",
  },
  selectorSection: {
    paddingTop: 16,
    paddingBottom: 8,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.48)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.72)",
  },
  selectorHeading: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectorTitle: {
    fontFamily: "FredokaBold",
    fontSize: 21,
    color: "#3a2a1b",
  },
  selectorHint: {
    marginTop: 1,
    fontFamily: "FredokaRegular",
    fontSize: 13,
    color: "#746047",
  },
  selector: {
    gap: 11,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  landCard: {
    width: 158,
    padding: 7,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#d6edf2",
  },
  selectedLandCard: {
    backgroundColor: "#fff4d0",
    borderColor: "#f4b942",
  },
  landThumbnail: {
    width: "100%",
    height: 86,
    borderRadius: 12,
    backgroundColor: "#e5f4f7",
  },
  landLabelRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  landLabel: {
    fontFamily: "FredokaBold",
    fontSize: 15,
    color: "#45331f",
  },
  selectedLandLabel: {
    color: "#614521",
  },
  selectedCheck: {
    color: "#478943",
    fontFamily: "FredokaBold",
    fontSize: 17,
  },
});
