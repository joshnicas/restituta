import AppText from "../app-text";
import { Image, StyleSheet, View } from "react-native";

type TrueFalseQuestionProps = {
  question?: string;
  image?: any;
  isWeb?: boolean;
  textStyle?: any;
  compact?: boolean;
};

export default function TrueFalseQuestion({
  question = "True or False?",
  image,
  isWeb = false,
  textStyle,
  compact = false,
}: TrueFalseQuestionProps) {
  return (
    <View style={[styles.questionContent, isWeb && styles.webQuestionContent, compact && styles.compactQuestionContent]}>
      {image ? (
        <Image
          source={image}
          style={[styles.questionImage, isWeb && styles.webQuestionImage]}
          resizeMode="contain"
        />
      ) : null}
      <AppText
        style={[
          styles.questionText,
          isWeb && styles.webQuestionText,
          textStyle,
        ]}
      >
        {question}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  questionContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 540,
  },
  webQuestionContent: {
    marginTop: 660,
  },
  compactQuestionContent: { marginTop: 0 },
  questionImage: {
    width: 70,
    height: 70,
    marginBottom: 14,
  },
  webQuestionImage: {
    width: 82,
    height: 82,
    marginBottom: 10,
  },
  questionText: {
    alignSelf: "center",
    width: "32%",
    maxWidth: "32%",
    flexShrink: 1,
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    color: "#fffef9",
    fontFamily: "FredokaBold",
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    textShadowColor: "rgba(67, 31, 12, 0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    includeFontPadding: false,
  },
  webQuestionText: {
    marginTop: 0,
    width: "40%",
    maxWidth: "40%",
  },
});
