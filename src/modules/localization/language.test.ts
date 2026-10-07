import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLanguage, resolveLocalizedText } from "./language";

test("normalizeLanguage defaults to EN and accepts SW", () => {
  assert.equal(normalizeLanguage(undefined), "EN");
  assert.equal(normalizeLanguage("sw"), "SW");
  assert.equal(normalizeLanguage("EN"), "EN");
});

test("resolveLocalizedText falls back from SW to EN to legacy text", () => {
  assert.equal(
    resolveLocalizedText(
      "SW",
      {
        EN: "Which animal gives milk?",
        SW: "Ni mnyama gani anayetoa maziwa?",
      },
      "Which animal gives milk?",
    ),
    "Ni mnyama gani anayetoa maziwa?",
  );

  assert.equal(
    resolveLocalizedText(
      "SW",
      {
        EN: "Which animal gives milk?",
      },
      "Which animal gives milk?",
    ),
    "Which animal gives milk?",
  );

  assert.equal(
    resolveLocalizedText(
      "EN",
      {
        EN: "Which animal gives milk?",
      },
      "Legacy fallback",
    ),
    "Which animal gives milk?",
  );
});
