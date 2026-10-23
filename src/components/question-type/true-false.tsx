import AppText from "../app-text";
import { StyleSheet, View } from "react-native";
import QuestionPrompt, { getReferencedQuestionImageIndexes } from "./question-prompt";
import ZoomableQuestionImage from "./zoomable-question-image";

type TrueFalseQuestionProps = {
  question?: string;
  image?: any;
  questionImages?: any[];
  isWeb?: boolean;
  textStyle?: any;
  compact?: boolean;
};

export default function TrueFalseQuestion({
  question = "True or False?",
  image,
  questionImages = [],
  isWeb = false,
  textStyle,
  compact = false,
}: TrueFalseQuestionProps) {
  const images = questionImages.length ? questionImages : image ? [image] : [];
  const inlineImageIndexes = getReferencedQuestionImageIndexes(question);
  const inlineImageSet = new Set(inlineImageIndexes);
  const remainingImages = images.filter((_, index) => !inlineImageSet.has(index));
  const imageSize = Math.max(36, Math.min(isWeb ? 82 : 70, 190 / (remainingImages.length + 0.5)));

  return (
    <View style={[styles.questionContent, isWeb && styles.webQuestionContent, compact && styles.compactQuestionContent]}>
      {remainingImages.length > 0 ? (
        <View style={[styles.questionImageRow, isWeb && styles.webQuestionImageRow]}>
          {remainingImages.map((questionImage, index) => (
            <View key={`question-image-${index}`} style={styles.questionImageItem}>
              {index === 3 ? <AppText style={styles.plusSign}>+</AppText> : null}
              <ZoomableQuestionImage
                source={questionImage}
                style={{ width: imageSize, height: imageSize, marginBottom: 14 }}
              />
            </View>
          ))}
        </View>
      ) : null}
      <AppText
        translate={false}
        style={[
          styles.questionText,
          isWeb && styles.webQuestionText,
          textStyle,
        ]}
      >
        <QuestionPrompt
          question={question}
          questionImages={images}
          isWeb={isWeb}
        />
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
    marginTop: 880,
  },
  compactQuestionContent: {
    position: "absolute",
    top: 750,
    marginTop: 0,
  },
  questionImage: {
    width: 70,
    height: 70,
    marginBottom: 14,
  },
  questionImageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    flexWrap: "wrap",
    maxWidth: "100%",
  },
  webQuestionImageRow: { marginBottom: 10 },
  questionImageItem: { flexDirection: "row", alignItems: "center" },
  plusSign: {
    marginHorizontal: 6,
    color: "#fffef9",
    fontFamily: "FredokaBold",
    fontSize: 28,
    textShadowColor: "rgba(67,31,12,0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
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
