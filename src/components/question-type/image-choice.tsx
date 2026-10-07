import AppText from "../app-text";
import { Image, StyleSheet, View } from "react-native";

type ImageChoiceQuestionProps = {
  question?: string;
  image?: any;
  questionImages?: any[];
  options?: any[];
  isWeb?: boolean;
  textStyle?: any;
  compact?: boolean;
};

export default function ImageChoiceQuestion({
  question = "Which one is correct?",
  image,
  questionImages = [],
  options = [],
  isWeb = false,
  textStyle,
  compact = false,
}: ImageChoiceQuestionProps) {
  const questionImageSize = Math.max(
    36,
    Math.min(isWeb ? 82 : 70, 190 / (questionImages.length + 0.5)),
  );

  return (
    <View style={[styles.questionContent, isWeb && styles.webQuestionContent, compact && styles.compactQuestionContent]}>
      {questionImages.length > 0 ? (
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
      ) : image ? (
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
      {options.length > 0 ? (
        <View style={[styles.optionRow, isWeb && styles.webOptionRow]}>
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
    marginTop: 630,
  },
  compactQuestionContent: { marginTop: 0 },
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
  optionImage: {
    width: 52,
    height: 52,
  },
  webOptionImage: {
    width: 62,
    height: 62,
  },
});
