const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "../data/necta_psle_2025_nested.json");
const zanzibarSource = path.resolve(__dirname, "../data/zec_standard_seven_2025.json");
const destinationDirectory = path.resolve(__dirname, "../dist/data");
const destination = path.join(destinationDirectory, "necta_psle_2025_nested.json");
const zanzibarDestination = path.join(destinationDirectory, "zec_standard_seven_2025.json");
const seededSong = path.resolve(__dirname, "../data/song-assets/morning-beat.mp4");
const songStorage = path.resolve(__dirname, "../storage/app/public/songs");

fs.mkdirSync(destinationDirectory, { recursive: true });
fs.copyFileSync(source, destination);
fs.copyFileSync(zanzibarSource, zanzibarDestination);
fs.mkdirSync(songStorage, { recursive: true });
fs.copyFileSync(seededSong, path.join(songStorage, "morning-beat.mp4"));
