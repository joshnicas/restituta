import AppText from "../app-text";
import { Image, StyleSheet, View } from "react-native";
import QuestionPrompt, { getReferencedQuestionImageIndexes } from "./question-prompt";
import ZoomableQuestionImage from "./zoomable-question-image";

type ImageChoiceQuestionProps = {
  question?: string;
  image?: any;
  questionImages?: any[];
  options?: any[];
  isWeb?: boolean;
  textStyle?: any;
  compact?: boolean;
  questionImageScale?: number;
};

export default function ImageChoiceQuestion({
  question = "Which one is correct?",
  image,
  questionImages = [],
  options = [],
  isWeb = false,
  textStyle,
  compact = false,
  questionImageScale = 1,
}: ImageChoiceQuestionProps) {
  const inlineImageIndexes = getReferencedQuestionImageIndexes(question);
  const inlineImageSet = new Set(inlineImageIndexes);
  const remainingQuestionImages = questionImages.filter((_, index) => !inlineImageSet.has(index));
  const questionImageSize = Math.max(
    36,
    Math.min(isWeb ? 82 : 70, 190 / (remainingQuestionImages.length + 0.5)),
  ) * questionImageScale;

  return (
    <View style={[styles.questionContent, isWeb && styles.webQuestionContent, compact && styles.compactQuestionContent]}>
      {remainingQuestionImages.length > 0 ? (
        <View style={[styles.questionImageRow, isWeb && styles.webQuestionImageRow, compact && styles.compactQuestionImageRow]}>
          {remainingQuestionImages.map((questionImage, index) => (
            <View key={`question-image-${index}`} style={styles.questionImageItem}>
              {index === 3 ? <AppText style={styles.plusSign}>+</AppText> : null}
              <ZoomableQuestionImage
                source={questionImage}
                style={[
                  styles.questionImage,
                  isWeb && styles.webQuestionImage,
                  { width: questionImageSize, height: questionImageSize },
                ]}
              />
            </View>
          ))}
        </View>
      ) : image && questionImages.length === 0 && inlineImageIndexes.length === 0 ? (
        <ZoomableQuestionImage
          source={image}
          style={[styles.questionImage, isWeb && styles.webQuestionImage, { transform: [{ scale: questionImageScale }] }]}
        />
      ) : null}
      {compact ? <QuestionPrompt
        question={question}
        questionImages={questionImages.length ? questionImages : [image]}
        isWeb={isWeb}
        compact
        questionImageScale={questionImageScale}
        textStyle={[styles.questionText, styles.webQuestionText, styles.compactQuestionText, textStyle]}
      /> : <AppText
        translate={false}
        style={[
          styles.questionText,
          isWeb && styles.webQuestionText,
          compact && styles.compactQuestionText,
          textStyle,
        ]}
      >
        <QuestionPrompt
          question={question}
          questionImages={questionImages.length ? questionImages : [image]}
          isWeb={isWeb}
          compact={compact}
          questionImageScale={questionImageScale}
        />
      </AppText>}
      {options.length > 0 ? (
        <View style={[styles.optionRow, isWeb && styles.webOptionRow, compact && styles.compactOptionRow]}>
          {options.map((option, index) => (
            <Image
              key={`${option}-${index}`}
              source={option}
              style={[styles.optionImage, isWeb && styles.webOptionImage]}
              resizeMode="contain"
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  questionContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 500,
  },
  webQuestionContent: {
    marginTop: 880,
  },
  compactQuestionContent: {
    position: "absolute",
    top: 780,
    marginTop: 0,
    left: "28%",
    right: "28%",
    width: "auto",
  },
  questionImage: {
    width: 70,
    height: 70,
    marginBottom: 10,
  },
  webQuestionImage: {
    width: 82,
    height: 82,
    marginBottom: 10,
  },
  questionImageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  webQuestionImageRow: {
    marginBottom: 10,
  },
  compactQuestionImageRow: {
    width: "100%",
    maxWidth: "100%",
    flexWrap: "wrap",
  },
  compactQuestionText: {
    width: "82%",
    maxWidth: "82%",
    flexShrink: 1,
    fontSize: 23,
    lineHeight: 29,
    paddingHorizontal: 8,
  },
  questionImageItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  plusSign: {
    marginHorizontal: 6,
    color: "#fffef9",
    fontFamily: "FredokaBold",
    fontSize: 28,
    textShadowColor: "rgba(67,31,12,0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
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
    width: "32%",
    maxWidth: "32%",
    fontSize: 23,
    lineHeight: 29,
    paddingHorizontal: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  },
  webOptionRow: {
    gap: 20,
  },
  compactOptionRow: {
    flexWrap: "wrap",
    maxWidth: "100%",
  },
  optionImage: {
    width: 52,
    height: 52,
  },
  webOptionImage: {
    width: 62,
    height: 62,
  },
});
