import AppText from "../app-text";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

type QuestionPromptProps = {
  question: string;
  questionImages?: Array<ImageSourcePropType | undefined>;
  isWeb?: boolean;
  compact?: boolean;
  stackInlineImages?: boolean;
  questionImageScale?: number;
  textStyle?: StyleProp<TextStyle>;
};

export default function QuestionPrompt({
  question,
  questionImages = [],
  isWeb = false,
  compact = false,
  stackInlineImages = false,
  questionImageScale = 1,
  textStyle,
}: QuestionPromptProps) {
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const parts = question.split(/(image\(\d+\))/gi);
  const hasInlineImages = parts.length > 1;

  if (compact || stackInlineImages) {
    const imageIndexes = Array.from(question.matchAll(/image\((\d+)\)/gi), (match) => Number(match[1]) - 1);
    const imageRows = Array.from({ length: Math.ceil(imageIndexes.length / 5) }, (_, row) => imageIndexes.slice(row * 5, row * 5 + 5));
    const promptText = question
      .replace(/image\(\d+\)/gi, " ")
      .replace(/[\t ]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
    return (
      <View style={(compact ? styles.compactPrompt : styles.stackedPrompt) as StyleProp<ViewStyle>}>
        {imageRows.map((row, rowIndex) => (
          <View
            key={`prompt-image-row-${rowIndex}`}
            style={[
              compact ? styles.compactImageRow : styles.stackedImageRow,
              compact && questionImageScale > 1 && { marginVertical: -8 },
            ]}
          >
            {row.map((imageIndex, columnIndex) => {
              const source = questionImages[imageIndex];
              if (!source) return null;
              const key = rowIndex * 5 + columnIndex;
              return (
                <Pressable
                  key={`prompt-image-${key}`}
                  accessibilityRole="button"
                  accessibilityLabel={zoomedImageIndex === key ? "Restore image size" : "Zoom image"}
                  onPress={() => setZoomedImageIndex((current) => current === key ? null : key)}
                  style={[
                    compact ? styles.compactPromptImage : styles.stackedPromptImage,
                    {
                      width: (compact ? 52 : isWeb ? 82 : 58) * questionImageScale,
                      height: (compact ? 52 : isWeb ? 82 : 58) * questionImageScale,
                      marginVertical: compact && questionImageScale > 1 ? -8 : 0,
                    },
                    zoomedImageIndex === key && (compact ? styles.zoomedCompactImage : styles.zoomedStackedPromptImage),
                  ]}
                >
                  <Image source={source} style={StyleSheet.absoluteFill} resizeMode="contain" />
                </Pressable>
              );
            })}
          </View>
        ))}
        {promptText ? <AppText translate={false} style={textStyle}>{promptText}</AppText> : null}
      </View>
    );
  }

  if (!hasInlineImages) return question;

  return <>
    {parts.map((part, index) => {
    const imageMatch = part.match(/^image\((\d+)\)$/i);
    if (!imageMatch) {
      return part ? (
        <AppText translate={false} key={`question-text-${index}`}>
          {part}
        </AppText>
      ) : null;
    }

    const questionImage = questionImages[Number(imageMatch[1]) - 1];
    if (!questionImage) return null;

    return (
        <Pressable
          key={`question-image-${index}`}
          accessibilityRole="button"
          accessibilityLabel={zoomedImageIndex === index ? "Restore image size" : "Zoom image"}
          onPress={() => setZoomedImageIndex((current) => current === index ? null : index)}
          style={{
            width: (compact ? 52 : isWeb ? 70 : 58) * questionImageScale,
            height: (compact ? 52 : isWeb ? 70 : 58) * questionImageScale,
            marginHorizontal: 3,
            transform: [{ scale: zoomedImageIndex === index ? (isWeb ? 2.5 : 2) : 1 }],
            zIndex: zoomedImageIndex === index ? 20 : 0,
          }}
        >
          <Image source={questionImage} style={StyleSheet.absoluteFill} resizeMode="contain" />
        </Pressable>
    );
    })}
  </>;
}

const styles = StyleSheet.create({
  compactPrompt: { width: "100%", alignItems: "center", alignSelf: "center" },
  compactImageRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginVertical: -6 },
  compactPromptImage: { width: 52, height: 52, marginHorizontal: 3, marginVertical: 0 },
  stackedPrompt: { width: "100%", alignItems: "center", alignSelf: "center" },
  stackedImageRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  stackedPromptImage: { marginHorizontal: 3 },
  zoomedCompactImage: { transform: [{ scale: 1.5 }], zIndex: 20 },
  zoomedStackedPromptImage: { transform: [{ scale: 2.5 }], zIndex: 20 },
});

export function getReferencedQuestionImageIndexes(question: string) {
  return Array.from(question.matchAll(/image\((\d+)\)/gi), (match) => Number(match[1]) - 1)
    .filter((index) => index >= 0);
}
