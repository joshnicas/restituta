import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { SelectedPlayer } from "../lib/selected-player";

type PlayerAvatarProps = {
  player: SelectedPlayer;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
};

const playerImages = {
  1: require("../assets/players/profile.png"),
  2: require("../assets/players/profile2.png"),
  4: require("../assets/players/profile4.png"),
} as const;

export default function PlayerAvatar({ player, width, height, style }: PlayerAvatarProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      {player === 3 || player === 4 ? (
        <Image
          source={player === 3 ? require("../assets/players/profile3.png") : playerImages[4]}
          resizeMode="stretch"
          style={styles.image}
        />
      ) : (
        <Image source={playerImages[player]} resizeMode="contain" style={styles.image} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
