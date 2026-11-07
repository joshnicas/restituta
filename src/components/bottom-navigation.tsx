import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import AppText from "./app-text";

type BottomNavigationProps = {
  onSelect?: (
    item: "subscribe" | "home" | "practice" | "land" | "songs",
  ) => void;
  activeItem?: "subscribe" | "home" | "practice" | "land" | "songs";
};

declare global {
  interface Window {
    kidoDesktop?: { quit: () => void };
  }
}

const items = [
  {
    key: "subscribe" as const,
    label: "Subscribe",
    source: require("../assets/debit-payment.png"),
  },
  {
    key: "practice" as const,
    label: "Practice",
    source: require("../assets/workout.png"),
  },
  {
    key: "home" as const,
    label: "Home",
    source: require("../assets/3d-house.png"),
  },
  {
    key: "songs" as const,
    label: "Songs",
    source: require("../assets/drum.png"),
  },
  {
    key: "land" as const,
    label: "Land",
    source: require("../assets/3d-map.png"),
  },
];

const quitItem = {
  key: "quit" as const,
  label: "Quit",
  source: require("../assets/sad-network.png"),
};

export default function BottomNavigation({
  onSelect,
  activeItem = "home",
}: BottomNavigationProps) {
  const [quitDialog, setQuitDialog] = useState<"confirm" | "browser-blocked" | null>(null);
  const iconBounces = useRef<Animated.Value[]>([]).current;
  if (iconBounces.length !== items.length) {
    iconBounces.splice(
      0,
      iconBounces.length,
      ...items.map(() => new Animated.Value(1)),
    );
  }
  const isPhone = Platform.OS !== "web";
  const isWeb = Platform.OS === "web";
  const visibleItems = isWeb ? [...items, quitItem] : items;

  const quit = () => {
    setQuitDialog("confirm");
  };

  const confirmQuit = () => {
    if (window.kidoDesktop) {
      window.kidoDesktop.quit();
      return;
    }

    window.close();
    window.setTimeout(() => {
      if (!window.closed) setQuitDialog("browser-blocked");
    }, 50);
  };

  useEffect(() => {
    const animations = iconBounces.map((bounce, index) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(index * 220),
          Animated.timing(bounce, {
            toValue: 1.14,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.spring(bounce, {
            toValue: 1,
            friction: 4,
            tension: 130,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
        ]),
      );

      animation.start();
      return animation;
    });

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [iconBounces]);

  return (
    <>
    <View style={[styles.bar, isPhone && styles.phoneBar]}>
      {visibleItems.map((item, index) => {
        const isActive = item.key === activeItem;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => item.key === "quit" ? quit() : onSelect?.(item.key)}
            style={[styles.item, isActive && styles.activeItem]}
          >
            <View style={[styles.iconBubble, isActive && styles.activeBubble]}>
              <Animated.Image
                source={item.source}
                resizeMode="contain"
                style={[
                  styles.navIcon,
                  isPhone && styles.phoneNavIcon,
                  item.key === "home" && styles.homeNavIcon,
                  { transform: [{ scale: iconBounces[index] }] },
                ]}
              />
            </View>
            <AppText style={[styles.label, isActive && styles.activeLabel]}>
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
    <Modal
      transparent
      visible={quitDialog !== null}
      animationType="fade"
      onRequestClose={() => setQuitDialog(null)}
    >
      <View style={styles.quitMessageBackdrop}>
        <View style={styles.quitMessageCard}>
          <AppText style={styles.quitMessageTitle}>{quitDialog === "confirm" ? "Quit Kido?" : "Quit Kido"}</AppText>
          <AppText style={styles.quitMessageBody}>{quitDialog === "confirm" ? "Are you sure you want to quit?" : "Your browser won’t let this page close its own tab. You can close this tab to quit Kido."}</AppText>
          <View style={styles.quitMessageActions}>
            {quitDialog === "confirm" ? <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setQuitDialog(null)}
                style={[styles.quitMessageButton, styles.quitCancelButton]}
              ><AppText style={styles.quitMessageButtonText}>Cancel</AppText></Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmQuit}
                style={styles.quitMessageButton}
              ><AppText style={styles.quitMessageButtonText}>Yes, quit</AppText></Pressable>
            </> : <Pressable
              accessibilityRole="button"
              onPress={() => setQuitDialog(null)}
              style={styles.quitMessageButton}
            ><AppText style={styles.quitMessageButtonText}>Got it</AppText></Pressable>}
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "94%",
    maxWidth: 560,
    minHeight: 78,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 28,
    backgroundColor: "rgba(114, 114, 114, 0.86)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.62)",
    shadowColor: "#315b35",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  phoneBar: {
    marginBottom: 60,
  },
  item: {
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  homeItem: {
    marginTop: -16,
  },
  activeItem: {
    marginTop: -12,
  },
  iconBubble: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#fff5c7",
    borderWidth: 2,
    borderColor: "#e5b300",
  },
  homeBubble: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#f3bd35",
    borderColor: "#fff4bd",
    shadowColor: "#8c5d00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 4,
    elevation: 5,
  },
  activeBubble: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#f3bd35",
    borderColor: "#fff4bd",
    shadowColor: "#8c5d00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 4,
    elevation: 5,
  },
  navIcon: {
    width: 30,
    height: 30,
  },
  phoneNavIcon: {
    width: 42,
    height: 42,
  },
  homeNavIcon: {
    width: 48,
    height: 48,
  },
  label: {
    fontFamily: "FredokaBold",
    fontSize: 11,
    color: "#ffffff",
  },
  homeLabel: {
    color: "#fff4bd",
  },
  activeLabel: {
    color: "#fff4bd",
  },
  quitMessageBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 24,
  },
  quitMessageCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    padding: 24,
    borderRadius: 22,
    backgroundColor: "#fffaf0",
  },
  quitMessageTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 24,
    marginBottom: 8,
  },
  quitMessageBody: {
    color: "#654d2d",
    fontFamily: "FredokaMedium",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
  quitMessageButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#f3bd35",
  },
  quitMessageButtonText: {
    color: "#3d2d12",
    fontFamily: "FredokaBold",
    fontSize: 16,
  },
  quitMessageActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 18,
  },
  quitCancelButton: {
    backgroundColor: "#e9dfcb",
  },
});
