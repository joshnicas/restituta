import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import KidoAnimatedLogo from "../components/kido-animated-logo";
import PlayerAvatar from "../components/player-avatar";
import WelcomeSkeleton from "../components/welcome-skeleton";
import { useAudioPreferences } from "../lib/audio-preferences";
import { useKidoLanguage } from "../lib/language-context";
import { parseSelectedPlayer, type SelectedPlayer } from "../lib/selected-player";

// Audio & Visual Assets
const popSound = require("../assets/sound.effects/pop.mp3");
const logoImage = require("../assets/logo.png");
const starIcon = require("../assets/star.png");
const lightningIcon = require("../assets/lightning.png");
const fireIcon = require("../assets/fire.png");
const crownIcon = require("../assets/crown.png");
const giftIcon = require("../assets/gift.png");
const drumIcon = require("../assets/drum.png");
const mapIcon = require("../assets/3d-map.png");
const kilimanjaroImage = require("../assets/lands/kilimanjaro.png");
const mwanzaImage = require("../assets/lands/mwanza.png");

// User Provided Gameplay Screenshots
const homeAdventureScreenshot = require("../assets/screenshots/home-adventure.png");
const mwanzaLandScreenshot = require("../assets/screenshots/mwanza-land.png");
const kilimanjaroGameScreenshot = require("../assets/screenshots/kilimanjaro-game.png");

// Preload list for skeleton loader
const WELCOME_PRELOAD_ASSETS = [
  logoImage,
  starIcon,
  lightningIcon,
  fireIcon,
  crownIcon,
  giftIcon,
  drumIcon,
  mapIcon,
  kilimanjaroImage,
  mwanzaImage,
  homeAdventureScreenshot,
  mwanzaLandScreenshot,
  kilimanjaroGameScreenshot,
  require("../assets/players/profile.png"),
  require("../assets/players/profile2.png"),
  require("../assets/players/profile3.png"),
  require("../assets/players/profile4.png"),
];

interface HeroBuddy {
  id: SelectedPlayer;
  name: string;
  titleEn: string;
  titleSw: string;
  roleEn: string;
  roleSw: string;
  badge: string;
  catchphraseEn: string;
  catchphraseSw: string;
  accentColor: string;
  lightBg: string;
  borderColor: string;
  badgeBg: string;
  powersEn: string[];
  powersSw: string[];
}

const HEROES: HeroBuddy[] = [
  {
    id: 1,
    name: "Kelvin",
    titleEn: "The Math & Puzzle Wizard",
    titleSw: "Mchawi wa Hisabati na Mafumbo",
    roleEn: "Quick Thinker",
    roleSw: "Mfikiri wa Haraka",
    badge: "🔢 Number Master",
    catchphraseEn: "“Numbers are secret clues waiting to be unlocked!”",
    catchphraseSw: "“Nambari ni vidokezo vya siri vinavyosubiri kutatuliwa!”",
    accentColor: "#0284C7",
    lightBg: "#F0F9FF",
    borderColor: "#38BDF8",
    badgeBg: "#E0F2FE",
    powersEn: ["Math Battles", "Logic Puzzles", "Sharp Memory"],
    powersSw: ["Hisabati ya Kichwa", "Mafumbo ya Akili", "Kumbukumbu Nzuri"],
  },
  {
    id: 2,
    name: "Musa",
    titleEn: "The Fearless Explorer",
    titleSw: "Mvumbuzi Jasiri wa Asili",
    roleEn: "Nature Scout",
    roleSw: "Mpelelezi wa Mazingira",
    badge: "🧭 Brave Navigator",
    catchphraseEn: "“Let’s climb Mount Kilimanjaro and uncover secrets!”",
    catchphraseSw: "“Tupande Mlima Kilimanjaro na kugundua siri za asili!”",
    accentColor: "#059669",
    lightBg: "#ECFDF5",
    borderColor: "#34D399",
    badgeBg: "#D1FAE5",
    powersEn: ["Science & Nature", "Trail Navigation", "Bold Courage"],
    powersSw: ["Sayansi na Wanyama", "Mwelekeo wa Njia", "Ujasiri Mkuu"],
  },
  {
    id: 3,
    name: "Neema",
    titleEn: "The Song & Story Superstar",
    titleSw: "Nyota wa Nyimbo na Hadithi",
    roleEn: "Creative Star",
    roleSw: "Nyota Mbunifu",
    badge: "🎵 Melody Champion",
    catchphraseEn: "“Singing and dancing make every lesson super fun!”",
    catchphraseSw: "“Kuimba na kucheza hufanya kila somo kuwa na furaha!”",
    accentColor: "#D946EF",
    lightBg: "#FDF4FF",
    borderColor: "#F0ABFC",
    badgeBg: "#FAE8FF",
    powersEn: ["Catchy Songs", "Reading & Tales", "Joyful Rhymes"],
    powersSw: ["Nyimbo Tamu", "Kusoma na Hadithi", "Mashairi ya Furaha"],
  },
  {
    id: 4,
    name: "Aisha",
    titleEn: "The Lightning Streak Champion",
    titleSw: "Bingwa wa Kasi na Changamoto",
    roleEn: "Speed Legend",
    roleSw: "Bingwa wa Kasi",
    badge: "⚡ Streak Master",
    catchphraseEn: "“Keep your streak fire burning bright every day!”",
    catchphraseSw: "“Washa moto wa ushindi kila siku bila kukosa!”",
    accentColor: "#D97706",
    lightBg: "#FFFBEB",
    borderColor: "#FBBF24",
    badgeBg: "#FEF3C7",
    powersEn: ["Speed Rounds", "Daily Streaks", "Quick Reflexes"],
    powersSw: ["Changamoto za Kasi", "Mfululizo wa Siku", "Weledi wa Haraka"],
  },
];

interface ScreenshotItem {
  id: string;
  source: any;
  tagEn: string;
  tagSw: string;
  titleEn: string;
  titleSw: string;
  descEn: string;
  descSw: string;
  featuresEn: string[];
  featuresSw: string[];
  badgeBg: string;
  badgeColor: string;
}

