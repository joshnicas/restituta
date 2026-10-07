import AppText from "../../app-text";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

type SubjectLevelCardProps = {
  isWeb?: boolean;
  subject: string | null;
  level: number;
  pointsRequired?: number;
  timeLimit?: number;
  pointsAcquired?: number;
};

export default function SubjectLevelCard({
  isWeb = false,
  subject,
  level,
  pointsRequired = 0,
  timeLimit = 0,
  pointsAcquired = 0,
}: SubjectLevelCardProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const progress =
    pointsRequired > 0
      ? Math.min(Math.max(pointsAcquired / pointsRequired, 0), 1)
      : pointsAcquired > 0
        ? 1
        : 0;

  return (
    <>
    <Pressable
      onPress={() => setDetailsVisible(true)}
      style={[styles.card, isWeb && styles.webCard]}
      accessibilityLabel={`Subject ${subject ?? "not selected"}, level ${level}`}
      accessibilityRole="button"
    >
      <AppText style={[styles.subject, isWeb && styles.webSubject]}>
        {subject ?? "Select subject"}
      </AppText>
      <AppText style={[styles.level, isWeb && styles.webLevel]}>Level {level}</AppText>
    </Pressable>
    <Modal
      visible={detailsVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setDetailsVisible(false)}
    >
      <View style={styles.backdrop}>
        <View style={[styles.detailsCard, isWeb && styles.webDetailsCard]}>
          <AppText style={styles.detailsTitle}>Level details</AppText>
          <AppText style={styles.detailsSubject}>{subject ?? "Select subject"}</AppText>
          <View style={styles.detailsList}>
            <DetailRow label="Level" value={String(level)} />
            <DetailRow label="Points required" value={`${pointsRequired} XP`} />
            <DetailRow label="Time limit" value={timeLimit > 0 ? `${timeLimit} seconds` : "Not set"} />
            <DetailRow label="Points acquired" value={`${pointsAcquired} XP`} />
          </View>
          <View
            style={styles.progressSection}
            accessibilityLabel={`Points progress ${pointsAcquired} of ${pointsRequired}`}
          >
            <View style={styles.progressHeader}>
              <AppText style={styles.progressLabel}>Level progress</AppText>
              <AppText style={styles.progressValue}>{Math.round(progress * 100)}%</AppText>
            </View>
            <View style={styles.tubeTrack}>
              <View
                style={[styles.tubeFill, { width: `${progress * 100}%` }]}
              />
            </View>
          </View>
          <Pressable
            onPress={() => setDetailsVisible(false)}
            style={styles.closeButton}
            accessibilityRole="button"
          >
            <AppText style={styles.closeButtonText}>Close</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText style={styles.detailLabel}>{label}</AppText>
      <AppText style={styles.detailValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    top: 144,
    left: 18,
    width: 91,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: "rgba(255, 244, 208, 0.92)",
    borderColor: "#f4b942",
    borderWidth: 3,
    borderRadius: 16,
    shadowColor: "#5b3218",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 31,
  },
  webCard: {
    top: 194,
    left: 24,
    width: 160,
    minHeight: 68,
    borderRadius: 20,
  },
  subject: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 14,
    textAlign: "center",
  },
  webSubject: {
    fontSize: 18,
  },
  level: {
    marginTop: 2,
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 12,
    textAlign: "center",
  },
  webLevel: {
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(35, 22, 12, 0.58)",
    zIndex: 1000,
  },
  detailsCard: {
    width: "100%",
    maxWidth: 360,
    padding: 22,
    borderRadius: 24,
    backgroundColor: "#fff4d0",
    borderWidth: 3,
    borderColor: "#f4b942",
    elevation: 12,
  },
  webDetailsCard: {
    maxWidth: 460,
  },
  detailsTitle: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 24,
    textAlign: "center",
  },
  detailsSubject: {
    marginTop: 4,
    marginBottom: 16,
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 17,
    textAlign: "center",
  },
  detailsList: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(107, 74, 40, 0.18)",
  },
  detailLabel: {
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 14,
  },
  detailValue: {
    flex: 1,
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 14,
    textAlign: "right",
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#f4b942",
  },
  closeButtonText: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 15,
  },
  progressSection: {
    marginTop: 18,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  progressLabel: {
    color: "#6b4a28",
    fontFamily: "FredokaMedium",
    fontSize: 13,
  },
  progressValue: {
    color: "#503617",
    fontFamily: "FredokaBold",
    fontSize: 13,
  },
  tubeTrack: {
    height: 18,
    width: "100%",
    padding: 3,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#e6c98a",
    borderWidth: 1,
    borderColor: "#c99535",
  },
  tubeFill: {
    height: "100%",
    minWidth: 0,
    borderRadius: 999,
    backgroundColor: "#35c978",
  },
});
