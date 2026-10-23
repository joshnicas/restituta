import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  useWindowDimensions,
  View,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface SkeletonBlockProps {
  width?: number | `${number}%` | "auto";
  height: number | `${number}%`;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  pulseAnim: Animated.Value;
  color?: string;
}

export function SkeletonBlock({
  width,
  height,
  borderRadius = 10,
  style,
  pulseAnim,
  color = "#E5DCCE",
}: SkeletonBlockProps) {
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.92],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

export default function WelcomeSkeleton() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 960;
  const isTablet = width >= 640;

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navbar Skeleton */}
        <View style={[styles.navbar, isLargeScreen && styles.navbarWide]}>
          <View style={styles.navLogoContainer}>
            <SkeletonBlock
              width={108}
              height={34}
              borderRadius={12}
              pulseAnim={pulseAnim}
            />
          </View>
          <View style={styles.navActions}>
            {/* Lang Pill */}
            <SkeletonBlock
              width={96}
              height={32}
              borderRadius={16}
              pulseAnim={pulseAnim}
            />
            {/* Sound Button */}
            <SkeletonBlock
              width={38}
              height={38}
              borderRadius={19}
              pulseAnim={pulseAnim}
            />
            {/* Play Button */}
            <SkeletonBlock
              width={96}
              height={36}
              borderRadius={18}
              color="#FDE68A"
              pulseAnim={pulseAnim}
            />
          </View>
        </View>

        {/* Hero Section Skeleton */}
        <View style={[styles.heroSection, isLargeScreen && styles.heroSectionWide]}>
          {/* Decorative Sun placeholder */}
          <View style={styles.sunDecor}>
            <SkeletonBlock
              width={76}
              height={76}
              borderRadius={38}
              color="#FEF08A"
              pulseAnim={pulseAnim}
            />
          </View>

          <View style={[styles.heroContentGrid, isLargeScreen && styles.heroContentGridWide]}>
            {/* Left Column: Headlines, CTA, Squad */}
            <View style={[styles.heroLeftCol, isLargeScreen && styles.heroLeftColWide]}>
              {/* Badge Pill */}
              <SkeletonBlock
                width={260}
                height={28}
                borderRadius={14}
                color="#FEF3C7"
                pulseAnim={pulseAnim}
                style={{ marginBottom: 14 }}
              />

              {/* Big Title Lines */}
              <SkeletonBlock
                width={280}
                height={40}
                borderRadius={12}
                pulseAnim={pulseAnim}
                style={{ marginBottom: 10 }}
              />

              {/* Subtitle Lines */}
              <SkeletonBlock
                width="92%"
                height={16}
                borderRadius={8}
                pulseAnim={pulseAnim}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBlock
                width="78%"
                height={16}
                borderRadius={8}
                pulseAnim={pulseAnim}
                style={{ marginBottom: 22 }}
              />

              {/* Action Button */}
              <SkeletonBlock
                width={210}
                height={54}
                borderRadius={27}
                color="#FBBF24"
                pulseAnim={pulseAnim}
                style={{ marginBottom: 20 }}
              />

              {/* Squad Lineup Container */}
              <View style={styles.heroAvatarsRowWrapper}>
                <SkeletonBlock
                  width={190}
                  height={14}
                  borderRadius={7}
                  pulseAnim={pulseAnim}
                  style={{ marginBottom: 12 }}
                />
                <View style={styles.avatarLineupRow}>
                  {[1, 2, 3, 4].map((id) => (
                    <View key={id} style={styles.heroThumbWrap}>
                      <SkeletonBlock
                        width={50}
                        height={50}
                        borderRadius={25}
                        pulseAnim={pulseAnim}
                      />
                      <SkeletonBlock
                        width={46}
                        height={12}
                        borderRadius={6}
                        pulseAnim={pulseAnim}
                        style={{ marginTop: 6 }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Right Column: Smartphone Mockup Frame Skeleton */}
            <View style={[styles.heroRightCol, isLargeScreen && styles.heroRightColWide]}>
              <View style={styles.phoneShowcaseContainer}>
                {/* Floating Badges */}
                <View style={[styles.floatingStatBadge, styles.floatingStatTopLeft]}>
                  <SkeletonBlock width={24} height={24} borderRadius={12} pulseAnim={pulseAnim} />
                  <View style={{ gap: 4 }}>
                    <SkeletonBlock width={56} height={12} borderRadius={6} pulseAnim={pulseAnim} />
                    <SkeletonBlock width={42} height={10} borderRadius={5} pulseAnim={pulseAnim} />
                  </View>
                </View>

                <View style={[styles.floatingStatBadge, styles.floatingStatBottomRight]}>
                  <SkeletonBlock width={24} height={24} borderRadius={12} pulseAnim={pulseAnim} />
                  <View style={{ gap: 4 }}>
                    <SkeletonBlock width={52} height={12} borderRadius={6} pulseAnim={pulseAnim} />
                    <SkeletonBlock width={46} height={10} borderRadius={5} pulseAnim={pulseAnim} />
                  </View>
                </View>

                {/* Smartphone Device Frame */}
                <View style={styles.phoneFrame}>
                  <View style={styles.phoneSpeaker} />
                  {/* Screen Content Skeleton */}
                  <View style={styles.phoneScreenContent}>
                    {/* Top status bar items */}
                    <View style={styles.mockPhoneTopBar}>
                      <SkeletonBlock width={36} height={36} borderRadius={18} color="#D1D5DB" pulseAnim={pulseAnim} />
                      <SkeletonBlock width={74} height={24} borderRadius={12} color="#D1D5DB" pulseAnim={pulseAnim} />
                      <SkeletonBlock width={32} height={32} borderRadius={16} color="#D1D5DB" pulseAnim={pulseAnim} />
                    </View>

                    {/* Stepping stones simulation */}
                    <View style={styles.mockPhoneSteppingStones}>
                      <SkeletonBlock width={54} height={26} borderRadius={13} color="#CBD5E1" pulseAnim={pulseAnim} style={{ alignSelf: "center", marginBottom: 28 }} />
                      <SkeletonBlock width={64} height={30} borderRadius={15} color="#CBD5E1" pulseAnim={pulseAnim} style={{ alignSelf: "flex-start", marginLeft: 34, marginBottom: 28 }} />
                      <SkeletonBlock width={72} height={32} borderRadius={16} color="#CBD5E1" pulseAnim={pulseAnim} style={{ alignSelf: "flex-end", marginRight: 34, marginBottom: 32 }} />
                      <SkeletonBlock width={96} height={38} borderRadius={19} color="#CBD5E1" pulseAnim={pulseAnim} style={{ alignSelf: "center" }} />
                    </View>

                    {/* Big play button skeleton at bottom */}
                    <SkeletonBlock width={140} height={42} borderRadius={21} color="#FDE68A" pulseAnim={pulseAnim} style={{ alignSelf: "center", marginBottom: 14 }} />

                    {/* Bottom nav tabs simulation */}
                    <View style={styles.mockPhoneBottomNav}>
                      <SkeletonBlock width={30} height={30} borderRadius={15} color="#CBD5E1" pulseAnim={pulseAnim} />
                      <SkeletonBlock width={30} height={30} borderRadius={15} color="#CBD5E1" pulseAnim={pulseAnim} />
                      <SkeletonBlock width={36} height={36} borderRadius={18} color="#93C5FD" pulseAnim={pulseAnim} />
                      <SkeletonBlock width={30} height={30} borderRadius={15} color="#CBD5E1" pulseAnim={pulseAnim} />
                      <SkeletonBlock width={30} height={30} borderRadius={15} color="#CBD5E1" pulseAnim={pulseAnim} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats Highlight Row Skeleton */}
          <View style={styles.highlightRow}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.highlightCard}>
                <SkeletonBlock width={28} height={28} borderRadius={14} pulseAnim={pulseAnim} style={{ marginBottom: 6 }} />
                <SkeletonBlock width={64} height={18} borderRadius={9} pulseAnim={pulseAnim} style={{ marginBottom: 4 }} />
                <SkeletonBlock width={78} height={12} borderRadius={6} pulseAnim={pulseAnim} />
              </View>
            ))}
          </View>
        </View>

        {/* Section 2: Screenshot Gallery Skeleton */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrap}>
            <SkeletonBlock width={180} height={24} borderRadius={12} color="#FEF3C7" pulseAnim={pulseAnim} style={{ marginBottom: 10 }} />
            <SkeletonBlock width={290} height={30} borderRadius={10} pulseAnim={pulseAnim} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={380} height={16} borderRadius={8} pulseAnim={pulseAnim} style={{ marginBottom: 16 }} />

            {/* Tab pills */}
            <View style={styles.tabsRow}>
              <SkeletonBlock width={120} height={32} borderRadius={16} color="#FDE68A" pulseAnim={pulseAnim} />
              <SkeletonBlock width={120} height={32} borderRadius={16} pulseAnim={pulseAnim} />
              <SkeletonBlock width={120} height={32} borderRadius={16} pulseAnim={pulseAnim} />
            </View>
          </View>

          {/* 3 Phones Preview */}
          <View style={[styles.screensRow, isLargeScreen && styles.screensRowWide]}>
            {[1, 2, 3].map((item) => (
              <View
                key={item}
                style={[
                  styles.screenShowcaseCard,
                  isTablet && styles.screenShowcaseCardTablet,
                  isLargeScreen && styles.screenShowcaseCardWide,
                ]}
              >
                <View style={styles.deviceFrame}>
                  <View style={styles.phoneSpeaker} />
                  <View style={styles.deviceScreenInner}>
                    <SkeletonBlock width="100%" height="100%" borderRadius={24} color="#E2D9CC" pulseAnim={pulseAnim} />
                  </View>
                </View>

                {/* Device Info Box Skeleton */}
                <View style={styles.deviceInfoBox}>
                  <SkeletonBlock width={94} height={20} borderRadius={8} pulseAnim={pulseAnim} style={{ marginBottom: 8 }} />
                  <SkeletonBlock width={170} height={20} borderRadius={8} pulseAnim={pulseAnim} style={{ marginBottom: 6 }} />
                  <SkeletonBlock width="88%" height={14} borderRadius={6} pulseAnim={pulseAnim} style={{ marginBottom: 4 }} />
                  <SkeletonBlock width="72%" height={14} borderRadius={6} pulseAnim={pulseAnim} style={{ marginBottom: 12 }} />

                  <View style={styles.deviceFeatureList}>
                    <SkeletonBlock width={74} height={20} borderRadius={8} pulseAnim={pulseAnim} />
                    <SkeletonBlock width={84} height={20} borderRadius={8} pulseAnim={pulseAnim} />
                    <SkeletonBlock width={78} height={20} borderRadius={8} pulseAnim={pulseAnim} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 3: Meet the 4 Heroes Skeleton */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrap}>
            <SkeletonBlock width={150} height={24} borderRadius={12} color="#E0E7FF" pulseAnim={pulseAnim} style={{ marginBottom: 10 }} />
            <SkeletonBlock width={260} height={30} borderRadius={10} pulseAnim={pulseAnim} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={360} height={16} borderRadius={8} pulseAnim={pulseAnim} />
          </View>

          <View style={[styles.heroesGrid, isLargeScreen && styles.heroesGridWide]}>
            {[1, 2, 3, 4].map((id) => (
              <View
                key={id}
                style={[
                  styles.heroCardWrapper,
                  isTablet && styles.heroCardWrapperTablet,
                  isLargeScreen && styles.heroCardWrapperWide,
                ]}
              >
                <View style={styles.heroCard}>
                  {/* Hero Avatar Circle */}
                  <SkeletonBlock
                    width={110}
                    height={110}
                    borderRadius={55}
                    pulseAnim={pulseAnim}
                    style={{ marginBottom: 12, marginTop: 8 }}
                  />
                  <SkeletonBlock width={90} height={22} borderRadius={8} pulseAnim={pulseAnim} style={{ marginBottom: 6 }} />
                  <SkeletonBlock width={74} height={14} borderRadius={6} pulseAnim={pulseAnim} style={{ marginBottom: 8 }} />
                  <SkeletonBlock width={110} height={20} borderRadius={10} pulseAnim={pulseAnim} style={{ marginBottom: 10 }} />
                  <SkeletonBlock width="85%" height={14} borderRadius={6} pulseAnim={pulseAnim} style={{ marginBottom: 4 }} />
                  <SkeletonBlock width="65%" height={14} borderRadius={6} pulseAnim={pulseAnim} style={{ marginBottom: 14 }} />

                  {/* Skills row */}
                  <View style={{ width: "100%", gap: 4, marginBottom: 14 }}>
                    <SkeletonBlock width="100%" height={18} borderRadius={6} pulseAnim={pulseAnim} />
                    <SkeletonBlock width="100%" height={18} borderRadius={6} pulseAnim={pulseAnim} />
                  </View>

                  {/* Choose Button */}
                  <SkeletonBlock width="100%" height={40} borderRadius={16} color="#E2D9CC" pulseAnim={pulseAnim} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 4: Magical Lands Skeleton */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrap}>
            <SkeletonBlock width={150} height={24} borderRadius={12} color="#DCFCE7" pulseAnim={pulseAnim} style={{ marginBottom: 10 }} />
            <SkeletonBlock width={270} height={30} borderRadius={10} pulseAnim={pulseAnim} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={360} height={16} borderRadius={8} pulseAnim={pulseAnim} />
          </View>

          <View style={[styles.landsRow, isLargeScreen && styles.landsRowWide]}>
            {[1, 2].map((id) => (
              <View key={id} style={[styles.landCard, isLargeScreen && styles.landCardWide]}>
                <SkeletonBlock width="100%" height={190} borderRadius={0} pulseAnim={pulseAnim} />
                <View style={styles.landCardContent}>
                  <SkeletonBlock width={180} height={22} borderRadius={8} pulseAnim={pulseAnim} style={{ marginBottom: 10 }} />
                  <SkeletonBlock width="95%" height={14} borderRadius={6} pulseAnim={pulseAnim} style={{ marginBottom: 6 }} />
                  <SkeletonBlock width="80%" height={14} borderRadius={6} pulseAnim={pulseAnim} style={{ marginBottom: 14 }} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <SkeletonBlock width={80} height={22} borderRadius={10} pulseAnim={pulseAnim} />
                    <SkeletonBlock width={80} height={22} borderRadius={10} pulseAnim={pulseAnim} />
                    <SkeletonBlock width={80} height={22} borderRadius={10} pulseAnim={pulseAnim} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF8F0",
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Navbar
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(80, 54, 23, 0.08)",
    backgroundColor: "#FFFFFF",
  },
  navbarWide: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    borderRadius: 24,
    marginTop: 8,
    marginHorizontal: 16,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: "rgba(80, 54, 23, 0.08)",
  },
  navLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    position: "relative",
  },
  heroSectionWide: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingTop: 44,
  },
  sunDecor: {
    position: "absolute",
    top: 10,
    right: 24,
  },
  heroContentGrid: {
    flexDirection: "column",
    alignItems: "center",
  },
  heroContentGridWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32,
  },
  heroLeftCol: {
    width: "100%",
    alignItems: "center",
  },
  heroLeftColWide: {
    width: "54%",
    alignItems: "flex-start",
  },
  heroRightCol: {
    width: "100%",
    alignItems: "center",
    marginTop: 28,
  },
  heroRightColWide: {
    width: "42%",
    marginTop: 0,
  },

  // Squad box
  heroAvatarsRowWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  avatarLineupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  heroThumbWrap: {
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },

  // Phone Frame
  phoneShowcaseContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  phoneFrame: {
    width: 250,
    height: 520,
    borderRadius: 36,
    backgroundColor: "#1E293B",
    borderWidth: 8,
    borderColor: "#0F172A",
    overflow: "hidden",
    alignItems: "center",
  },
  phoneSpeaker: {
    width: 54,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#475569",
    marginTop: 6,
    marginBottom: 6,
  },
  phoneScreenContent: {
    width: "100%",
    height: 495,
    borderRadius: 26,
    backgroundColor: "#F1ECE1",
    padding: 12,
    justifyContent: "space-between",
  },
  mockPhoneTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  mockPhoneSteppingStones: {
    flex: 1,
    justifyContent: "center",
  },
  mockPhoneBottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  // Floating Badges
  floatingStatBadge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.35)",
    zIndex: 20,
  },
  floatingStatTopLeft: {
    top: 24,
    left: -24,
  },
  floatingStatBottomRight: {
    bottom: 40,
    right: -24,
  },

  // Highlights Row
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    width: "100%",
    marginTop: 26,
  },
  highlightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 120,
    borderWidth: 1.5,
    borderColor: "rgba(80, 54, 23, 0.1)",
  },

  // Section styling
  sectionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
  },
  sectionHeaderWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  // Screens Gallery
  screensRow: {
    flexDirection: "column",
    gap: 24,
    alignItems: "center",
  },
  screensRowWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  screenShowcaseCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(80, 54, 23, 0.08)",
  },
  screenShowcaseCardTablet: {
    width: "48%",
  },
  screenShowcaseCardWide: {
    width: "31.8%",
    maxWidth: 360,
  },
  deviceFrame: {
    width: 220,
    height: 470,
    borderRadius: 32,
    backgroundColor: "#1E293B",
    borderWidth: 7,
    borderColor: "#0F172A",
    overflow: "hidden",
    alignItems: "center",
    marginBottom: 16,
  },
  deviceScreenInner: {
    width: "100%",
    height: 446,
    borderRadius: 24,
    backgroundColor: "#E2D9CC",
  },
  deviceInfoBox: {
    width: "100%",
    alignItems: "center",
  },
  deviceFeatureList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },

  // Heroes Grid
  heroesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 18,
  },
  heroesGridWide: {
    justifyContent: "space-between",
  },
  heroCardWrapper: {
    width: "100%",
    maxWidth: 360,
  },
  heroCardWrapperTablet: {
    width: "47%",
  },
  heroCardWrapperWide: {
    width: "23.5%",
    maxWidth: 275,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "rgba(80, 54, 23, 0.1)",
  },

  // Lands
  landsRow: {
    flexDirection: "column",
    gap: 20,
  },
  landsRowWide: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  landCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(80, 54, 23, 0.1)",
  },
  landCardWide: {
    width: "48.5%",
  },
  landCardContent: {
    padding: 20,
  },
});
