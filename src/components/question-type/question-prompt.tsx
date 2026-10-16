import AppText from "../app-text";
import { Image, type ImageSourcePropType } from "react-native";

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
  const parts = question.split(/(image\(\d+\))/gi);
  const hasInlineImages = parts.length > 1;

  if (!hasInlineImages) return question;

  return parts.map((part, index) => {
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
      <Image
        key={`question-image-${index}`}
        source={questionImage}
        style={{
          width: isWeb ? 70 : 58,
          height: isWeb ? 70 : 58,
          marginHorizontal: 3,
          verticalAlign: "middle",
        }}
        resizeMode="contain"
      />
    );
  });
}
