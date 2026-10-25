import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import KidoAnimatedLogo from "../components/kido-animated-logo";
import { useDarkTheme } from "../lib/use-dark-theme";

const EMAIL = "info@sayarisoftware.com";
const EMAIL_SUBJECT = "Kido Account and Data Deletion Request";

const SECTIONS = [
  {
    title: "How to request account deletion",
    paragraphs: [
      "To request deletion of a Kido account:",
    ],
    bullets: [
      "Send an email to info@sayarisoftware.com.",
      `Use the subject line “${EMAIL_SUBJECT}”.`,
      "Include the email address or username associated with the Kido account so we can identify it.",
      "If the request concerns a child's account, a parent or legal guardian may submit the request. We may ask for reasonable information to verify their authority.",
    ],
    footer: "Please do not send passwords or payment-card details. We will review the request, explain any necessary next steps, and process valid requests within the period required by applicable law.",
  },
  {
    title: "What data will be deleted?",
    paragraphs: [
      "When a valid account-deletion request is approved, Kido will delete the associated personal information that it is required to delete, where applicable. This may include:",
    ],
    bullets: [
      "Account information, such as a name, username, or email address.",
      "Learning progress and learning history.",
      "Quiz answers, scores, and achievements associated with the account.",
      "User preferences and application settings linked to the account.",
      "Other personal information associated with the account that is not required to be retained.",
    ],
    footer: "The specific information deleted will depend on the information associated with the account and applicable legal requirements.",
  },
  {
    title: "Data that may be retained",
    paragraphs: [
      "Certain records may need to be retained for a limited period to comply with legal obligations, maintain required transaction records, resolve disputes, protect service security, or prevent fraud.",
      "Where information must be retained, we will limit its use and retention in accordance with applicable law. We will not retain personal information longer than reasonably necessary for the permitted purpose.",
    ],
  },
  {
    title: "Subscriptions and payments",
    paragraphs: [
      "If a Kido account has an active subscription, the user may need to cancel it separately through the relevant payment provider to prevent future charges.",
      "Deleting a Kido account does not automatically cancel a subscription unless the relevant subscription service confirms that it does.",
      "Payment providers may retain certain transaction records under their own policies and applicable legal requirements.",
    ],
  },
  {
    title: "Can I request data deletion without deleting my account?",
    paragraphs: [
      `Contact ${EMAIL} to ask whether specific personal information can be deleted while keeping your Kido account active.`,
      "Requests will be assessed according to the type of information involved, the services provided, and applicable legal requirements. Not all information can necessarily be deleted independently of an account.",
    ],
  },
  {
    title: "Contact information",
    paragraphs: ["For account deletion, data deletion, or privacy questions:"],
    bullets: [
      "App name: Kido",
      "Operator: SAYARI SOFTWARE",
      `Privacy contact: ${EMAIL}`,
      "Country: Tanzania",
      "Website: sayarisoftware.com",
      `Email subject: ${EMAIL_SUBJECT}`,
    ],
    footer: "Kido is committed to handling account-deletion requests responsibly and protecting the privacy of children and families.",
  },
];