const SCREENSHOTS: ScreenshotItem[] = [
  {
    id: "home",
    source: homeAdventureScreenshot,
    tagEn: "ADVENTURE HUB",
    tagSw: "KITOVU CHA SAFARI",
    titleEn: "Daily Stepping-Stone Path",
    titleSw: "Njia ya Mawe ya Hatua",
    descEn:
      "Walk the colourful stepping-stone trail, keep your weekday streak on fire, collect XP and stars, and meet friendly flying creatures!",
    descSw:
      "Tembea kwenye njia yenye mawe ya rangi, washa moto wa streak ya kila siku, jikusanyie nyota na pointi, na ufurahie wanyama wazuri!",
    featuresEn: ["🔥 Daily Fire Streak", "⭐ Star & XP Counters", "🦜 Animated Flying Parrot", "🎮 Big 3D Play Button"],
    featuresSw: ["🔥 Moto wa Streak ya Kila Siku", "⭐ Vihesabu vya Nyota na XP", "🦜 Kasuku Anayeruka kwa Uhai", "🎮 Kitufe Kikubwa cha 3D"],
    badgeBg: "#FEF3C7",
    badgeColor: "#B45309",
  },
  {
    id: "mwanza",
    source: mwanzaLandScreenshot,
    tagEn: "SCENIC PLAY LANDS",
    tagSw: "MAENEO YA KUTALII",
    titleEn: "Lake Victoria Mwanza Adventure",
    titleSw: "Safari ya Ziwa Victoria Mwanza",
    descEn:
      "Experience breathtaking Tanzanian landscapes! Island-hop on Lake Victoria with boats, pools, countdown challenge clocks, and 3-heart lives.",
    descSw:
      "Shuhudia uzuri wa asili ya Tanzania! Vumbua visiwa vya Ziwa Victoria ukiwa na mashua, saa ya kuhesabu sekunde, na maisha 3 ya mioyo.",
    featuresEn: ["🌊 Real Tanzanian Scenery", "⏱️ 50-Second Brain Rush", "❤️ 3-Hearts Game Life", "⛵ Island Exploration"],
    featuresSw: ["🌊 Mandhari Halisi ya Tanzania", "⏱️ Mbio za Sekunde 50", "❤️ Maisha 3 ya Mioyo", "⛵ Ugunduzi wa Visiwani"],
    badgeBg: "#DBEAFE",
    badgeColor: "#1D4ED8",
  },
  {
    id: "kilimanjaro",
    source: kilimanjaroGameScreenshot,
    tagEn: "VISUAL PUZZLES",
    tagSw: "MAFUMBO YA PICHA",
    titleEn: "Mount Kilimanjaro Treehouse",
    titleSw: "Mti wa Mafumbo Kilimanjaro",
    descEn:
      "Vibrant jungle treehouse puzzles! Kids identify everyday objects like spoons, cups, and plates with cheerful audio and instant rewards.",
    descSw:
      "Mafumbo ya kupendeza kwenye mti wa msituni! Watoto wanatambua vitu vya kila siku kama kijiko, kikombe na sahani kwa furaha tele.",
    featuresEn: ["🏡 Wooden Jungle Treehouse", "🥄 Real-World Object Cards", "🎉 Instant Reward Sounds", "📚 Nursery to Grade 6"],
    featuresSw: ["🏡 Mti wa Msituni wa Mbao", "🥄 Kadi za Picha Halisi", "🎉 Sauti za Ushindi", "📚 Chekechea hadi Darasa 6"],
    badgeBg: "#DCFCE7",
    badgeColor: "#15803D",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 960;
  const isTablet = width >= 640;
  const { language, setLanguage } = useKidoLanguage();
  const { soundEnabled, setSoundEnabled, preferencesLoaded } = useAudioPreferences();
  const popPlayer = useAudioPlayer(popSound);

  const [selectedHero, setSelectedHero] = useState<SelectedPlayer>(1);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(0);

  // Preloading & Skeleton Loading state
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [skeletonDone, setSkeletonDone] = useState(false);
  const skeletonOpacity = useRef(new Animated.Value(1)).current;

  // Reduced-motion preference
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatAnimReverse = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const downloadBounceAnim = useRef(new Animated.Value(0)).current;
  const heroCardScales = useRef<{ [key: number]: Animated.Value }>({
    1: new Animated.Value(1),
    2: new Animated.Value(1),
    3: new Animated.Value(1),
    4: new Animated.Value(1),
  }).current;

  // Preload all welcome assets and gracefully reveal screen
  useEffect(() => {
    let active = true;
    const startTime = Date.now();

    const preloadImages = async () => {
      try {
        await Asset.loadAsync(WELCOME_PRELOAD_ASSETS);
      } catch {
        // Fallback gracefully if any single asset fails to prefetch
      }

      // Smooth minimum display duration (400ms) to prevent awkward brief visual flash
      const elapsed = Date.now() - startTime;
      const minDelay = 400;
      if (elapsed < minDelay) {
        await new Promise((r) => setTimeout(r, minDelay - elapsed));
      }

      if (!active) return;
      setImagesLoaded(true);

      Animated.timing(skeletonOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && active) {
          setSkeletonDone(true);
        }
      });
    };

    void preloadImages();

    return () => {
      active = false;
    };
  }, [skeletonOpacity]);

  const playPop = useCallback(() => {
    if (!preferencesLoaded || !soundEnabled) return;
    try {
      popPlayer.seekTo(0);
      popPlayer.play();
    } catch {
      // Audio playback non-blocking fallback
    }
  }, [popPlayer, preferencesLoaded, soundEnabled]);

  // Load existing player selection from storage
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem("kido.player").then((val) => {
      if (active && val) {
        const parsed = parseSelectedPlayer(val);
        if (parsed) setSelectedHero(parsed);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Floating & pulsing animations
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    const floatReverseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimReverse, {
          toValue: 8,
          duration: 2100,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimReverse, {
          toValue: 0,
          duration: 2100,
          useNativeDriver: true,
        }),
      ]),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );

    // Subtle bounce for the floating download button
    const bounceLoop = reduceMotion
      ? null
      : Animated.loop(
          Animated.sequence([
            Animated.timing(downloadBounceAnim, {
              toValue: -7,
              duration: 540,
              useNativeDriver: true,
            }),
            Animated.spring(downloadBounceAnim, {
              toValue: 0,
              friction: 4,
              tension: 140,
              useNativeDriver: true,
            }),
            Animated.delay(1600),
          ]),
        );

    floatLoop.start();
    floatReverseLoop.start();
    pulseLoop.start();
    bounceLoop?.start();

    return () => {
      floatLoop.stop();
      floatReverseLoop.stop();
      pulseLoop.stop();
      bounceLoop?.stop();
    };
  }, [floatAnim, floatAnimReverse, pulseAnim, downloadBounceAnim, reduceMotion]);

  const handleSelectHero = (heroId: SelectedPlayer) => {
    playPop();
    setSelectedHero(heroId);
    void AsyncStorage.setItem("kido.player", String(heroId)).catch(() => undefined);

    const scaleAnim = heroCardScales[heroId];
    if (scaleAnim) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.93, duration: 90, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1.04, friction: 3, tension: 120, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleStartPlaying = () => {
    playPop();
    router.push("/home");
  };

  const isSw = language === "SW";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Navbar */}
        <View style={[styles.navbar, isLargeScreen && styles.navbarWide]}>
          <View style={styles.navLogoContainer}>
            <KidoAnimatedLogo capHeight={36} delay={200} onPress={playPop} />
          </View>

          <View style={styles.navActions}>
            {/* Language Switcher Pill */}
            <Pressable
              style={styles.langPill}
              accessibilityRole="button"
              accessibilityLabel="Switch Language"
              onPress={() => {
                playPop();
                setLanguage(isSw ? "EN" : "SW");
              }}
            >
              <AppText translate={false} style={[styles.langText, !isSw && styles.langActive]}>
                🇬🇧 EN
              </AppText>
              <View style={styles.langDivider} />
              <AppText translate={false} style={[styles.langText, isSw && styles.langActive]}>
                🇹🇿 SW
              </AppText>
            </Pressable>

            {/* Sound Toggle */}
            <Pressable
              style={styles.soundButton}
              accessibilityRole="button"
              accessibilityLabel="Toggle sound"
              onPress={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playPop();
              }}
            >
              <AppText translate={false} style={styles.soundEmoji}>
                {soundEnabled ? "🔊" : "🔇"}
              </AppText>
            </Pressable>

            {/* Login / Play Button */}
            <Pressable
              style={styles.navPlayButton}
              accessibilityRole="button"
              onPress={handleStartPlaying}
            >
              <AppText translate={false} style={styles.navPlayButtonText}>
                {isSw ? "Cheza Sasa" : "Play Now"}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* HERO SECTION WITH PHONE PREVIEW & SQUAD */}
        <View style={[styles.heroSection, isLargeScreen && styles.heroSectionWide]}>
          {/* Animated Sun & Flying Parrot Decor */}
          <View style={styles.sunDecor}>
            <LottieView
              source={require("../assets/sun.json")}
              autoPlay
              loop
              style={styles.sunLottie}
              resizeMode="contain"
            />
          </View>

          <View style={styles.parrotDecor}>
            <LottieView
              source={require("../assets/animals/parrot.json")}
              autoPlay
              loop
              style={styles.parrotLottie}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.heroContentGrid, isLargeScreen && styles.heroContentGridWide]}>
            {/* Left Column: Headlines, CTA, Avatars */}
            <View style={[styles.heroLeftCol, isLargeScreen && styles.heroLeftColWide]}>
              {/* Badge pill */}
              <View style={styles.badgePill}>
                <AppText translate={false} style={styles.badgePillEmoji}>
                  ✨
                </AppText>
                <AppText translate={false} style={styles.badgePillText}>
                  {isSw
                    ? "Mchezo wa Kwanza wa Kujifunza Wenye Furaha Tanzania!"
                    : "Tanzania’s #1 Fun & Friendly Learning Game!"}
                </AppText>
              </View>

              {/* Big Headline */}
              <AppText translate={false} style={styles.heroTitle}>
                {isSw ? "Karibu Kido!" : "Welcome to Kido!"}
              </AppText>
              <AppText translate={false} style={styles.heroSubtitle}>
                {isSw
                  ? "Safari ya kusisimua ya kujifunza! Cheza njia za ajabu, shinda changamoto za kila siku, na ujishindie nyota na rafiki yako mpendwa."
                  : "The ultimate learning quest for curious minds! Explore magical worlds, solve fun challenges, sing joyful songs, and earn shining stars."}
              </AppText>

              {/* Action Buttons */}
              <View style={styles.heroButtonsWrap}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Pressable
                    style={styles.primaryCtaButton}
                    accessibilityRole="button"
                    onPress={handleStartPlaying}
                  >
                    <AppText translate={false} style={styles.primaryCtaText}>
                      {isSw ? "Anza Safari Sasa!" : "Start Adventure!"}
                    </AppText>
                  </Pressable>
                </Animated.View>
              </View>

              {/* 4 Avatars Cheering Row in Hero */}
              <View style={styles.heroAvatarsRowWrapper}>
                <AppText translate={false} style={styles.heroSquadHeader}>
                  {isSw ? "Kutana na Kikosi Chako: Gusa kumchagua!" : "Meet Your Squad: Tap to pick your buddy!"}
                </AppText>
                <View style={styles.avatarLineupRow}>
                  {HEROES.map((hero) => {
                    const isSelected = selectedHero === hero.id;
                    return (
                      <Pressable
                        key={hero.id}
                        onPress={() => handleSelectHero(hero.id)}
                        style={[
                          styles.heroThumbWrap,
                          isSelected && styles.heroThumbWrapSelected,
                          { borderColor: isSelected ? hero.accentColor : hero.borderColor },
                        ]}
                      >
                        <PlayerAvatar player={hero.id} width={62} height={70} />
                        <View style={[styles.heroThumbBadge, { backgroundColor: hero.accentColor }]}>
                          <AppText translate={false} style={styles.heroThumbName}>
                            {hero.name}
                          </AppText>
                        </View>
                        {isSelected && (
                          <View style={styles.activeCheckPill}>
                            <AppText translate={false} style={styles.activeCheckText}>
                              ✓
                            </AppText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Right Column: Hero Smartphone Showcase */}
            <View style={[styles.heroRightCol, isLargeScreen && styles.heroRightColWide]}>
              <Animated.View
                style={[
                  styles.phoneShowcaseContainer,
                  { transform: [{ translateY: floatAnim }] },
                ]}
              >
                {/* Floating Badges Around the Phone */}
                <Animated.View
                  style={[
                    styles.floatingStatBadge,
                    styles.floatingStatTopLeft,
                    { transform: [{ translateY: floatAnimReverse }] },
                  ]}
                >
                  <Image source={lightningIcon} style={styles.floatingStatIcon} resizeMode="contain" />
                  <View>
                    <AppText translate={false} style={styles.floatingStatNum}>
                      1,105 XP
                    </AppText>
                    <AppText translate={false} style={styles.floatingStatLabel}>
                      Level Power
                    </AppText>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.floatingStatBadge,
                    styles.floatingStatBottomRight,
                    { transform: [{ translateY: floatAnimReverse }] },
                  ]}
                >
                  <Image source={starIcon} style={styles.floatingStatIcon} resizeMode="contain" />
                  <View>
                    <AppText translate={false} style={styles.floatingStatNum}>
                      34 Stars
                    </AppText>
                    <AppText translate={false} style={styles.floatingStatLabel}>
                      Golden Trophies
                    </AppText>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.floatingStatBadge,
                    styles.floatingStatBottomLeft,
                    { transform: [{ translateY: floatAnim }] },
                  ]}
                >
                  <Image source={fireIcon} style={styles.floatingStatIcon} resizeMode="contain" />
                  <View>
                    <AppText translate={false} style={styles.floatingStatNum}>
                      Streak Fire
                    </AppText>
                    <AppText translate={false} style={styles.floatingStatLabel}>
                      Every Weekday
                    </AppText>
                  </View>
                </Animated.View>

                {/* Smartphone Device Frame */}
                <View style={styles.phoneFrame}>
                  {/* Phone Speaker Notch */}
                  <View style={styles.phoneSpeaker} />
                  {/* Real Screen Image */}
                  <Image
                    source={homeAdventureScreenshot}
                    style={styles.phoneScreenImage}
                    resizeMode="cover"
                  />
                  {/* Glossy Reflection overlay */}
                  <View style={styles.phoneGlassShine} pointerEvents="none" />
                </View>
              </Animated.View>
            </View>
          </View>

          {/* Quick Stats Banner */}
          <View style={styles.highlightRow}>
            <View style={styles.highlightCard}>
              <Image source={starIcon} style={styles.highlightIcon} resizeMode="contain" />
              <AppText translate={false} style={styles.highlightNum}>
                5,000+
              </AppText>
              <AppText translate={false} style={styles.highlightLabel}>
                {isSw ? "Maswali ya Picha" : "Visual Puzzles"}
              </AppText>
            </View>

            <View style={styles.highlightCard}>
              <Image source={mapIcon} style={styles.highlightIcon} resizeMode="contain" />
              <AppText translate={false} style={styles.highlightNum}>
                2
              </AppText>
              <AppText translate={false} style={styles.highlightLabel}>
                {isSw ? "Maeneo ya Tanzania" : "Tanzania Lands"}
              </AppText>
            </View>

            <View style={styles.highlightCard}>
              <Image source={fireIcon} style={styles.highlightIcon} resizeMode="contain" />
              <AppText translate={false} style={styles.highlightNum}>
                Daily
              </AppText>
              <AppText translate={false} style={styles.highlightLabel}>
                {isSw ? "Moto wa Streak" : "Daily Streaks"}
              </AppText>
            </View>

            <View style={styles.highlightCard}>
              <Image source={crownIcon} style={styles.highlightIcon} resizeMode="contain" />
              <AppText translate={false} style={styles.highlightNum}>
                Top 1
              </AppText>
              <AppText translate={false} style={styles.highlightLabel}>
                {isSw ? "Nafasi ya Shule" : "School Rank"}
              </AppText>
            </View>
          </View>
        </View>

        {/* SECTION 2: LIVE GAMEPLAY GALLERY (THE 3 SCREENSHOTS) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrap}>
            <View style={[styles.sectionTag, { backgroundColor: "#FEF3C7" }]}>
              <AppText translate={false} style={[styles.sectionTagText, { color: "#B45309" }]}>
                {isSw ? "PICHA HALISI ZA MCHEZO" : "ACTUAL GAMEPLAY SNEAK PEEK"}
              </AppText>
            </View>
            <AppText translate={false} style={styles.sectionTitle}>
              {isSw ? "Tazama Ndani ya Mchezo wa Kido!" : "Look Inside the Kido Adventure!"}
            </AppText>
            <AppText translate={false} style={styles.sectionSubtitle}>
              {isSw
                ? "Hizi ni picha halisi za mchezo! Njia za mawe, maeneo mazuri ya ziwa, na mafumbo ya picha za mitini."
                : "Real screens from the app! Explore stepping-stone adventures, scenic lake vistas, and interactive treehouse challenges."}
            </AppText>

            {/* Interactive Screen Tab Pills */}
            <View style={styles.screenshotTabsRow}>
              {SCREENSHOTS.map((s, idx) => {
                const isActive = activeScreenshotIndex === idx;
                return (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.screenshotTabPill,
                      isActive && styles.screenshotTabPillActive,
                      { borderColor: s.badgeColor },
                    ]}
                    onPress={() => {
                      playPop();
                      setActiveScreenshotIndex(idx);
                    }}
                  >
                    <AppText
                      translate={false}
                      style={[
                        styles.screenshotTabPillText,
                        isActive && styles.screenshotTabPillTextActive,
                      ]}
                    >
                      {isSw ? s.tagSw : s.tagEn}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 3 Smartphone Mockup Showcase */}
          <View style={[styles.screensRow, isLargeScreen && styles.screensRowWide]}>
            {SCREENSHOTS.map((screen, sIdx) => {
              const isSpotlight = activeScreenshotIndex === sIdx;
              return (
                <View
                  key={screen.id}
                  style={[
                    styles.screenShowcaseCard,
                    isTablet && styles.screenShowcaseCardTablet,
                    isLargeScreen && styles.screenShowcaseCardWide,
                    isSpotlight && styles.screenShowcaseCardSpotlight,
                  ]}
                >
                  {/* Smartphone Frame */}
                  <Pressable
                    onPress={() => {
                      playPop();
                      setActiveScreenshotIndex(sIdx);
                    }}
                    style={styles.deviceFrame}
                  >
                    <View style={styles.phoneSpeaker} />
                    <Image
                      source={screen.source}
                      style={styles.deviceScreenImage}
                      resizeMode="cover"
                    />
                    <View style={styles.deviceGlass} pointerEvents="none" />
                  </Pressable>

                  {/* Info Card Below Phone */}
                  <View style={styles.deviceInfoBox}>
                    <View style={[styles.deviceBadge, { backgroundColor: screen.badgeBg }]}>
                      <AppText translate={false} style={[styles.deviceBadgeText, { color: screen.badgeColor }]}>
                        {isSw ? screen.tagSw : screen.tagEn}
                      </AppText>
                    </View>

                    <AppText translate={false} style={styles.deviceTitle}>
                      {isSw ? screen.titleSw : screen.titleEn}
                    </AppText>

                    <AppText translate={false} style={styles.deviceDesc}>
                      {isSw ? screen.descSw : screen.descEn}
                    </AppText>

                    {/* Feature tags */}
                    <View style={styles.deviceFeatureList}>
                      {(isSw ? screen.featuresSw : screen.featuresEn).map((f, fIdx) => (
                        <View key={fIdx} style={styles.deviceFeaturePill}>
                          <AppText translate={false} style={styles.deviceFeatureText}>
                            {f}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* SECTION 3: MEET THE 4 HEROES (MAIN REQUIREMENT) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrap}>
            <View style={styles.sectionTag}>
              <AppText translate={false} style={styles.sectionTagText}>
                {isSw ? "KIKOSI CHETU CHA USHINDI" : "MEET YOUR SQUAD"}
              </AppText>
            </View>
            <AppText translate={false} style={styles.sectionTitle}>
              {isSw ? "Kutana na Mashujaa Wako 4!" : "Meet All 4 Kido Heroes!"}
            </AppText>
            <AppText translate={false} style={styles.sectionSubtitle}>
              {isSw
                ? "Kelvin, Musa, Neema na Aisha wapo tayari kuanza safari na wewe. Gusa shujaa umpendaye!"
                : "Kelvin, Musa, Neema, and Aisha are ready for the quest! Learn with their unique super skills."}
            </AppText>
          </View>

          {/* 4 Hero Cards Grid */}
          <View style={[styles.heroesGrid, isLargeScreen && styles.heroesGridWide]}>
            {HEROES.map((hero) => {
              const isSelected = selectedHero === hero.id;
              const scaleAnim = heroCardScales[hero.id];

              return (
                <Animated.View
                  key={hero.id}
                  style={[
                    styles.heroCardWrapper,
                    isTablet && styles.heroCardWrapperTablet,
                    isLargeScreen && styles.heroCardWrapperWide,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.heroCard,
                      { backgroundColor: hero.lightBg, borderColor: hero.borderColor },
                      isSelected && styles.heroCardSelected,
                    ]}
                    onPress={() => handleSelectHero(hero.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${hero.name}`}
                  >
                    {/* Selected Badge Ribbon */}
                    {isSelected ? (
                      <View style={[styles.selectedRibbon, { backgroundColor: hero.accentColor }]}>
                        <AppText translate={false} style={styles.selectedRibbonText}>
                          {isSw ? "★ Shujaa Wako! ★" : "★ Your Buddy! ★"}
                        </AppText>
                      </View>
                    ) : null}

                    {/* Hero Big Avatar Artwork */}
                    <View style={styles.heroAvatarContainer}>
                      <PlayerAvatar player={hero.id} width={130} height={150} />
                    </View>

                    {/* Hero Name & Title */}
                    <View style={styles.heroCardBody}>
                      <AppText translate={false} style={[styles.heroName, { color: hero.accentColor }]}>
                        {hero.name}
                      </AppText>
                      <AppText translate={false} style={styles.heroRole}>
                        {isSw ? hero.roleSw : hero.roleEn}
                      </AppText>

                      <View style={[styles.heroBadgePill, { backgroundColor: hero.badgeBg }]}>
                        <AppText translate={false} style={[styles.heroBadgeText, { color: hero.accentColor }]}>
                          {hero.badge}
                        </AppText>
                      </View>

                      {/* Catchphrase Quote */}
                      <AppText translate={false} style={styles.heroCatchphrase}>
                        {isSw ? hero.catchphraseSw : hero.catchphraseEn}
                      </AppText>

                      {/* Super Skills */}
                      <View style={styles.heroSkillsRow}>
                        {(isSw ? hero.powersSw : hero.powersEn).map((skill, sIdx) => (
                          <View key={sIdx} style={styles.skillPill}>
                            <AppText translate={false} style={styles.skillPillText}>
                              • {skill}
                            </AppText>
                          </View>
                        ))}
                      </View>

                      {/* Choose Button */}
                      <Pressable
                        style={[
                          styles.chooseBuddyButton,
                          { backgroundColor: hero.accentColor },
                          isSelected && styles.chooseBuddyButtonActive,
                        ]}
                        onPress={() => handleSelectHero(hero.id)}
                      >
                        <AppText translate={false} style={styles.chooseBuddyButtonText}>
                          {isSelected
                            ? isSw ? "✓ Umechaguliwa!" : "✓ Selected Buddy!"
                            : isSw ? `Mchague ${hero.name}` : `Pick ${hero.name}`}
                        </AppText>
                      </Pressable>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* SECTION 4: EXPLORE MAGICAL LANDS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrap}>
            <View style={[styles.sectionTag, { backgroundColor: "#DCFCE7" }]}>
              <AppText translate={false} style={[styles.sectionTagText, { color: "#15803D" }]}>
                {isSw ? "MAENEO YA AJABU" : "EXPLORE THE LANDS"}
              </AppText>
            </View>
            <AppText translate={false} style={styles.sectionTitle}>
              {isSw ? "Maeneo Halisi ya Tanzania!" : "Play in Real Tanzanian Worlds!"}
            </AppText>
            <AppText translate={false} style={styles.sectionSubtitle}>
              {isSw
                ? "Panda mlima mrefu zaidi Afrika au nenda kwenye mwambao wa Ziwa Victoria!"
                : "Climb Africa’s highest peak or sail the islands of Lake Victoria!"}
            </AppText>
          </View>

          <View style={[styles.landsRow, isLargeScreen && styles.landsRowWide]}>
            {/* Kilimanjaro Card */}
            <View style={[styles.landCard, isLargeScreen && styles.landCardWide]}>
              <Image source={kilimanjaroImage} style={styles.landImage} resizeMode="cover" />
              <View style={styles.landCardContent}>
                <View style={styles.landHeaderRow}>
                  <AppText translate={false} style={styles.landName}>
                    🏔️ Mount Kilimanjaro
                  </AppText>
                </View>
                <AppText translate={false} style={styles.landDescription}>
                  {isSw
                    ? "Safari ya misitu minene, njia za milima na changamoto za hisabati na sayansi hadi kilele cha theluji."
                    : "Journey from lush tropical rainforests to snow-capped peaks solving math, logic, and nature puzzles!"}
                </AppText>
                <View style={styles.landHighlights}>
                  <AppText translate={false} style={styles.landHighlightItem}>
                    🌲 {isSw ? "Misitu ya Asili" : "Rainforest Paths"}
                  </AppText>
                  <AppText translate={false} style={styles.landHighlightItem}>
                    ❄️ {isSw ? "Kilele cha Theluji" : "Snowy Summit"}
                  </AppText>
                  <AppText translate={false} style={styles.landHighlightItem}>
                    🎯 {isSw ? "Mafumbo ya Akili" : "Brain Puzzles"}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Mwanza Card */}
            <View style={[styles.landCard, isLargeScreen && styles.landCardWide]}>
              <Image source={mwanzaImage} style={styles.landImage} resizeMode="cover" />
              <View style={styles.landCardContent}>
                <View style={styles.landHeaderRow}>
                  <AppText translate={false} style={styles.landName}>
                    🌊 Lake Victoria Mwanza
                  </AppText>
                </View>
                <AppText translate={false} style={styles.landDescription}>
                  {isSw
                    ? "Vumbua maajabu ya Rock City, safiri kwa mashua kisiwani na shinda maswali ya lugha na stadi za maisha."
                    : "Discover the legendary Rock City, explore tropical islands, and master language and life skills!"}
                </AppText>
                <View style={styles.landHighlights}>
                  <AppText translate={false} style={styles.landHighlightItem}>
                    🪨 {isSw ? "Miamba ya Rock City" : "Rock City Rocks"}
                  </AppText>
                  <AppText translate={false} style={styles.landHighlightItem}>
                    ⛵ {isSw ? "Visiwa vya Ziwa" : "Island Quests"}
                  </AppText>
                  <AppText translate={false} style={styles.landHighlightItem}>
                    🐟 {isSw ? "Hazina za Majini" : "Aquatic Treasures"}
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 5: EXCITING GAME FEATURES */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWrap}>
            <View style={[styles.sectionTag, { backgroundColor: "#DCFCE7" }]}>
              <AppText translate={false} style={[styles.sectionTagText, { color: "#15803D" }]}>
                {isSw ? "MAMBO MAZURI YA KIDO" : "SUPER FUN FEATURES"}
              </AppText>
            </View>
            <AppText translate={false} style={styles.sectionTitle}>
              {isSw ? "Kwa Nini Watoto Wanapenda Kido?" : "Why Kids Love Playing Kido"}
            </AppText>
            <AppText translate={false} style={styles.sectionSubtitle}>
              {isSw
                ? "Mchezo wenye msisimko mkubwa na motisha kila hatua unayopiga!"
                : "Excitement, joy, and rewards built into every single quest."}
            </AppText>
          </View>

          <View style={[styles.featuresGrid, isLargeScreen && styles.featuresGridWide]}>
            {/* Feature 1: Daily Streak */}
            <View style={styles.featureBox}>
              <View style={[styles.featureIconWrap, { backgroundColor: "#FEF2F2" }]}>
                <Image source={fireIcon} style={styles.featureIcon} resizeMode="contain" />
              </View>
              <AppText translate={false} style={styles.featureTitle}>
                {isSw ? "Changamoto na Moto wa Streak" : "Daily Challenges & Fire Streaks"}
              </AppText>
              <AppText translate={false} style={styles.featureDesc}>
                {isSw
                  ? "Cheza kila siku kuanzia Jumatatu hadi Ijumaa kuwasha moto wako wa ushindi na kupata pointi za ziada!"
                  : "Play every weekday Monday to Friday, keep your fire streak blazing, and level up faster than ever!"}
              </AppText>
            </View>

            {/* Feature 2: Stars & Gifts */}
            <View style={styles.featureBox}>
              <View style={[styles.featureIconWrap, { backgroundColor: "#FEF9C3" }]}>
                <Image source={starIcon} style={styles.featureIcon} resizeMode="contain" />
              </View>
              <AppText translate={false} style={styles.featureTitle}>
                {isSw ? "Nyota, Pointi na Masanduku ya Zawadi" : "Shiny Stars & Mystery Gifts"}
              </AppText>
              <AppText translate={false} style={styles.featureDesc}>
                {isSw
                  ? "Kila jibu sahihi linakuletea nyota na pointi za radi (XP). Fungua masanduku ya zawadi maalum!"
                  : "Score stars and lightning XP for every correct answer. Unlock mystery gift chests loaded with surprises!"}
              </AppText>
            </View>

            {/* Feature 3: Songs & Music Videos */}
            <View style={styles.featureBox}>
              <View style={[styles.featureIconWrap, { backgroundColor: "#FDF4FF" }]}>
                <Image source={drumIcon} style={styles.featureIcon} resizeMode="contain" />
              </View>
              <AppText translate={false} style={styles.featureTitle}>
                {isSw ? "Nyimbo za Kujifunza na Video" : "Catchy Songs & Music Videos"}
              </AppText>
              <AppText translate={false} style={styles.featureDesc}>
                {isSw
                  ? "Imba na cheza muziki wenye hadithi, herufi, nambari na masomo yatakayokaa akilini kwa urahisi."
                  : "Sing, dance, and memorize school lessons with joyful animated music and vibrant beats."}
              </AppText>
            </View>

            {/* Feature 4: Leaderboard & School Ranks */}
            <View style={styles.featureBox}>
              <View style={[styles.featureIconWrap, { backgroundColor: "#EFF6FF" }]}>
                <Image source={crownIcon} style={styles.featureIcon} resizeMode="contain" />
              </View>
              <AppText translate={false} style={styles.featureTitle}>
                {isSw ? "Ubao wa Vinara wa Shule Yako" : "School & Regional Leaderboards"}
              </AppText>
              <AppText translate={false} style={styles.featureDesc}>
                {isSw
                  ? "Shirikiana na wanafunzi wenzako, pandisha jina la shule yako, na uwe kinara wa mkoa na taifa!"
                  : "Cheer with classmates, lift your school up the podium, and compete for top regional rank!"}
              </AppText>
            </View>
          </View>
        </View>

        {/* SECTION 6: HOW IT WORKS (EASY AS 1-2-3) */}
        <View style={styles.stepsSection}>
          <AppText translate={false} style={styles.stepsHeading}>
            {isSw ? "Rahisi Kama 1 - 2 - 3!" : "As Easy As 1 - 2 - 3!"}
          </AppText>

          <View style={[styles.stepsRow, isLargeScreen && styles.stepsRowWide]}>
            <View style={styles.stepCard}>
              <View style={[styles.stepCircle, { backgroundColor: "#F59E0B" }]}>
                <AppText translate={false} style={styles.stepNum}>
                  1
                </AppText>
              </View>
              <AppText translate={false} style={styles.stepTitle}>
                {isSw ? "Chagua Shujaa Wako" : "Pick Your Hero"}
              </AppText>
              <AppText translate={false} style={styles.stepText}>
                {isSw
                  ? "Mchague Kelvin, Musa, Neema au Aisha kuwa msaidizi wako."
                  : "Choose Kelvin, Musa, Neema, or Aisha as your buddy."}
              </AppText>
            </View>

            <View style={styles.stepCard}>
              <View style={[styles.stepCircle, { backgroundColor: "#0284C7" }]}>
                <AppText translate={false} style={styles.stepNum}>
                  2
                </AppText>
              </View>
              <AppText translate={false} style={styles.stepTitle}>
                {isSw ? "Chagua Darasa na Eneo" : "Pick Grade & Land"}
              </AppText>
              <AppText translate={false} style={styles.stepText}>
                {isSw
                  ? "Maswali yanalengwa mahususi kwa darasa lako (Darasa la 1 hadi 6)."
                  : "Curriculum questions perfectly matched to primary grades 1 to 6."}
              </AppText>
            </View>

            <View style={styles.stepCard}>
              <View style={[styles.stepCircle, { backgroundColor: "#10B981" }]}>
                <AppText translate={false} style={styles.stepNum}>
                  3
                </AppText>
              </View>
              <AppText translate={false} style={styles.stepTitle}>
                {isSw ? "Cheza na Ushinde!" : "Play, Win & Grow!"}
              </AppText>
              <AppText translate={false} style={styles.stepText}>
                {isSw
                  ? "Pata nyota, ongeza alama za shule na uwe shujaa wa darasa!"
                  : "Collect stars, earn gifts, boost your school, and become a champion!"}
              </AppText>
            </View>
          </View>
        </View>

        {/* SECTION 7: FOR PARENTS & TEACHERS */}
        <View style={styles.parentsSection}>
          <View style={styles.parentsCard}>
            <View style={styles.parentsBadge}>
              <AppText translate={false} style={styles.parentsBadgeText}>
                🛡️ {isSw ? "KWA WAZAZI NA WALIMU" : "FOR PARENTS & EDUCATORS"}
              </AppText>
            </View>
            <AppText translate={false} style={styles.parentsTitle}>
              {isSw
                ? "Mazingira Salama, Yasiyo na Matangazo, Yenye Maadili"
                : "100% Safe, Ad-Free & Curriculum-Aligned"}
            </AppText>
            <AppText translate={false} style={styles.parentsDesc}>
              {isSw
                ? "Kido imeundwa kusaidia wanafunzi wa shule za msingi kupenda kusoma kwa hiari. Inazingatia mtaala rasmi, inasaidia lugha zote mbili (Kiingereza na Kiswahili), na inalinda faragha ya mtoto kikamilifu."
                : "Kido empowers young learners to embrace education through joy. Built to match school curricula with bilingual support (English & Swahili), zero distracting third-party ads, and secure kid-first design."}
            </AppText>

            <View style={styles.parentCheckGrid}>
              <View style={styles.parentCheckItem}>
                <AppText translate={false} style={styles.checkIcon}>
                  ✅
                </AppText>
                <AppText translate={false} style={styles.checkText}>
                  {isSw ? "Bila matangazo yoyote ya biashara" : "Zero third-party advertisements"}
                </AppText>
              </View>
              <View style={styles.parentCheckItem}>
                <AppText translate={false} style={styles.checkIcon}>
                  ✅
                </AppText>
                <AppText translate={false} style={styles.checkText}>
                  {isSw ? "Inafaa masomo ya Darasa la 1 - 6" : "Aligned to Primary Grades 1 to 6"}
                </AppText>
              </View>
              <View style={styles.parentCheckItem}>
                <AppText translate={false} style={styles.checkIcon}>
                  ✅
                </AppText>
                <AppText translate={false} style={styles.checkText}>
                  {isSw ? "Lugha ya Kiswahili na Kiingereza" : "Full English & Swahili support"}
                </AppText>
              </View>
              <View style={styles.parentCheckItem}>
                <AppText translate={false} style={styles.checkIcon}>
                  ✅
                </AppText>
                <AppText translate={false} style={styles.checkText}>
                  {isSw ? "Inafanya kazi kwenye simu na kompyuta" : "Works on phones, tablets & web"}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 8: GRAND FINALE CALL TO ACTION */}
        <View style={styles.grandCtaContainer}>
          <View style={styles.grandCtaCard}>
            <View style={styles.grandCtaSquadRow}>
              {HEROES.map((h) => (
                <View key={h.id} style={styles.grandCtaAvatarWrap}>
                  <PlayerAvatar player={h.id} width={68} height={78} />
                </View>
              ))}
            </View>

            <AppText translate={false} style={styles.grandCtaTitle}>
              {isSw ? "Uko Tayari Kuanza Safari?" : "Ready for the Greatest Adventure?"}
            </AppText>

            <AppText translate={false} style={styles.grandCtaSub}>
              {isSw
                ? "Kelvin, Musa, Neema na Aisha wanakungoja! Jiunge na maelfu ya watoto wanaofurahia kujifunza leo."
                : "Kelvin, Musa, Neema, and Aisha are waiting for you! Join thousands of happy learners today."}
            </AppText>

            <Pressable
              style={styles.grandCtaButton}
              accessibilityRole="button"
              onPress={handleStartPlaying}
            >
              <AppText translate={false} style={styles.grandCtaButtonText}>
                {isSw ? "Cheza Kido Sasa Hivi! 🎮" : "Play Kido Right Now! 🎮"}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <KidoAnimatedLogo capHeight={30} autoPlay={false} interactive onPress={playPop} style={{ marginBottom: 8 }} />
          <AppText translate={false} style={styles.footerCopy}>
            © {new Date().getFullYear()} Kido. {isSw ? "Haki zote zimehifadhiwa." : "All rights reserved."}
          </AppText>
          <Pressable
            onPress={() => {
              playPop();
              router.push("/privacy-policy");
            }}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            style={{ marginVertical: 4 }}
          >
            <AppText translate={false} style={[styles.footerCopy, { color: "#D97706", textDecorationLine: "underline" }]}>
              {isSw ? "Sera ya Faragha (Privacy Policy)" : "Privacy Policy"}
            </AppText>
          </Pressable>
          <AppText translate={false} style={styles.footerMadeWith}>
            {isSw ? "Imeundwa kwa upendo kwa ajili ya watoto ❤️" : "Made with love for happy kids ❤️"}
          </AppText>
        </View>
      </ScrollView>

      {/* Floating "Download Kido App" button */}
      <Animated.View
        style={[
          styles.floatingDownloadBtn,
          { transform: [{ translateY: downloadBounceAnim }] },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={({ pressed }) => [
            styles.floatingDownloadPressable,
            pressed && styles.floatingDownloadPressableActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Download Kido App for Android"
          onPress={() => {
            playPop();
            void Linking.openURL(
              "https://github.com/joshnicas/restituta/releases/download/v1.0.0/kido.apk",
            ).catch(() => undefined);
          }}
        >
          {/* Download arrow icon */}
          <View style={styles.floatingDownloadIcon}>
            <AppText translate={false} style={styles.floatingDownloadIconText}>
              ⬇
            </AppText>
          </View>
          <View>
            <AppText translate={false} style={styles.floatingDownloadLabel}>
              {isSw ? "Pakua App" : "Download App"}
            </AppText>
            <AppText translate={false} style={styles.floatingDownloadSub}>
              Android APK
            </AppText>
          </View>
        </Pressable>
      </Animated.View>

      {/* Full-Page Shimmering Skeleton Loader while images are preloading */}
      {!skeletonDone && (
        <Animated.View
          pointerEvents={imagesLoaded ? "none" : "auto"}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "#FDF8F0",
              zIndex: 999,
              opacity: skeletonOpacity,
            },
          ]}
        >
          <WelcomeSkeleton />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  navLogo: {
    width: 104,
    height: 38,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  langText: {
    fontFamily: "FredokaMedium",
    fontSize: 12,
    color: "#6B7280",
  },
  langActive: {
    color: "#1E293B",
    fontFamily: "FredokaBold",
  },
  langDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 6,
  },
  soundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  soundEmoji: {
    fontSize: 16,
  },
  navPlayButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  navPlayButtonText: {
    fontFamily: "FredokaBold",
    fontSize: 14,
    color: "#FFFFFF",
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    position: "relative",
    overflow: "hidden",
  },
  heroSectionWide: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingTop: 44,
  },
  sunDecor: {
    position: "absolute",
    top: 6,
    right: 18,
    width: 86,
    height: 86,
    opacity: 0.92,
  },
  sunLottie: {
    width: "100%",
    height: "100%",
  },
  parrotDecor: {
    position: "absolute",
    top: 68,
    right: 80,
    width: 76,
    height: 76,
    opacity: 0.95,
  },
  parrotLottie: {
    width: "100%",
    height: "100%",
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
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 6,
  },
  badgePillEmoji: {
    fontSize: 14,
  },
  badgePillText: {
    fontFamily: "FredokaBold",
    fontSize: 13,
    color: "#92400E",
  },
  heroTitle: {
    fontFamily: "FredokaBold",
    fontSize: 42,
    lineHeight: 48,
    color: "#451A03",
    textAlign: "center",
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: "FredokaMedium",
    fontSize: 16,
    lineHeight: 24,
    color: "#78350F",
    textAlign: "center",
    maxWidth: 620,
    marginBottom: 20,
  },
  heroButtonsWrap: {
    marginBottom: 20,
  },
  primaryCtaButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 16,
    paddingHorizontal: 38,
    borderRadius: 30,
  },
  primaryCtaText: {
    fontFamily: "FredokaBold",
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  // 4 Avatars Cheering Lineup in Hero
  heroAvatarsRowWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  heroSquadHeader: {
    fontFamily: "FredokaBold",
    fontSize: 13,
    color: "#92400E",
    marginBottom: 8,
  },
  avatarLineupRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  heroThumbWrap: {
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 5,
    borderWidth: 2,
    position: "relative",
  },
  heroThumbWrapSelected: {
    borderWidth: 3,
    backgroundColor: "#FFFBEB",
    transform: [{ scale: 1.07 }],
  },
  heroThumbBadge: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  heroThumbName: {
    fontFamily: "FredokaBold",
    fontSize: 10,
    color: "#FFFFFF",
  },
  activeCheckPill: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#10B981",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  activeCheckText: {
    fontFamily: "FredokaBold",
    fontSize: 11,
    color: "#FFFFFF",
  },

  // Hero Phone Showcase Frame
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
    position: "relative",
  },
  phoneSpeaker: {
    width: 54,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#475569",
    marginTop: 6,
    marginBottom: 6,
    zIndex: 10,
  },
  phoneScreenImage: {
    width: "100%",
    height: 495,
    borderRadius: 26,
    backgroundColor: "#E6DFD5",
  },
  phoneGlassShine: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 70,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    transform: [{ skewX: "-20deg" }],
  },

  // Floating Stat Badges around Phone
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
    borderColor: "rgba(245, 158, 11, 0.4)",
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
  floatingStatBottomLeft: {
    bottom: 90,
    left: -20,
  },
  floatingStatIcon: {
    width: 24,
    height: 24,
  },
  floatingStatNum: {
    fontFamily: "FredokaBold",
    fontSize: 14,
    color: "#451A03",
  },
  floatingStatLabel: {
    fontFamily: "FredokaMedium",
    fontSize: 10,
    color: "#6B7280",
  },

  // Stats / Highlights Row
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
  highlightIcon: {
    width: 28,
    height: 28,
    marginBottom: 6,
  },
  highlightNum: {
    fontFamily: "FredokaBold",
    fontSize: 18,
    color: "#451A03",
  },
  highlightLabel: {
    fontFamily: "FredokaMedium",
    fontSize: 12,
    color: "#78350F",
    marginTop: 2,
    textAlign: "center",
  },

  // Section Headers
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
  sectionTag: {
    backgroundColor: "#E0E7FF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  sectionTagText: {
    fontFamily: "FredokaBold",
    fontSize: 12,
    color: "#4338CA",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: "FredokaBold",
    fontSize: 32,
    lineHeight: 38,
    color: "#451A03",
    textAlign: "center",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontFamily: "FredokaRegular",
    fontSize: 16,
    lineHeight: 22,
    color: "#78350F",
    textAlign: "center",
    maxWidth: 640,
  },

  // Screenshot Showcase Tabs
  screenshotTabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  screenshotTabPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  screenshotTabPillActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#D97706",
  },
  screenshotTabPillText: {
    fontFamily: "FredokaBold",
    fontSize: 12,
    color: "#4B5563",
  },
  screenshotTabPillTextActive: {
    color: "#FFFFFF",
  },

  // 3 Phone Gallery Row
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
  screenShowcaseCardSpotlight: {
    borderColor: "#F59E0B",
    borderWidth: 3,
    backgroundColor: "#FFFDF7",
  },

  // Device Frame for Gallery
  deviceFrame: {
    width: 220,
    height: 470,
    borderRadius: 32,
    backgroundColor: "#1E293B",
    borderWidth: 7,
    borderColor: "#0F172A",
    overflow: "hidden",
    alignItems: "center",
    position: "relative",
    marginBottom: 16,
  },
  deviceScreenImage: {
    width: "100%",
    height: 446,
    borderRadius: 24,
    backgroundColor: "#E6DFD5",
  },
  deviceGlass: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    transform: [{ skewX: "-20deg" }],
  },

  // Device Info Box
  deviceInfoBox: {
    width: "100%",
    alignItems: "center",
  },
  deviceBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  deviceBadgeText: {
    fontFamily: "FredokaBold",
    fontSize: 11,
  },
  deviceTitle: {
    fontFamily: "FredokaBold",
    fontSize: 19,
    color: "#451A03",
    textAlign: "center",
    marginBottom: 6,
  },
  deviceDesc: {
    fontFamily: "FredokaRegular",
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 12,
  },
  deviceFeatureList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  deviceFeaturePill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deviceFeatureText: {
    fontFamily: "FredokaMedium",
    fontSize: 11,
    color: "#374151",
  },

  // 4 Heroes Grid
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
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    borderWidth: 2.5,
    position: "relative",
  },
  heroCardSelected: {
    borderWidth: 3.5,
  },
  selectedRibbon: {
    position: "absolute",
    top: -12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 10,
  },
  selectedRibbonText: {
    fontFamily: "FredokaBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  heroAvatarContainer: {
    marginTop: 6,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCardBody: {
    width: "100%",
    alignItems: "center",
  },
  heroName: {
    fontFamily: "FredokaBold",
    fontSize: 24,
    textAlign: "center",
  },
  heroRole: {
    fontFamily: "FredokaMedium",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  heroBadgePill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontFamily: "FredokaBold",
    fontSize: 11,
  },
  heroCatchphrase: {
    fontFamily: "FredokaMedium",
    fontStyle: "italic",
    fontSize: 12,
    lineHeight: 16,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 12,
    minHeight: 34,
  },
  heroSkillsRow: {
    width: "100%",
    gap: 4,
    marginBottom: 16,
  },
  skillPill: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  skillPillText: {
    fontFamily: "FredokaMedium",
    fontSize: 11,
    color: "#374151",
  },
  chooseBuddyButton: {
    width: "100%",
    paddingVertical: 11,
    borderRadius: 16,
    alignItems: "center",
  },
  chooseBuddyButtonActive: {
    paddingVertical: 11,
  },
  chooseBuddyButtonText: {
    fontFamily: "FredokaBold",
    fontSize: 14,
    color: "#FFFFFF",
  },

  // Lands Section
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
  landImage: {
    width: "100%",
    height: 190,
    backgroundColor: "#E6DFD5",
  },
  landCardContent: {
    padding: 20,
  },
  landHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  landName: {
    fontFamily: "FredokaBold",
    fontSize: 20,
    color: "#451A03",
  },
  landTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  landTagText: {
    fontFamily: "FredokaBold",
    fontSize: 12,
    color: "#D97706",
  },
  landDescription: {
    fontFamily: "FredokaRegular",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    marginBottom: 14,
  },
  landHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  landHighlightItem: {
    fontFamily: "FredokaMedium",
    fontSize: 12,
    color: "#374151",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  featuresGridWide: {
    gap: 20,
  },
  featureBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    width: "100%",
    maxWidth: 550,
    borderWidth: 1.5,
    borderColor: "rgba(80, 54, 23, 0.1)",
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  featureIcon: {
    width: 28,
    height: 28,
  },
  featureTitle: {
    fontFamily: "FredokaBold",
    fontSize: 18,
    color: "#451A03",
    marginBottom: 6,
  },
  featureDesc: {
    fontFamily: "FredokaRegular",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },

  // Steps Section
  stepsSection: {
    paddingHorizontal: 20,
    paddingVertical: 36,
    backgroundColor: "#FFFBEB",
    marginTop: 20,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FDE68A",
    alignItems: "center",
  },
  stepsHeading: {
    fontFamily: "FredokaBold",
    fontSize: 28,
    color: "#92400E",
    marginBottom: 24,
    textAlign: "center",
  },
  stepsRow: {
    flexDirection: "column",
    gap: 18,
    width: "100%",
    maxWidth: 1000,
  },
  stepsRowWide: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepNum: {
    fontFamily: "FredokaBold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  stepTitle: {
    fontFamily: "FredokaBold",
    fontSize: 17,
    color: "#451A03",
    marginBottom: 6,
    textAlign: "center",
  },
  stepText: {
    fontFamily: "FredokaRegular",
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
    textAlign: "center",
  },

  // Parents Section
  parentsSection: {
    paddingHorizontal: 20,
    paddingVertical: 36,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  parentsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 26,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  parentsBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  parentsBadgeText: {
    fontFamily: "FredokaBold",
    fontSize: 12,
    color: "#4338CA",
  },
  parentsTitle: {
    fontFamily: "FredokaBold",
    fontSize: 22,
    color: "#1E293B",
    marginBottom: 8,
  },
  parentsDesc: {
    fontFamily: "FredokaRegular",
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
    marginBottom: 18,
  },
  parentCheckGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  parentCheckItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "48%",
    minWidth: 240,
  },
  checkIcon: {
    fontSize: 16,
  },
  checkText: {
    fontFamily: "FredokaMedium",
    fontSize: 13,
    color: "#374151",
  },

  // Grand CTA
  grandCtaContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  grandCtaCard: {
    backgroundColor: "#F59E0B",
    borderRadius: 30,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  grandCtaSquadRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  grandCtaAvatarWrap: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 18,
    padding: 4,
  },
  grandCtaTitle: {
    fontFamily: "FredokaBold",
    fontSize: 28,
    lineHeight: 34,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  grandCtaSub: {
    fontFamily: "FredokaMedium",
    fontSize: 15,
    lineHeight: 22,
    color: "#FEF3C7",
    textAlign: "center",
    maxWidth: 600,
    marginBottom: 24,
  },
  grandCtaButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 38,
  },
  grandCtaButtonText: {
    fontFamily: "FredokaBold",
    fontSize: 18,
    color: "#B45309",
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerLogo: {
    width: 90,
    height: 32,
    marginBottom: 8,
  },
  footerCopy: {
    fontFamily: "FredokaMedium",
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  footerMadeWith: {
    fontFamily: "FredokaRegular",
    fontSize: 12,
    color: "#9CA3AF",
  },

  // Floating Download Button
  floatingDownloadBtn: {
    position: "absolute",
    // Bottom-right, clear of nav bars; safe-area inset handled by SafeAreaView parent
    bottom: Platform.OS === "web" ? 28 : 22,
    right: Platform.OS === "web" ? 28 : 18,
    zIndex: 900,
    // Shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: "#92400E",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
      web: {
        // @ts-ignore — web-only CSS shadow
        boxShadow: "0 6px 20px rgba(146,64,14,0.30)",
      },
    }),
  },
  floatingDownloadPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F59E0B",
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: "#FDE68A",
  },
  floatingDownloadPressableActive: {
    backgroundColor: "#D97706",
    borderColor: "#F59E0B",
  },
  floatingDownloadIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingDownloadIconText: {
    fontSize: 16,
  },
  floatingDownloadLabel: {
    fontFamily: "FredokaBold",
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 17,
  },
  floatingDownloadSub: {
    fontFamily: "FredokaMedium",
    fontSize: 11,
    color: "#FEF3C7",
    lineHeight: 14,
  },
});
