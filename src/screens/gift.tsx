import AppText from "../components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE } from "../lib/config";
import { useDarkTheme } from "../lib/use-dark-theme";
import {
  getUserGift,
  getUserGifts,
  getUserMe,
  markUserGiftViewed,
  type UserGift,
} from "../lib/api";

type MeResponse = {
  id?: string | number;
  user?: { id?: string | number };
  data?: { id?: string | number; user?: { id?: string | number } };
};

const toImageUrl = (url: string) => /^https?:\/\//i.test(url)
  ? url
  : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
const childSafeError = "We could not load your gifts. Please try again.";

export default function GiftScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const [gifts, setGifts] = useState<UserGift[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedGift, setSelectedGift] = useState<UserGift | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [failedPage, setFailedPage] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const loadingFirstPageRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const totalPagesRef = useRef(1);
  const [modalScale] = useState(() => new Animated.Value(0.84));
  const [modalOpacity] = useState(() => new Animated.Value(0));
  const [fontsLoaded] = useFonts({
    FredokaRegular: require("../assets/fonts/Fredoka-Regular.ttf"),
    FredokaMedium: require("../assets/fonts/Fredoka-Medium.ttf"),
    FredokaBold: require("../assets/fonts/Fredoka-Bold.ttf"),
  });

  const loadGifts = useCallback(async (nextPage = 1) => {
    if (nextPage === 1) {
      if (loadingFirstPageRef.current) return;
      loadingFirstPageRef.current = true;
      setLoading(true);
    } else {
      if (loadingMoreRef.current || nextPage > totalPagesRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    setError("");
    try {
      const authToken = await AsyncStorage.getItem("kido.authToken");
      if (!authToken) throw new Error("No session");
      const me = await getUserMe(authToken) as MeResponse;
      const account = me.user ?? me.data?.user ?? me.data ?? me;
      const id = account.id;
      if (id == null) throw new Error("No account ID");
      const response = await getUserGifts(id, authToken, nextPage, 20);
      setToken(authToken);
      setUserId(String(id));
      setGifts((previous) => {
        const combined = nextPage === 1 ? response.userGifts : [...previous, ...response.userGifts];
        return [...new Map(combined.map((gift) => [gift.id, gift])).values()];
      });
      setNewCount(response.newCount);
      setTotalCount(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
      totalPagesRef.current = response.totalPages;
    } catch {
      setFailedPage(nextPage);
      setError(childSafeError);
    } finally {
      if (nextPage === 1) {
        loadingFirstPageRef.current = false;
        setLoading(false);
      } else {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadGifts(1);
  }, [loadGifts]));

  useEffect(() => {
    if (!selectedGift) {
      modalScale.setValue(0.84);
      modalOpacity.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, friction: 6, tension: 115, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [modalOpacity, modalScale, selectedGift]);

  const loadMore = () => {
    if (!loading && !loadingMore && page < totalPages) void loadGifts(page + 1);
  };

  const openGift = async (gift: UserGift) => {
    if (!userId || !token) return;
    try {
      const detail = await getUserGift(userId, gift.id, token);
      const viewed = gift.isViewed
        ? detail.userGift
        : (await markUserGiftViewed(userId, gift.id, token)).userGift;
      setSelectedGift(viewed);
      setGifts((items) => items.map((item) => item.id === viewed.id ? viewed : item));
      if (!gift.isViewed && viewed.isViewed) setNewCount((count) => Math.max(0, count - 1));
    } catch {
      setError("We could not open this gift just now. Please try again.");
    }
  };

  const renderGift = ({ item }: { item: UserGift }) => {
    const hasPoints = item.gift.pointsAwarded > 0;
    const hasStars = item.gift.starsAwarded > 0;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.gift.name}${item.isViewed ? "" : ", new gift"}`}
        onPress={() => void openGift(item)}
        style={[styles.giftCard, darkTheme && styles.darkCard, !item.isViewed && styles.unviewedCard]}
      >
        {!item.isViewed ? <AppText style={styles.newBadge}>NEW</AppText> : <View style={styles.badgeSpacer} />}
        <View style={styles.giftImageFrame}>
          <Image source={{ uri: toImageUrl(item.gift.imageUrl) }} style={styles.giftImage} resizeMode="contain" />
        </View>
        <AppText translate={false} style={[styles.giftName, darkTheme && styles.darkText]} numberOfLines={2}>{item.gift.name}</AppText>
        <AppText translate={false} style={[styles.giftDescription, darkTheme && styles.darkMutedText]} numberOfLines={2}>{item.gift.description}</AppText>
        {(hasPoints || hasStars) ? (
          <View style={styles.rewards}>
            {hasStars ? <AppText style={[styles.rewardText, darkTheme && styles.darkMutedText]}>⭐ {item.gift.starsAwarded}</AppText> : null}
            {hasPoints ? <AppText style={[styles.rewardText, darkTheme && styles.darkMutedText]}>+{item.gift.pointsAwarded} pts</AppText> : null}
          </View>
        ) : <View style={styles.rewardSpacer} />}
        <AppText style={[styles.date, darkTheme && styles.darkMutedText]}>{dateLabel(item.awardedAt)}</AppText>
      </Pressable>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return <View style={[styles.state, darkTheme && styles.darkCard]}><ActivityIndicator color="#8a5a1d" size="large" /><AppText style={[styles.stateText, darkTheme && styles.darkMutedText]}>Finding your rewards...</AppText></View>;
    }
    if (error) {
      return <View style={[styles.state, darkTheme && styles.darkCard]}><AppText style={styles.stateEmoji}>😕</AppText><AppText style={[styles.stateTitle, darkTheme && styles.darkText]}>Oops!</AppText><AppText style={[styles.stateText, darkTheme && styles.darkMutedText]}>We could not load your gifts.</AppText><Pressable style={styles.actionButton} onPress={() => void loadGifts(1)}><AppText style={styles.actionText}>Try again</AppText></Pressable></View>;
    }
    return <View style={[styles.state, darkTheme && styles.darkCard]}><Image source={require("../assets/gift.png")} style={styles.stateGiftIcon} resizeMode="contain" /><AppText style={[styles.stateTitle, darkTheme && styles.darkText]}>No gifts yet!</AppText><AppText style={[styles.stateText, darkTheme && styles.darkMutedText]}>Keep playing and completing challenges to earn rewards.</AppText><Pressable style={styles.actionButton} onPress={() => router.push("/play")}><AppText style={styles.actionText}>Play now</AppText></Pressable></View>;
  };

  if (!fontsLoaded) return null;
  return (
    <SafeAreaView style={[styles.safe, darkTheme && styles.darkSafe]}>
      {!darkTheme && <View style={styles.glowOne} />}
      {!darkTheme && <View style={styles.glowTwo} />}
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <AppText style={[styles.backText, darkTheme && styles.darkText]}>Back</AppText>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Image source={require("../assets/gift.png")} style={styles.titleIcon} resizeMode="contain" />
            <AppText style={[styles.title, darkTheme && styles.darkText]}>My Gifts</AppText>
          </View>
          <AppText style={[styles.subtitle, darkTheme && styles.darkMutedText]}>Your Rewards · {totalCount} gifts received</AppText>
        </View>
        {newCount > 0 ? <View style={styles.newPill}><Image source={require("../assets/gift.png")} style={styles.pillIcon} resizeMode="contain" /><AppText style={styles.newPillText}>{newCount} New Gifts</AppText></View> : <View style={styles.headerEndSpace} />}
      </View>
      {error && gifts.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => void loadGifts(failedPage)}>
          <AppText style={styles.inlineError}>We could not load your gifts. Tap to try again.</AppText>
        </Pressable>
      ) : null}
      <FlatList
        data={gifts}
        keyExtractor={(item) => item.id}
        renderItem={renderGift}
        numColumns={2}
        columnWrapperStyle={gifts.length > 1 ? styles.gridRow : undefined}
        contentContainerStyle={[styles.content, gifts.length === 0 && styles.emptyContent]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={loadingMore ? <View style={styles.footerLoading}><ActivityIndicator color="#8a5a1d" /><AppText style={styles.footerText}>Finding more gifts...</AppText></View> : null}
      />
      <Modal visible={Boolean(selectedGift)} transparent animationType="fade" onRequestClose={() => setSelectedGift(null)}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalCard, darkTheme && styles.darkModalCard, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}> 
            <Pressable accessibilityRole="button" accessibilityLabel="Close gift" style={styles.modalClose} onPress={() => setSelectedGift(null)}><AppText style={styles.closeText}>×</AppText></Pressable>
            {selectedGift ? <>
              <AppText style={styles.celebration}>🎉 AMAZING! 🎉</AppText>
              <Image source={{ uri: toImageUrl(selectedGift.gift.imageUrl) }} style={styles.modalImage} resizeMode="contain" />
              <AppText translate={false} style={styles.modalTitle}>{selectedGift.gift.name}</AppText>
              <AppText translate={false} style={styles.modalDescription}>{selectedGift.gift.description}</AppText>
              {selectedGift.gift.starsAwarded > 0 ? <AppText style={styles.modalReward}>⭐ +{selectedGift.gift.starsAwarded} Stars</AppText> : null}
              {selectedGift.gift.pointsAwarded > 0 ? <AppText style={styles.modalReward}>⚡ +{selectedGift.gift.pointsAwarded} Points</AppText> : null}
              <AppText style={styles.date}>Awarded {dateLabel(selectedGift.awardedAt)}</AppText>
              <Pressable accessibilityRole="button" style={styles.actionButton} onPress={() => setSelectedGift(null)}><AppText style={styles.actionText}>Awesome!</AppText></Pressable>
            </> : null}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9e9bb" },
  darkSafe: { backgroundColor: "#111827" },
  darkText: { color: "#f8fafc" },
  darkMutedText: { color: "#cbd5e1" },
  darkCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.28)" },
  darkModalCard: { backgroundColor: "#1f2937", borderColor: "rgba(148,163,184,0.35)" },
  glowOne: { position: "absolute", width: 250, height: 250, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.42)", top: -90, right: -100 },
  glowTwo: { position: "absolute", width: 200, height: 200, borderRadius: 110, backgroundColor: "rgba(241,182,69,0.18)", bottom: 30, left: -100 },
  header: { minHeight: 78, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  back: { width: 54, paddingVertical: 10 }, backText: { color: "#8a5a1d", fontFamily: "FredokaBold", fontSize: 14 },
  headerCenter: { flex: 1, alignItems: "center" }, titleRow: { flexDirection: "row", alignItems: "center", gap: 6 }, titleIcon: { width: 26, height: 26 }, title: { color: "#503617", fontFamily: "FredokaBold", fontSize: 23 }, subtitle: { color: "#8a6a43", fontFamily: "FredokaRegular", fontSize: 11, textAlign: "center" },
  newPill: { maxWidth: 90, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 12, backgroundColor: "#f4b942", alignItems: "center", flexDirection: "row", gap: 4 }, pillIcon: { width: 14, height: 14 }, newPillText: { color: "#503617", fontFamily: "FredokaBold", fontSize: 9, textAlign: "center" }, headerEndSpace: { width: 54 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 }, emptyContent: { flexGrow: 1, justifyContent: "center" }, gridRow: { justifyContent: "space-between", gap: 12 },
  state: { width: "100%", maxWidth: 520, minHeight: 250, alignSelf: "center", backgroundColor: "rgba(255,250,231,0.92)", borderRadius: 26, padding: 24, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#f0cc78" },
  stateEmoji: { fontSize: 54, marginBottom: 10 }, stateGiftIcon: { width: 72, height: 72, marginBottom: 10 }, stateTitle: { fontFamily: "FredokaBold", fontSize: 21, color: "#503617", textAlign: "center" }, stateText: { fontFamily: "FredokaRegular", color: "#76562e", textAlign: "center", marginTop: 8, fontSize: 14 },
  actionButton: { minWidth: 150, marginTop: 18, backgroundColor: "#f4b942", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, alignItems: "center", shadowColor: "#6b481d", shadowOpacity: 0.13, shadowRadius: 5, elevation: 2 }, actionText: { fontFamily: "FredokaBold", color: "#503617", fontSize: 15, textTransform: "uppercase" },
  inlineError: { textAlign: "center", color: "#9a5733", fontFamily: "FredokaMedium", padding: 7 }, footerLoading: { minHeight: 60, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }, footerText: { fontFamily: "FredokaRegular", color: "#76562e", fontSize: 12 },
  giftCard: { width: "48%", marginBottom: 12, minHeight: 250, alignItems: "center", padding: 12, borderRadius: 23, backgroundColor: "rgba(255,250,231,0.97)", borderWidth: 2, borderColor: "rgba(138,90,29,0.14)", shadowColor: "#583918", shadowOpacity: 0.1, shadowRadius: 7, elevation: 3 }, unviewedCard: { borderColor: "#f0b833", borderWidth: 3 },
  newBadge: { alignSelf: "flex-end", backgroundColor: "#e66849", overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, color: "white", fontFamily: "FredokaBold", fontSize: 10 }, badgeSpacer: { height: 21, alignSelf: "flex-end" }, giftImageFrame: { width: 92, height: 86, borderRadius: 20, backgroundColor: "#fff2cb", alignItems: "center", justifyContent: "center", marginTop: 2 }, giftImage: { width: 78, height: 78 },
  giftName: { width: "100%", minHeight: 42, color: "#503617", fontFamily: "FredokaBold", fontSize: 16, textAlign: "center", marginTop: 8 }, giftDescription: { width: "100%", minHeight: 34, color: "#765b39", fontFamily: "FredokaRegular", fontSize: 11, lineHeight: 15, textAlign: "center", marginTop: 2 }, rewards: { minHeight: 23, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 7 }, rewardText: { color: "#754b17", fontFamily: "FredokaBold", fontSize: 12 }, rewardSpacer: { minHeight: 30 }, date: { color: "#9a8467", fontFamily: "FredokaRegular", fontSize: 10, textAlign: "center", marginTop: 5 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(46,31,14,0.6)", justifyContent: "center", alignItems: "center", padding: 22 }, modalCard: { width: "100%", maxWidth: 390, borderRadius: 30, padding: 24, paddingTop: 38, backgroundColor: "#fff8e5", alignItems: "center", borderWidth: 3, borderColor: "#f0c45d", shadowColor: "#291b0d", shadowOpacity: 0.3, shadowRadius: 15, elevation: 12 },
  modalClose: { position: "absolute", top: 7, right: 12, zIndex: 1, width: 38, height: 38, alignItems: "center", justifyContent: "center" }, closeText: { color: "#795526", fontSize: 30, lineHeight: 32 }, celebration: { color: "#bc7a16", fontFamily: "FredokaBold", fontSize: 18, marginBottom: 8 }, modalImage: { width: 148, height: 140, marginBottom: 7 }, modalTitle: { color: "#503617", fontFamily: "FredokaBold", fontSize: 25, textAlign: "center" }, modalDescription: { color: "#765b39", fontFamily: "FredokaRegular", fontSize: 15, textAlign: "center", marginTop: 8 }, modalReward: { color: "#754b17", fontFamily: "FredokaBold", fontSize: 17, marginTop: 11 },
});