export default function AccountDeletionScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 860;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const openEmail = () => {
    void Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`);
  };

  const openWebsite = () => {
    void Linking.openURL("https://sayarisoftware.com/");
  };

  return (
    <SafeAreaView style={[styles.safeArea, darkTheme && styles.darkSafeArea]}>
      <View style={[styles.header, isLargeScreen && styles.headerWide, darkTheme && styles.darkSurface]}>
        <Pressable
          style={[styles.backButton, darkTheme && styles.darkControl]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppText translate={false} style={[styles.backButtonText, darkTheme && styles.lightText]}>
            ← Back
          </AppText>
        </Pressable>
        <KidoAnimatedLogo capHeight={32} />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, isLargeScreen && styles.containerWide]}>
          <View style={[styles.hero, darkTheme && styles.darkSurface]}>
            <AppText translate={false} style={styles.eyebrow}>KIDO · SAYARI SOFTWARE · TANZANIA</AppText>
            <AppText translate={false} style={[styles.title, darkTheme && styles.lightText]}>
              Account and Data Deletion
            </AppText>
            <AppText translate={false} style={[styles.intro, darkTheme && styles.mutedDarkText]}>
              Kido users and parents or legal guardians can request deletion of a Kido account and its associated personal information by following these instructions.
            </AppText>
            <Pressable style={styles.primaryButton} onPress={openEmail} accessibilityRole="button">
              <AppText translate={false} style={styles.primaryButtonText}>✉  Email deletion request</AppText>
            </Pressable>
            <AppText translate={false} style={[styles.subjectText, darkTheme && styles.mutedDarkText]}>
              Subject: {EMAIL_SUBJECT}
            </AppText>
          </View>

          {SECTIONS.map((section, index) => (
            <View key={section.title} style={[styles.section, darkTheme && styles.darkSurface]}>
              <View style={styles.sectionHeading}>
                <View style={styles.numberBadge}>
                  <AppText translate={false} style={styles.numberText}>{index + 1}</AppText>
                </View>
                <AppText translate={false} style={[styles.sectionTitle, darkTheme && styles.lightText]}>
                  {section.title}
                </AppText>
              </View>
              {section.paragraphs.map((paragraph) => (
                <AppText key={paragraph} translate={false} style={[styles.paragraph, darkTheme && styles.mutedDarkText]}>
                  {paragraph}
                </AppText>
              ))}
              {section.bullets?.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <AppText translate={false} style={styles.bulletMark}>•</AppText>
                  <AppText translate={false} style={[styles.bulletText, darkTheme && styles.mutedDarkText]}>
                    {bullet}
                  </AppText>
                </View>
              ))}
              {section.footer && (
                <AppText translate={false} style={[styles.sectionFooter, darkTheme && styles.mutedDarkText]}>
                  {section.footer}
                </AppText>
              )}
              {index === 4 && (
                <Pressable onPress={openEmail} accessibilityRole="link" style={styles.inlineLink}>
                  <AppText translate={false} style={styles.linkText}>{EMAIL}</AppText>
                </Pressable>
              )}
              {index === 5 && (
                <View style={styles.contactActions}>
                  <Pressable onPress={openEmail} accessibilityRole="link" style={styles.secondaryButton}>
                    <AppText translate={false} style={styles.secondaryButtonText}>{EMAIL}</AppText>
                  </Pressable>
                  <Pressable onPress={openWebsite} accessibilityRole="link" style={styles.secondaryButton}>
                    <AppText translate={false} style={styles.secondaryButtonText}>Visit sayarisoftware.com ↗</AppText>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FDF8F0" },
  darkSafeArea: { backgroundColor: "#0F172A" },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(80, 54, 23, 0.08)",
  },
  headerWide: { maxWidth: 960, width: "100%", alignSelf: "center", marginTop: 8 },
  headerSpacer: { width: 60 },
  backButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#F3F4F6", borderRadius: 12 },
  backButtonText: { fontFamily: "FredokaBold", fontSize: 13, color: "#4B5563" },
  container: { width: "100%", paddingHorizontal: 18, paddingTop: 20 },
  containerWide: { maxWidth: 900, alignSelf: "center", paddingHorizontal: 24 },
  hero: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 8,
    borderTopWidth: 4,
    borderTopColor: "#F59E0B",
    marginBottom: 16,
  },
  eyebrow: { fontFamily: "FredokaBold", color: "#B45309", fontSize: 12, marginBottom: 8 },
  title: { fontFamily: "FredokaBold", color: "#451A03", fontSize: 28, marginBottom: 10 },
  intro: { fontFamily: "FredokaRegular", color: "#4B5563", fontSize: 15, lineHeight: 23, marginBottom: 18 },
  primaryButton: { alignSelf: "flex-start", backgroundColor: "#D97706", paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8 },
  primaryButtonText: { fontFamily: "FredokaBold", color: "#FFFFFF", fontSize: 14 },
  subjectText: { fontFamily: "FredokaMedium", color: "#6B7280", fontSize: 12, lineHeight: 18, marginTop: 10 },
  section: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 8, marginBottom: 12 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  numberBadge: { width: 28, height: 28, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7", borderRadius: 14 },
  numberText: { fontFamily: "FredokaBold", color: "#92400E", fontSize: 13 },
  sectionTitle: { flex: 1, fontFamily: "FredokaBold", color: "#451A03", fontSize: 18 },
  paragraph: { fontFamily: "FredokaRegular", color: "#374151", fontSize: 14, lineHeight: 22, marginBottom: 10 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginBottom: 7 },
  bulletMark: { fontFamily: "FredokaBold", color: "#D97706", fontSize: 16, lineHeight: 21 },
  bulletText: { flex: 1, fontFamily: "FredokaRegular", color: "#374151", fontSize: 14, lineHeight: 21 },
  sectionFooter: { fontFamily: "FredokaMedium", color: "#4B5563", fontSize: 13, lineHeight: 21, marginTop: 8 },
  inlineLink: { alignSelf: "flex-start", marginTop: 2 },
  linkText: { fontFamily: "FredokaBold", color: "#B45309", fontSize: 14, textDecorationLine: "underline" },
  contactActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  secondaryButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#D97706" },
  secondaryButtonText: { fontFamily: "FredokaBold", color: "#B45309", fontSize: 13 },
  darkSurface: { backgroundColor: "#1E293B", borderColor: "rgba(255, 255, 255, 0.08)" },
  darkControl: { backgroundColor: "#334155" },
  lightText: { color: "#F8FAFC" },
  mutedDarkText: { color: "#CBD5E1" },
});