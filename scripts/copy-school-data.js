const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "../data/necta_psle_2025_nested.json");
const destinationDirectory = path.resolve(__dirname, "../dist/data");
const destination = path.join(destinationDirectory, "necta_psle_2025_nested.json");

fs.mkdirSync(destinationDirectory, { recursive: true });
fs.copyFileSync(source, destination);