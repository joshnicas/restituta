import { TextInput as NativeTextInput, type TextInputProps } from "react-native";
import { useKidoLanguage } from "../lib/language-context";
import { translateUiText } from "../lib/ui-translations";

export default function AppTextInput(props: TextInputProps) {
  const { language } = useKidoLanguage();
  return (
    <NativeTextInput
      {...props}
      placeholder={props.placeholder ? translateUiText(props.placeholder, language) : props.placeholder}
    />
  );
}
