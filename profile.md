import { useAudioPlayer } from "expo-audio";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SettingsCard from "../components/settings-card";

const panelDropSound = require("../assets/sound.effects/stretch-rubber-rope.mp3");
const popSound = require("../assets/sound.effects/pop.mp3");

export default function Profile() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const panelDrop = useRef(new Animated.Value(-420)).current;
  const panelDropPlayer = useAudioPlayer(panelDropSound);
  const popPlayer = useAudioPlayer(popSound);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });
  const compactLayout = width < 380;
  const webPanelStyles = isWeb
    ? {
        cardWrap: {
          width: "100%",
          maxWidth: 520,
          marginLeft: 0,
          marginTop: "-15%",
        },
        panel: {
          top: 0,
        },
        panelImage: {
          height: "100%",
        },
      }
    : {
        cardWrap: {
          width: "110%",
          maxWidth: 680,
          marginLeft: "-5%",
          marginTop: "-15%",
        },
        panel: {
          top: "-19%",
        },
        panelImage: {
          height: "150%",
        },
      };

  const webContentStyles = isWeb
    ? {
        panelLeft: {
          top: "54%",
          left: "12%",
          width: "42%",
        },
        panelRight: {
          top: "47%",
          left: "63%",
          width: "24%",
        },
      }
    : {};

  const playPopSound = () => {
    popPlayer.seekTo(0);
    popPlayer.play();
  };

  useEffect(() => {
    panelDropPlayer.seekTo(0);
    panelDropPlayer.play();

    Animated.spring(panelDrop, {
      toValue: 0,
      stiffness: 90,
      damping: 18,
      mass: 1.6,
      useNativeDriver: true,
    }).start();
  }, [panelDrop, panelDropPlayer]);

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" color="#fff" />;
  }

  return (
    <ImageBackground
      source={require("../assets/profile/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header} pointerEvents="box-none">
          <Pressable
            style={styles.backButton}
            hitSlop={12}
            onPress={() => {
              playPopSound();
              router.replace("/home");
            }}
          >
            <Text style={styles.title}>Back</Text>
          </Pressable>

          <Pressable
            style={styles.closeButton}
            accessibilityLabel="Profile settings"
            onPress={() => {
              playPopSound();
              setSettingsVisible(true);
            }}
          >
            <Image
              source={require("../assets/settings.png")}
              style={styles.settingsIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        <SettingsCard
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />

        <Animated.View
          style={[
            styles.cardWrap,
            webPanelStyles.cardWrap,
            {
              transform: [{ translateY: panelDrop }],
            },
          ]}
        >
          <ImageBackground
            source={require("../assets/profile/Page.png")}
            style={[
              styles.panel,
              webPanelStyles.panel,
              compactLayout && styles.panelCompact,
            ]}
            imageStyle={[styles.panelImage, webPanelStyles.panelImage]}
            resizeMode="stretch"
          >
            <View style={styles.panelContent}>
              <View style={[styles.panelLeft, webContentStyles.panelLeft]}>
                <View style={styles.statsGrid}>
                  <View
                    style={[
                      styles.statCard,
                      compactLayout && styles.statCardCompact,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statNumber,
                        compactLayout && styles.statNumberCompact,
                      ]}
                    >
                      128
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        compactLayout && styles.statLabelCompact,
                      ]}
                    >
                      Points
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statCard,
                      compactLayout && styles.statCardCompact,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statNumber,
                        compactLayout && styles.statNumberCompact,
                      ]}
                    >
                      14
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        compactLayout && styles.statLabelCompact,
                      ]}
                    >
                      Badges
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statCard,
                      compactLayout && styles.statCardCompact,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statNumber,
                        compactLayout && styles.statNumberCompact,
                      ]}
                    >
                      8
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        compactLayout && styles.statLabelCompact,
                      ]}
                    >
                      Streak
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statCard,
                      compactLayout && styles.statCardCompact,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statNumber,
                        compactLayout && styles.statNumberCompact,
                      ]}
                    >
                      5
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        compactLayout && styles.statLabelCompact,
                      ]}
                    >
                      Level Explorer
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.panelRight,
                  webContentStyles.panelRight,
                  compactLayout && styles.panelRightCompact,
                ]}
              >
                <Pressable
                  style={[
                    styles.avatarFrame,
                    compactLayout && styles.avatarFrameCompact,
                  ]}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => {
                    playPopSound();
                    router.push("/avatar");
                  }}
                >
                  <Image
                    source={require("../assets/profile/monkey.png")}
                    style={[
                      styles.avatarImage,
                      compactLayout && styles.avatarImageCompact,
                    ]}
                    resizeMode="contain"
                  />
                  <View style={styles.avatarinfo}>
                    <Text style={styles.avatarName}>Ava</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
    zIndex: 10,
    elevation: 10,
  },
  title: {
    fontFamily: "FredokaBold",
    fontSize: 30,
    color: "#fff",
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(75, 91, 87, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  closeButtonText: {
    fontFamily: "FredokaBold",
    fontSize: 28,
    color: "#fff",
    lineHeight: 32,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  settingsIcon: {
    width: 22,
    height: 22,
    tintColor: "#fff",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 32,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#f8d66b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  name: {
    fontFamily: "FredokaBold",
    fontSize: 30,
    color: "#fff",
  },
  level: {
    fontFamily: "FredokaRegular",
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
    marginBottom: 28,
  },
  statsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  cardWrap: {
    width: "110%",
    maxWidth: 680,
    marginLeft: "-5%",
    marginTop: "-15%",
    marginBottom: 18,
    alignSelf: "center",
    zIndex: 0,
  },
  panel: {
    width: "100%",
    aspectRatio: 3574 / 4060,
    position: "relative",
    top: "-19%",
  },
  panelCompact: {
    aspectRatio: 3574 / 4060,
  },
  panelImage: {
    borderRadius: 24,
    height: "150%",
    width: "100%",
  },
  panelContent: {
    ...StyleSheet.absoluteFillObject,
  },
  panelLeft: {
    position: "relative",
    left: "10%",
    top: "220%",
    width: "45%",
    bottom: "12%",
    justifyContent: "center",
  },
  panelRight: {
    position: "absolute",
    left: "63%",
    top: "270%",
    width: "23%",
    bottom: "12%",
    alignItems: "center",
    justifyContent: "center",
  },
  panelRightCompact: {
    left: "63%",
    width: "24%",
  },
  statsGrid: {
    gap: 8,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: "rgba(255, 248, 221, 0.84)",
    borderWidth: 1,
    borderColor: "rgba(128, 86, 30, 0.16)",
    shadowColor: "#8a5a16",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardCompact: {
    minHeight: 31,
    paddingHorizontal: 8,
  },
  statNumber: {
    fontFamily: "FredokaBold",
    color: "#7b4a14",
    fontSize: 15,
  },
  statNumberCompact: {
    fontSize: 16,
  },
  statLabel: {
    fontFamily: "FredokaMedium",
    color: "#8d5c1d",
    fontSize: 9,
  },
  statLabelCompact: {
    fontSize: 10,
  },
  avatarFrame: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 221, 140, 0.95)",
    marginBottom: 10,
    shadowColor: "#7b4a14",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarFrameCompact: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  avatarImageCompact: {
    width: 58,
    height: 58,
  },
  avatarinfo: {
    backgroundColor: "rgba(255, 248, 221, 0.84)",
    borderRadius: 12,
    top: "50%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(128, 86, 30, 0.16)",
    shadowColor: "#8a5a16",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarName: {
    fontFamily: "FredokaBold",
    color: "#7a4b12",
    fontSize: 15,
    textAlign: "center",
  },
});
