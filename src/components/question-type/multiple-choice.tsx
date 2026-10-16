import AppText from "../app-text";
import { Image, StyleSheet, View } from "react-native";
import QuestionPrompt from "./question-prompt";

type MultipleChoiceQuestionProps = {
  question?: string;
  image?: any;
  questionImages?: any[];
  isWeb?: boolean;
  textStyle?: any;
  compact?: boolean;
};

export default function MultipleChoiceQuestion({
  question = "Which one is correct?",
  image,
  questionImages = [],
  isWeb = false,
  textStyle,
  compact = false,
}: MultipleChoiceQuestionProps) {
  const questionImageSize = Math.max(
    36,
    Math.min(isWeb ? 82 : 70, 190 / (questionImages.length + 0.5)),
  );
  const hasInlineImages = /image\(\d+\)/i.test(question);

  return (
    <View style={[styles.questionContent, isWeb && styles.webQuestionContent, compact && styles.compactQuestionContent]}>
      {questionImages.length > 0 && !hasInlineImages ? (
        <View style={[styles.questionImageRow, isWeb && styles.webQuestionImageRow]}>
          {questionImages.map((questionImage, index) => (
            <View key={`${questionImage}-${index}`} style={styles.questionImageItem}>
              {index === 3 ? <AppText style={styles.plusSign}>+</AppText> : null}
              <Image
                source={questionImage}
                style={[
                  styles.questionImage,
                  isWeb && styles.webQuestionImage,
                  { width: questionImageSize, height: questionImageSize },
                ]}
                resizeMode="contain"
              />
            </View>
          ))}
        </View>
      ) : image && !hasInlineImages ? (
        <Image
          source={image}
          style={[styles.questionImage, isWeb && styles.webQuestionImage]}
          resizeMode="contain"
        />
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
          questionImages={questionImages}
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
    marginTop: 660,
  },
  compactQuestionContent: {
    position: "absolute",
    top: 850,
    marginTop: 0,
  },
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
  questionImageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  webQuestionImageRow: {
    marginBottom: 10,
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
    width: "40%",
    maxWidth: "40%",
  },
});
