import AppText from "../components/app-text";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cancelSubscriptionPayment, createSubscriptionPayment, getMySubscription, getOpenSubscriptionPayment, getSubscriptionPayment, getSubscriptionPlans, type PaymentStatus, type SubscriptionPlan } from "../lib/api";
import { useKidoLanguage } from "../lib/language-context";

type PaymentState = "IDLE" | "ENTER_PHONE" | "REQUESTING_PAYMENT" | "WAITING_FOR_PAYMENT" | "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "PAYMENT_EXPIRED" | "PAYMENT_CANCELLED" | "AMOUNT_MISMATCH";

function normalizePhone(value: string): string | null {
  const digits = value.trim().replace(/[\s()+-]/g, "");
  const local = digits.match(/^(?:0)?([67]\d{8})$/)?.[1];
  const normalized = local ? `255${local}` : digits;
  return /^255[67]\d{8}$/.test(normalized) ? normalized : null;
}

const terminalStates: Partial<Record<PaymentStatus, PaymentState>> = {
  COMPLETED: "PAYMENT_SUCCESS", FAILED: "PAYMENT_FAILED", EXPIRED: "PAYMENT_EXPIRED",
  CANCELLED: "PAYMENT_CANCELLED", AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
};

export default function Subscription() {
  const { language } = useKidoLanguage();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("IDLE");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [providerPaymentStatus, setProviderPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pollCycle, setPollCycle] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [cancellingPayment, setCancellingPayment] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState<{ planName: string; duration: number; expiresAt: string } | null>(null);
  const polling = useRef(false);
  const plan = plans.find((item) => item.id === selectedPlan);
  const formattedPrice = plan ? plan.price.toLocaleString("en-TZ") : "";
  const canUpgrade = !activeSubscription || plans.some((item) => item.duration > activeSubscription.duration);
  const waitingTitle = pollTimedOut
    ? providerPaymentStatus === "CREATED" ? "Payment request not confirmed" : "Payment is still processing"
    : providerPaymentStatus === "CREATED" ? "Confirming payment request" : providerPaymentStatus === "PENDING" ? "Check your phone" : "Checking payment status";
  const waitingMessage = pollTimedOut
    ? providerPaymentStatus === "CREATED"
      ? "We have not confirmed that a mobile money prompt reached your phone. Check your phone; if it did not arrive, cancel this request before starting another payment."
      : "We haven’t received a final confirmation yet. Complete any prompt on your phone, then check again."
    : providerPaymentStatus === "CREATED"
      ? "We have not yet confirmed that the mobile money request was accepted. Please wait while we check its status."
      : providerPaymentStatus === "PENDING"
        ? "Sayari accepted the payment request. Check your phone for the mobile money instructions and follow them to complete payment."
        : "We are checking the payment status. Do not submit another payment yet.";

  useEffect(() => {
    let alive = true;
    getSubscriptionPlans().then(async (items) => {
      if (!alive) return;
      setPlans(items);
      setSelectedPlan(items.find((item) => item.code === "half-year")?.id ?? items[0]?.id ?? "");
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!alive) return;
      if (token) {
        const mine = await getMySubscription(token).catch(() => null);
        if (!alive) return;
        if (mine?.hasActiveSubscription && mine.subscription) {
          const active = mine.subscription;
          setActiveSubscription({ planName: active.planName, duration: active.duration, expiresAt: active.expiresAt });
          const upgradePlan = items.find((item) => item.duration > active.duration);
          if (upgradePlan) setSelectedPlan(upgradePlan.id);
        }
        const open = await getOpenSubscriptionPayment(token).catch(() => ({ payment: null }));
      if (open.payment) {
        setPaymentId(open.payment.paymentId);
        setPhoneNumber(open.payment.phoneNumber);
        setProviderPaymentStatus(open.payment.status);
        setPaymentState("WAITING_FOR_PAYMENT");
        }
      }
    }).catch(() => { if (alive) setError("Could not load plans. Check your connection and try again."); })
      .finally(() => { if (alive) setLoadingPlans(false); });
    return () => { alive = false; polling.current = false; };
  }, []);

  useEffect(() => {
    if (paymentState !== "WAITING_FOR_PAYMENT" || pollTimedOut || !paymentId || polling.current) return;
    let cancelled = false;
    polling.current = true;
    void (async () => {
      const started = Date.now();
      while (!cancelled && Date.now() - started < 180000) {
        try {
          const token = await AsyncStorage.getItem("kido.authToken");
          if (!token) throw new Error("Your session has expired. Please sign in again.");
          const current = await getSubscriptionPayment(paymentId, token);
          setProviderPaymentStatus(current.status);
          if (current.phoneNumber) setPhoneNumber(current.phoneNumber);
          const terminal = terminalStates[current.status];
          if (terminal) {
            setError("");
            setPaymentInfo("");
            setPaymentState(terminal);
            if (terminal === "PAYMENT_SUCCESS") {
              const mine = await getMySubscription(token).catch(() => null);
              if (mine?.hasActiveSubscription && mine.subscription) setActiveSubscription({ planName: mine.subscription.planName, duration: mine.subscription.duration, expiresAt: mine.subscription.expiresAt });
            }
            polling.current = false;
            return;
          }
          setPaymentInfo(current.message ?? "");
          if ((current.status === "CREATED" || current.status === "PENDING") && cancelRequested) {
              const cancelled = await cancelSubscriptionPayment(paymentId, token).catch(() => null);
              if (cancelled?.status === "CANCELLED") {
                setProviderPaymentStatus("CANCELLED");
                setPaymentState("PAYMENT_CANCELLED");
                setError("");
                setPaymentInfo("");
                setPhoneNumber("");
                setCancelRequested(false);
                polling.current = false;
                return;
              }
              if (cancelled?.status === "COMPLETED") {
                setProviderPaymentStatus("COMPLETED");
                setPaymentState("PAYMENT_SUCCESS");
                setPaymentInfo("");
                const mine = await getMySubscription(token).catch(() => null);
                if (mine?.hasActiveSubscription && mine.subscription) setActiveSubscription({ planName: mine.subscription.planName, duration: mine.subscription.duration, expiresAt: mine.subscription.expiresAt });
                setCancelRequested(false);
                polling.current = false;
                return;
              }
              if (cancelled?.status === "FAILED" || cancelled?.status === "EXPIRED") {
                setProviderPaymentStatus(cancelled.status);
                setPaymentState(cancelled.status === "FAILED" ? "PAYMENT_FAILED" : "PAYMENT_EXPIRED");
                setPaymentInfo("");
                setError(cancelled.message || "The payment request has ended. You can start a new payment.");
                setCancelRequested(false);
                polling.current = false;
                return;
              }
          }
        } catch (pollError) {
          setError(pollError instanceof Error ? pollError.message : "Could not check payment status.");
        }
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
      if (!cancelled) {
        setPollTimedOut(true);
        if (cancelRequested) {
          setCancelRequested(false);
          setError("Cancellation is still unconfirmed. You can retry it, but a new payment will be available only after Sayari confirms the old request has ended.");
        }
      }
      polling.current = false;
    })();
    return () => { cancelled = true; polling.current = false; };
  }, [paymentId, paymentState, pollCycle, pollTimedOut, cancelRequested]);

  async function submitPayment() {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized || !plan) { setError("Enter a valid Tanzanian mobile number."); return; }
    setError(""); setPaymentState("REQUESTING_PAYMENT");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Sign in to your Kido account before subscribing.");
      const result = await createSubscriptionPayment(plan.id, normalized, token);
      setPaymentId(result.paymentId);
      setPollTimedOut(false);
      setCancelRequested(false);
      setProviderPaymentStatus(result.status);
      setPaymentInfo(result.status === "CREATED" ? result.message : "");
      setPhoneNumber(normalized);
      const terminal = terminalStates[result.status];
      if (terminal) {
        setPaymentState(terminal);
        if (terminal === "PAYMENT_SUCCESS") {
          const mine = await getMySubscription(token).catch(() => null);
          if (mine?.hasActiveSubscription && mine.subscription) setActiveSubscription({ planName: mine.subscription.planName, duration: mine.subscription.duration, expiresAt: mine.subscription.expiresAt });
        }
        return;
      }
      setPaymentState("WAITING_FOR_PAYMENT");
    } catch (paymentError) {
      setPaymentState("PAYMENT_FAILED");
      setProviderPaymentStatus(null);
      setPaymentInfo("");
      setError(paymentError instanceof Error ? paymentError.message : "Could not start the payment. Please try again.");
    }
  }

  function retryPayment() {
    setPaymentId(null); setError(""); setPaymentInfo(""); setProviderPaymentStatus(null); setPhoneNumber(""); setCancelRequested(false); setPaymentState("ENTER_PHONE");
  }

  async function cancelPayment() {
    if (!paymentId || cancellingPayment) return;
    setCancellingPayment(true);
    setCancelRequested(true);
    setError("");
    try {
      const token = await AsyncStorage.getItem("kido.authToken");
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const result = await cancelSubscriptionPayment(paymentId, token);
      if (result.status === "CANCELLED") {
        setProviderPaymentStatus("CANCELLED");
        setPaymentState("PAYMENT_CANCELLED");
        setCancelRequested(false);
        setPollTimedOut(false);
        setError("");
        setPhoneNumber("");
        return;
      }
      if (result.status === "COMPLETED") {
        setProviderPaymentStatus("COMPLETED");
        setPaymentState("PAYMENT_SUCCESS");
        setCancelRequested(false);
        const mine = await getMySubscription(token).catch(() => null);
        if (mine?.hasActiveSubscription && mine.subscription) setActiveSubscription({ planName: mine.subscription.planName, duration: mine.subscription.duration, expiresAt: mine.subscription.expiresAt });
        return;
      }
      if (result.status === "FAILED" || result.status === "EXPIRED") {
        setProviderPaymentStatus(result.status);
        setPaymentState(result.status === "FAILED" ? "PAYMENT_FAILED" : "PAYMENT_EXPIRED");
        setCancelRequested(false);
        setError(result.message || "The payment request has ended. You can start a new payment.");
        return;
      }
      setPollTimedOut(false);
      setPaymentInfo(result.message || "Cancellation is still being confirmed. Please wait before starting another payment.");
      setPollCycle((cycle) => cycle + 1);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not confirm payment cancellation.");
      setPollTimedOut(false);
      setPollCycle((cycle) => cycle + 1);
    } finally {
      setCancellingPayment(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.crownBadge}><AppText style={styles.crown}>♛</AppText></View>
          <AppText style={styles.eyebrow}>KIDO PLUS</AppText>
          <AppText style={styles.title}>Make learning{`\n`}even more fun!</AppText>
          <AppText style={styles.subtitle}>Choose a plan and keep the good learning going.</AppText>
          <View style={styles.perks}>
            <Perk text="Explore every learning land" />
            <Perk text="Enjoy all songs and activities" />
            <Perk text="Support a little learner every day" />
          </View>
        </View>

        {activeSubscription && <View style={styles.successBox}><AppText style={styles.statusTitle}>{activeSubscription.planName} is active</AppText><AppText style={styles.statusText}>Your Kido Plus access is active until {new Date(activeSubscription.expiresAt).toLocaleDateString(language === "SW" ? "sw-TZ" : "en-TZ")}.</AppText></View>}
        <AppText style={styles.sectionTitle}>Choose your plan</AppText>
        <View style={styles.planList}>
          {plans.map((item) => {
            const selected = item.id === selectedPlan;
            const eligiblePlan = !activeSubscription || item.duration > activeSubscription.duration;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: !eligiblePlan }}
                disabled={!eligiblePlan}
                onPress={() => setSelectedPlan(item.id)}
                style={[styles.planCard, selected && styles.selectedPlan, !eligiblePlan && styles.disabledPlan]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <View style={styles.planInfo}>
                  <AppText style={styles.duration}>{item.name}</AppText>
                  <AppText style={styles.planDetail}>{activeSubscription && item.duration === activeSubscription.duration ? "Current plan" : item.duration === 1 ? `${item.currency} ${item.price.toLocaleString("en-TZ")} per month` : item.code === "half-year" ? "Save 17%" : "Best value"}</AppText>
                </View>
                <View style={styles.priceWrap}>
                  <AppText style={styles.price}>{item.price.toLocaleString("en-TZ")}</AppText>
                  <AppText style={styles.currency}>{item.currency}</AppText>
                </View>
                {item.code === "year" && <View style={styles.bestValue}><AppText style={styles.bestValueText}>BEST VALUE</AppText></View>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.paymentCard}>
          <View style={styles.paymentIcon}><AppText style={styles.phoneIcon}>▣</AppText></View>
          <View style={styles.paymentCopy}>
            <AppText style={styles.paymentTitle}>Easy mobile payment</AppText>
            <AppText style={styles.paymentDescription}>Request mobile-money instructions on your phone and pay securely.</AppText>
          </View>
        </View>

        {loadingPlans ? <View style={styles.loading}><ActivityIndicator color="#d89600" /><AppText style={styles.formHint}>Loading plans…</AppText></View> : !plans.length ? <AppText style={styles.error}>Subscription plans are unavailable right now.</AppText> : paymentState === "IDLE" ? activeSubscription ? canUpgrade ? (
          <Pressable style={styles.cta} onPress={() => setPaymentState("ENTER_PHONE")}>
            <AppText style={styles.ctaText}>Upgrade to {plan?.name ?? "a longer plan"} · {formattedPrice} TSh</AppText>
            <AppText style={styles.ctaArrow}>›</AppText>
          </Pressable>
        ) : <View style={styles.successBox}><AppText style={styles.statusTitle}>You’re on the longest plan</AppText><AppText style={styles.statusText}>There are no longer subscription plans available right now.</AppText></View> : (
          <Pressable style={styles.cta} onPress={() => setPaymentState("ENTER_PHONE")}>
            <AppText style={styles.ctaText}>Continue · {formattedPrice} TSh</AppText>
            <AppText style={styles.ctaArrow}>›</AppText>
          </Pressable>
        ) : (
          <View style={styles.paymentForm}>
            <AppText style={styles.formTitle}>Your mobile number</AppText>
            <AppText style={styles.formHint}>{activeSubscription ? "After successful payment, your new plan starts immediately and your remaining current-plan time is added to its expiry." : "We’ll request a mobile-money prompt for this number."}</AppText>
            <View style={styles.inputRow}>
              <AppText style={styles.countryCode}>+255</AppText>
              <TextInput
                accessibilityLabel="Phone number"
                value={phoneNumber}
                onChangeText={(value) => setPhoneNumber(value.slice(0, 16))}
                placeholder="7XX XXX XXX"
                placeholderTextColor="#a89d8f"
                keyboardType="phone-pad"
                maxLength={16}
                style={styles.phoneInput}
              />
            </View>
            {(paymentState === "ENTER_PHONE" || paymentState === "REQUESTING_PAYMENT" || paymentState === "PAYMENT_FAILED" || paymentState === "PAYMENT_EXPIRED" || paymentState === "PAYMENT_CANCELLED" || paymentState === "AMOUNT_MISMATCH") && <Pressable
              accessibilityRole="button"
              disabled={paymentState === "REQUESTING_PAYMENT" || !normalizePhone(phoneNumber)}
              style={[styles.cta, styles.payButton, (!normalizePhone(phoneNumber) || paymentState === "REQUESTING_PAYMENT") && styles.disabledCta]}
              onPress={() => void submitPayment()}
            >
              {paymentState === "REQUESTING_PAYMENT" ? <ActivityIndicator color="#3d2d12" /> : <AppText style={styles.ctaText}>Pay {formattedPrice} TSh</AppText>}
            </Pressable>}
            {paymentState === "WAITING_FOR_PAYMENT" && <View style={styles.statusBox}><AppText style={styles.statusTitle}>{waitingTitle}</AppText><AppText style={styles.statusText}>{waitingMessage}</AppText>{!!paymentInfo && <AppText style={styles.statusText}>{paymentInfo}</AppText>}{!!error && <AppText style={styles.error}>{error}</AppText>}{pollTimedOut && <Pressable onPress={() => { setPollTimedOut(false); setPollCycle((cycle) => cycle + 1); }} style={styles.retryButton}><AppText style={styles.retryText}>Check status again</AppText></Pressable>}{!pollTimedOut && <ActivityIndicator color="#d89600" style={{ marginTop: 12 }} />}{paymentId && <Pressable accessibilityRole="button" disabled={cancellingPayment || cancelRequested} onPress={() => void cancelPayment()} style={[styles.cancelWaitButton, (cancellingPayment || cancelRequested) && styles.disabledCta]}>{cancellingPayment ? <ActivityIndicator color="#75665b" /> : <AppText style={styles.cancelWaitText}>{cancelRequested ? "Canceling payment…" : "Cancel payment"}</AppText>}</Pressable>}</View>}
            {paymentState === "PAYMENT_SUCCESS" && <View style={styles.successBox}><AppText style={styles.statusTitle}>Kido Plus is active!</AppText><AppText style={styles.statusText}>Your payment is confirmed. Happy learning!</AppText></View>}
            {paymentState !== "ENTER_PHONE" && paymentState !== "REQUESTING_PAYMENT" && paymentState !== "WAITING_FOR_PAYMENT" && paymentState !== "PAYMENT_SUCCESS" && <View style={styles.errorBox}><AppText style={styles.statusTitle}>{paymentState === "AMOUNT_MISMATCH" ? "Payment could not be verified" : paymentState === "PAYMENT_EXPIRED" ? "Payment request expired" : paymentState === "PAYMENT_CANCELLED" ? "Payment cancelled" : "Payment failed"}</AppText><AppText style={styles.statusText}>{error || "Your subscription has not been activated. You can try again."}</AppText><Pressable onPress={retryPayment} style={styles.retryButton}><AppText style={styles.retryText}>{paymentState === "PAYMENT_CANCELLED" ? "Start a new payment" : "Try again"}</AppText></Pressable></View>}
            {!!error && paymentState === "ENTER_PHONE" && <AppText style={styles.error}>{error}</AppText>}
          </View>
        )}
        <AppText style={styles.finePrint}>No hidden fees · Cancel anytime</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Perk({ text }: { text: string }) {
  return <View style={styles.perkRow}><View style={styles.check}><Image source={require("../assets/correct2.png")} style={styles.checkImage} resizeMode="contain" /></View><AppText style={styles.perkText}>{text}</AppText></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff9e9" },
  content: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 150 },
  hero: { padding: 22, paddingTop: 18, borderRadius: 28, backgroundColor: "#fff0bf", overflow: "hidden" },
  crownBadge: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#ffc938", marginBottom: 12 },
  crown: { color: "#fff", fontSize: 29, fontFamily: "FredokaBold" },
  eyebrow: { color: "#a66a00", fontFamily: "FredokaBold", letterSpacing: 1.6, fontSize: 12 },
  title: { color: "#352b26", fontFamily: "FredokaBold", fontSize: 31, lineHeight: 36, marginTop: 5 },
  subtitle: { color: "#75665b", fontFamily: "FredokaRegular", fontSize: 15, lineHeight: 21, marginTop: 8 },
  perks: { gap: 9, marginTop: 17 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  check: { width: 21, height: 21, alignItems: "center", justifyContent: "center" },
  checkImage: { width: 21, height: 21 },
  perkText: { color: "#4b453e", fontFamily: "FredokaMedium", fontSize: 14 },
  sectionTitle: { color: "#352b26", fontFamily: "FredokaBold", fontSize: 21, marginTop: 23, marginBottom: 11 },
  planList: { gap: 10 },
  planCard: { minHeight: 76, padding: 14, borderRadius: 18, borderWidth: 2, borderColor: "#eadfca", backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 11 },
  disabledPlan: { opacity: 0.55 },
  selectedPlan: { borderColor: "#f0b92f", backgroundColor: "#fffdf5" },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, borderColor: "#b9ad9a", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: "#e7a900" },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#e7a900" },
  planInfo: { flex: 1 },
  duration: { color: "#352b26", fontFamily: "FredokaBold", fontSize: 17 },
  planDetail: { color: "#80766c", fontFamily: "FredokaRegular", fontSize: 12, marginTop: 2 },
  priceWrap: { alignItems: "flex-end", marginRight: 2 },
  price: { color: "#352b26", fontFamily: "FredokaBold", fontSize: 19 },
  currency: { color: "#80766c", fontFamily: "FredokaMedium", fontSize: 11 },
  bestValue: { position: "absolute", right: 12, top: -9, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#63aa72", borderRadius: 8 },
  bestValueText: { color: "#fff", fontFamily: "FredokaBold", fontSize: 9 },
  paymentCard: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 18, padding: 15, borderRadius: 18, backgroundColor: "#eef7ef", borderWidth: 1, borderColor: "#d7ead9" },
  paymentIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#d6edda", alignItems: "center", justifyContent: "center" },
  phoneIcon: { color: "#3a8651", fontSize: 22, fontFamily: "FredokaBold" },
  paymentCopy: { flex: 1 },
  paymentTitle: { color: "#315b3c", fontFamily: "FredokaBold", fontSize: 15 },
  paymentDescription: { color: "#587360", fontFamily: "FredokaRegular", fontSize: 12, lineHeight: 17, marginTop: 2 },
  cta: { minHeight: 56, borderRadius: 17, marginTop: 16, paddingHorizontal: 18, backgroundColor: "#f2b82d", flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#b47b0c", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  ctaText: { color: "#3d2d12", fontFamily: "FredokaBold", fontSize: 17 },
  ctaArrow: { position: "absolute", right: 18, color: "#3d2d12", fontSize: 27, lineHeight: 30 },
  paymentForm: { marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eadfca" },
  formTitle: { color: "#352b26", fontFamily: "FredokaBold", fontSize: 17 },
  formHint: { color: "#80766c", fontFamily: "FredokaRegular", fontSize: 13, marginTop: 3 },
  inputRow: { minHeight: 54, flexDirection: "row", alignItems: "center", marginTop: 13, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1.5, borderColor: "#ded3c2", backgroundColor: "#fffdf9" },
  countryCode: { color: "#503617", fontFamily: "FredokaBold", fontSize: 16, paddingRight: 12, borderRightWidth: 1, borderRightColor: "#ded3c2" },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, color: "#352b26", fontFamily: "FredokaMedium", fontSize: 16 },
  payButton: { marginTop: 12 },
  disabledCta: { opacity: 0.5 },
  demoNote: { color: "#7b8e7e", fontFamily: "FredokaRegular", fontSize: 11, marginTop: 7 },
  finePrint: { textAlign: "center", color: "#93887b", fontFamily: "FredokaRegular", fontSize: 12, marginTop: 13 },
  loading: { marginTop: 18, alignItems: "center", gap: 8 },
  error: { color: "#a43f36", fontFamily: "FredokaMedium", fontSize: 13, marginTop: 10 },
  statusBox: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: "#fff9e9" },
  successBox: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: "#eaf6ec" },
  errorBox: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: "#fff0ed" },
  statusTitle: { color: "#352b26", fontFamily: "FredokaBold", fontSize: 17 },
  statusText: { color: "#75665b", fontFamily: "FredokaRegular", fontSize: 13, lineHeight: 19, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#f2b82d" },
  retryText: { color: "#3d2d12", fontFamily: "FredokaBold", fontSize: 14 },
  cancelWaitButton: { alignSelf: "flex-start", marginTop: 8, minHeight: 40, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#c9bba5", alignItems: "center", justifyContent: "center" },
  cancelWaitText: { color: "#75665b", fontFamily: "FredokaBold", fontSize: 14 },
});
