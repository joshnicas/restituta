import AppText from "./app-text";
import { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

type BottomNavigationProps = {
  onSelect?: (
    item: "subscribe" | "home" | "practice" | "land" | "songs",
  ) => void;
  activeItem?: "subscribe" | "home" | "practice" | "land" | "songs";
};

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

export default function BottomNavigation({
  onSelect,
  activeItem = "home",
}: BottomNavigationProps) {
  const iconBounces = useRef<Animated.Value[]>([]).current;
  if (iconBounces.length !== items.length) {
    iconBounces.splice(
      0,
      iconBounces.length,
      ...items.map(() => new Animated.Value(1)),
    );
  }
  const isPhone = Platform.OS !== "web";

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
    <View style={styles.bar}>
      {items.map((item, index) => {
        const isActive = item.key === activeItem;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => onSelect?.(item.key)}
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
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "94%",
    maxWidth: 560,
    minHeight: 78,
    marginBottom: 60,
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
});
