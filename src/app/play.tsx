import { Platform } from "react-native";
import Head from "expo-router/head";
import PlayLand from "../components/play-land";

export default function Play() {
  return (
    <>
      {Platform.OS === "web" ? (
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          />
        </Head>
      ) : null}
      <PlayLand />
    </>
  );
}
