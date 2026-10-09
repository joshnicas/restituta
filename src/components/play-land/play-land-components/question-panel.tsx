import AppText from "../../app-text";
import { useEffect, useState } from "react";
import {
    Animated,
    Image,
    ImageSourcePropType,
    StyleSheet,
    View,
    type StyleProp,
    type TextStyle,
    type ViewStyle,
} from "react-native";
import ImageChoiceQuestion from "../../question-type/image-choice";
import MultipleChoiceQuestion from "../../question-type/multiple-choice";
import TrueFalseQuestion from "../../question-type/true-false";

type QuestionType =
  | "multiple-choice"
  | "true-false"
  | "image-choice";

type QuestionPanelProps = {
  panelDrop: Animated.Value;
  panelSource?: ImageSourcePropType;
  blinkEyesSource?: ImageSourcePropType;
  blinkEyesScale?: number;
  panelScale?: number;
  panelHeightScale?: number;
  panelOffsetY?: number;
  panelContentOffsetY?: number;
  isWeb?: boolean;
  question?: string;
  image?: any;
  questionImages?: any[];
  options?: any[];
  questionType?: QuestionType;
  showQuestion?: boolean;
  feedback?: string | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  compact?: boolean;
};

export default function QuestionPanel({
  panelDrop,
  panelSource,
  blinkEyesSource,
  blinkEyesScale = 0.7,
  panelScale = 1,
  panelHeightScale = 1,
  panelOffsetY = 0,
  panelContentOffsetY = 0,
  isWeb = false,
  question = "Which animal is this?",
  image,
  questionImages,
  options,
  questionType = "multiple-choice",
  showQuestion = false,
  feedback = null,
  style,
  textStyle,
  compact = false,
}: QuestionPanelProps) {
  const panelContentScale = panelScale === 0 ? 1 : 1 / panelScale;
  const blinkFrameWidth = 507 * blinkEyesScale;
  const blinkFrameHeight = 374 * blinkEyesScale;
  const [blinkFrame, setBlinkFrame] = useState(0);

  useEffect(() => {
    if (!blinkEyesSource) return;

    const interval = setInterval(() => {
      setBlinkFrame((frame) => (frame + 1) % 5);
    }, 180);

    return () => clearInterval(interval);
  }, [blinkEyesSource]);
  const webLayerStyles = isWeb
    ? {
        questionPanel: {
          left: "50%",
          marginLeft: -485,
          bottom: 40,
          width: 970,
          height: 1080,
        },
      }
    : {};

  return (
    <Animated.View
      style={[
        styles.questionPanel,
        isWeb && webLayerStyles.questionPanel,
        {
          transform: [
            {
              translateY: Animated.add(
                panelDrop,
                (isWeb ? 18 : 0) + panelOffsetY,
              ),
            },
            { scale: panelScale },
          ],
        },
        style,
      ]}
    >
      <View style={styles.panelImage}>
        <Image
          source={
            panelSource ??
            require("../../../assets/lands/kilimanjaro/question-panel.png")
          }
          style={[
            styles.panelBackground,
            { transform: [{ scaleY: panelHeightScale }] },
          ]}
          resizeMode="contain"
        />
        <View
          style={[
            styles.panelContent,
            {
              transform: [
                { translateY: panelContentOffsetY / panelScale },
                { scale: panelContentScale },
              ],
            },
          ]}
        >
          {blinkEyesSource && (
            <View style={styles.blinkEyesViewport} pointerEvents="none">
              <Image
                source={blinkEyesSource}
                style={[
                  styles.blinkEyesSprite,
                  {
                    width: 2535 * blinkEyesScale,
                    height: blinkFrameHeight,
                    transform: [{ translateX: -blinkFrame * blinkFrameWidth }],
                  },
                ]}
                resizeMode="stretch"
              />
            </View>
          )}
          {showQuestion && (
            <>
              {questionType === "true-false" ? (
                <TrueFalseQuestion
                  question={question}
                  image={image}
                  isWeb={isWeb}
                  textStyle={textStyle}
                  compact={compact}
                />
              ) : questionType === "image-choice" ? (
                <ImageChoiceQuestion
                  question={question}
                  image={image}
                  questionImages={questionImages}
                  options={options}
                  isWeb={isWeb}
                  textStyle={textStyle}
                  compact={compact}
                />
              ) : (
                <MultipleChoiceQuestion
                  question={question}
                  image={image}
                  questionImages={questionImages}
                  isWeb={isWeb}
                  textStyle={textStyle}
                  compact={compact}
                />
              )}
            </>
          )}
          {showQuestion && feedback ? (
            <View
              style={[
                styles.feedbackContainer,
                isWeb ? { top: 950 } : { bottom: 70 },
              ]}
            >
              <AppText
                style={[
                  styles.feedbackText,
                  feedback.toLowerCase() === "correct"
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong,
                ]}
              >
                {feedback}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  questionPanel: {
    position: "absolute",
    bottom: 220,
    left: "50%",
    marginLeft: -480,
    width: 960,
    height: 850,
    zIndex: 12,
  },
  panelImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  panelBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  panelContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  blinkEyesViewport: {
    position: "absolute",
    top: 160,
    left: "50%",
    width: 507 * 0.7,
    height: 374 * 0.7,
    marginLeft: -(507 * 0.7) / 2,
    overflow: "hidden",
    zIndex: 1,
  },
  blinkEyesSprite: {
    width: 2535,
    height: 374,
  },
  questionContent: {
    width: "100%",
    
    alignItems: "center",
    justifyContent: "center",
    marginTop: 510,
  },
  webQuestionContent: {
    marginTop: 630,
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
  questionText: {
    alignSelf: "center",
    width: "28%",
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
  },
  feedbackText: {
    fontFamily: "FredokaBold",
    fontSize: 28,
    textAlign: "center",
    includeFontPadding: false,
    paddingHorizontal: 8,
  },
  feedbackCorrect: {
    color: "#2ecc71",
  },
  feedbackWrong: {
    color: "#e74c3c",
  },
  feedbackTextAbsolute: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -0.14 * 960 }],
    width: "28%",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    color: "#fffef9",
    fontFamily: "FredokaBold",
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    includeFontPadding: false,
  },
  feedbackContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
});
