import { Text as NativeText, type TextProps } from "react-native";
import { useKidoLanguage } from "../lib/language-context";
import { translateUiText, translateUiAttribute } from "../lib/ui-translations";

type AppTextProps = TextProps & { translate?: boolean };

export default function AppText({ children, translate = true, ...props }: AppTextProps) {
  const { language } = useKidoLanguage();
  const localizeText = (value: string) => {
    const translated = translateUiText(value, language);
    if (translated !== value) return translated;
    if (/^Grade \d+$/.test(value)) return value.replace(/^Grade (\d+)$/, "Darasa la $1");
    if (/^\d+s$/.test(value)) return value.replace(/s$/, " sekunde");
    return value;
  };
  const localizedChildren = !translate || language === "EN"
    ? children
    : Array.isArray(children)
      ? children.map((child) => typeof child === "string" ? localizeText(child) : child)
      : typeof children === "string"
        ? localizeText(children)
        : children;
  const localizedProps = language === "SW" && translate
    ? {
        ...props,
        accessibilityLabel: typeof props.accessibilityLabel === "string" ? translateUiAttribute(props.accessibilityLabel, language) : props.accessibilityLabel,
        accessibilityHint: typeof props.accessibilityHint === "string" ? translateUiAttribute(props.accessibilityHint, language) : props.accessibilityHint,
      }
    : props;

  return <NativeText {...localizedProps}>{localizedChildren}</NativeText>;
}
