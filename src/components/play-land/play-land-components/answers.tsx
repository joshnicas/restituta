import AppText from "../../app-text";
import { useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

type AnswersProps = {
  answers?: string[];
  reveal?: Animated.Value;
  isWeb?: boolean;
  correctAnswer?: string;
  questionType?:
    | "multiple-choice"
    | "true-false"
    | "image-choice";
  answerImages?: any[];
  answerBoardSource?: ImageSourcePropType;
  onAnswer?: (isCorrect: boolean) => void;
  onAnswerSelected?: (answer: string, index: number) => void;
  serverFeedback?: boolean;
};

export default function Answers({
  answers = ["A", "B", "C"],
  reveal = new Animated.Value(1),
  isWeb = false,
  correctAnswer = undefined,
  questionType = "multiple-choice",
  answerImages,
  answerBoardSource,
  onAnswer = undefined,
  onAnswerSelected,
  serverFeedback = false,
}: AnswersProps) {
  const { width } = useWindowDimensions();
  const gap = isWeb ? -50 : 10;
  const [selected, setSelected] = useState<number | null>(null);
  const isTrueFalse = questionType === "true-false";
  const nativeAnswerWidth = 140;
  const nativeAnswerGap = width >= 500 ? 2 : -25;
  const nativeAnswerGroupWidth =
    answers.length * nativeAnswerWidth +
    Math.max(answers.length - 1, 0) * nativeAnswerGap;

  function handlePress(i: number) {
    if (selected !== null) return;
    const answer = answers[i];
    const isCorrect = correctAnswer
      ? answer.toLowerCase() === correctAnswer.toLowerCase()
      : false;
    setSelected(i);
    onAnswerSelected?.(answer, i);
    if (onAnswer) onAnswer(isCorrect);
  }

  const answerValues = answers.map((answer) =>
    answer.toLowerCase() === "true"
      ? "True"
      : answer.toLowerCase() === "false"
        ? "False"
        : answer,
  );

  if (questionType === "true-false") {
    return (
      <View
        style={[
          styles.trueFalseContainer,
          isWeb && styles.trueFalseContainerWeb,
        ]}
      >
        {answerValues.map((answer, index) => {
          const isSelected = selected === index;
          const isCorrect =
            correctAnswer &&
            answer.toLowerCase() === correctAnswer.toLowerCase();
          const showCorrect = isSelected && isCorrect;
          const showWrong = isSelected && !isCorrect && (!serverFeedback || correctAnswer !== undefined);

          return (
            <Animated.View
              key={`${answer}-${index}`}
              style={{
                opacity: reveal,
                transform: [
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [26, 0],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                onPress={() => handlePress(index)}
                style={({ pressed }) => [
                  styles.trueFalseButton,
                  isWeb && styles.trueFalseButtonWeb,
                  (pressed || selected !== null) && { opacity: 0.9 },
                ]}
                disabled={selected !== null}
              >
                <Image
                  source={
                    answerBoardSource ??
                    require("../../../assets/lands/kilimanjaro/answer-board.png")
                  }
                  style={styles.trueFalseBoard}
                  resizeMode="contain"
                />
                <AppText translate={false} style={styles.answerText}>{answer}</AppText>
                {showCorrect && (
                  <Image
                    source={require("../../../assets/lands/kilimanjaro/correct.png")}
                    style={styles.feedbackImage}
                    resizeMode="contain"
                  />
                )}
                {showWrong && (
                  <Image
                    source={require("../../../assets/lands/kilimanjaro/wrong.png")}
                    style={styles.feedbackImage}
                    resizeMode="contain"
                  />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    );
  }

  if (questionType === "image-choice") {
    const imageOptions =
      answerImages && answerImages.length ? answerImages : [];

    return (
      <View
        style={[
          styles.imageChoiceContainer,
          isWeb && styles.imageChoiceContainerWeb,
        ]}
      >
        {answers.map((answer, index) => {
          const optionImage = imageOptions[index];
          const isSelected = selected === index;
          const isCorrect = correctAnswer
            ? answer.toLowerCase() === correctAnswer.toLowerCase()
            : false;
          const showCorrect = isSelected && isCorrect;
          const showWrong = isSelected && !isCorrect && (!serverFeedback || correctAnswer !== undefined);

          return (
            <Animated.View
              key={`${answer}-${index}`}
              style={{
                opacity: reveal,
                transform: [
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [26, 0],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                onPress={() => handlePress(index)}
                style={({ pressed }) => [
                  styles.imageChoiceButton,
                  isWeb && styles.imageChoiceButtonWeb,
                  (pressed || selected !== null) && { opacity: 0.9 },
                ]}
                disabled={selected !== null}
              >
                {optionImage ? (
                  <Image
                    source={optionImage}
                    style={styles.imageChoiceOption}
                    resizeMode="contain"
                  />
                ) : null}
                {showCorrect && (
                  <Image
                    source={require("../../../assets/lands/kilimanjaro/correct.png")}
                    style={styles.feedbackImage}
                    resizeMode="contain"
                  />
                )}
                {showWrong && (
                  <Image
                    source={require("../../../assets/lands/kilimanjaro/wrong.png")}
                    style={styles.feedbackImage}
                    resizeMode="contain"
                  />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {answers.map((answer, index) => {
        const isSelected = selected === index;
        const isCorrect = correctAnswer
          ? answer.toLowerCase() === correctAnswer.toLowerCase()
          : false;
        const showCorrect = isSelected && isCorrect;
        const showWrong = isSelected && !isCorrect && (!serverFeedback || correctAnswer !== undefined);

        return (
          <Animated.View
            key={`${answer}-${index}`}
            style={[
              styles.answerSlot,
              isWeb && styles.webAnswerSlot,
              {
                opacity: reveal,
                transform: [
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [26, 0],
                    }),
                  },
                  {
                    translateX: isWeb ? index * (140 + gap) : 0,
                  },
                ],
                left: isWeb ? undefined : "50%",
                marginLeft: isWeb
                  ? 0
                  : -nativeAnswerGroupWidth / 2 +
                    index * (nativeAnswerWidth + nativeAnswerGap),
                bottom: isWeb ? undefined : -30 + index * 2,
                right: isWeb ? 140 + (2 - index) * (140 + gap) : undefined,
              },
            ]}
          >
            <Pressable
              onPress={() => handlePress(index)}
              style={({ pressed }) => [
                styles.pressable,
                (pressed || selected !== null) && { opacity: 0.85 },
              ]}
              disabled={selected !== null}
            >
              <Image
                source={
                  answerBoardSource ??
                  require("../../../assets/lands/kilimanjaro/answer-board.png")
                }
                style={styles.answerBoard}
                resizeMode="contain"
              />
              <AppText translate={false} style={styles.answerText}>{answer}</AppText>
              {showCorrect && (
                <Image
                  source={require("../../../assets/lands/kilimanjaro/correct.png")}
                  style={styles.feedbackImage}
                  resizeMode="contain"
                />
              )}
              {showWrong && (
                <Image
                  source={require("../../../assets/lands/kilimanjaro/wrong.png")}
                  style={styles.feedbackImage}
                  resizeMode="contain"
                />
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 100,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
  },
  answerSlot: {
    position: "absolute",
    width: 140,
    height: 106,
    alignItems: "center",
    bottom: 70,
  },
  webAnswerSlot: {
    width: 180,
    height: 106,
  },
  answerBoard: {
    position: "absolute",
    width: "100%",
    height: "100%",

  },
  answerText: {
    position: "relative",
    zIndex: 1,
    color: "#fff",
    fontSize: 24,
    fontFamily: "FredokaBold",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pressable: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  feedback: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  feedbackCorrect: {
    backgroundColor: "#2ecc71",
  },
  feedbackWrong: {
    backgroundColor: "#e74c3c",
  },
  feedbackText: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 20,
  },
  feedbackImage: {
    position: "absolute",
    right: 20,
    top: 30,
    width: 28,
    height: 28,
    zIndex: 5,
    backgroundColor: "white",
    borderRadius: 14,
  },
  trueFalseContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 70,
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    zIndex: 20,
  },
  trueFalseContainerWeb: {
    left: 0,
    right: 0,
  },
  trueFalseButton: {
    width: 150,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  trueFalseButtonWeb: {
    width: 180,
    height: 94,
  },
  trueFalseBoard: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  imageChoiceContainer: {
    position: "absolute",
    right: 20,
    gap: 5,
    bottom: 70,
    flexDirection: "row",
    justifyContent: "center",
    zIndex: 20,
  },
  imageChoiceContainerWeb: {
    right: 90,
  },
  imageChoiceButton: {
    width: 108,
    height: 92,

    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 3,
    borderColor: "#f3d789",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  imageChoiceButtonWeb: {
    width: 150,
    height: 100,
  },
  imageChoiceBoard: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  imageChoiceOption: {
    width: 76,
    height: 76,
    zIndex: 1,
  },
});
