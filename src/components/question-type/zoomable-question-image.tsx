import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type ZoomableQuestionImageProps = {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
};

export default function ZoomableQuestionImage({ source, style }: ZoomableQuestionImageProps) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={zoomed ? "Restore image size" : "Zoom image to twice its size"}
      onPress={() => setZoomed((value) => !value)}
      style={[style, zoomed && styles.zoomed]}
    >
      <Image source={source} style={StyleSheet.absoluteFill} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zoomed: {
    transform: [{ scale: 2 }],
    zIndex: 20,
    elevation: 20,
  },
});
