
import Head from "expo-router/head";
import WelcomeScreen from "../screens/welcome";

export default function WelcomeRoute() {
  return (
    <>
      <Head>
        <title>Kido – Fun Educational Games for Kids</title>

        <meta
          name="description"
          content="Explore Kido, a fun learning adventure for children with educational games, daily challenges, songs, and interactive learning activities."
        />

        <link
          rel="canonical"
          href="https://kido.co.tz/welcome"
        />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Kido" />
        <meta
          property="og:title"
          content="Kido – Fun Educational Games for Kids"
        />
        <meta
          property="og:description"
          content="Explore magical worlds, solve fun challenges, sing joyful songs, and earn shining stars with Kido."
        />
        <meta
          property="og:url"
          content="https://kido.co.tz/welcome"
        />

        <meta
          name="twitter:card"
          content="summary"
        />
        <meta
          name="twitter:title"
          content="Kido – Fun Educational Games for Kids"
        />
        <meta
          name="twitter:description"
          content="Discover fun educational games and learning adventures with Kido."
        />
      </Head>

      <WelcomeScreen />
    </>
  );
}
