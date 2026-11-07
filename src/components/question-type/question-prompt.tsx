import AppText from "../app-text";
import { useState } from "react";
import { Image, Pressable, StyleSheet, type ImageSourcePropType } from "react-native";

type QuestionPromptProps = {
  question: string;
  questionImages?: Array<ImageSourcePropType | undefined>;
  isWeb?: boolean;
};

export default function QuestionPrompt({
  question,
  questionImages = [],
  isWeb = false,
}: QuestionPromptProps) {
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const parts = question.split(/(image\(\d+\))/gi);
  const hasInlineImages = parts.length > 1;

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
          width: isWeb ? 70 : 58,
          height: isWeb ? 70 : 58,
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

export function getReferencedQuestionImageIndexes(question: string) {
  return Array.from(question.matchAll(/image\((\d+)\)/gi), (match) => Number(match[1]) - 1)
    .filter((index) => index >= 0);
}
