# Kido logo animation assets

## PNG assets
- `kido_k.png` — K
- `kido_i_stem.png` — lowercase i stem, without its dot
- `kido_i_dot.png` — separate dot for the i
- `kido_d.png` — D
- `kido_o.png` — O

All pieces are individual RGBA PNGs with transparent backgrounds and a small transparent safety margin. They are intended to be layered/animated in the Kido splash screen.

## Codex implementation prompt

Implement a polished Kido logo entrance animation in the existing Expo React Native app, using the PNG assets in `src/assets/logo/`. Do not replace or interfere with the existing water-splash Lottie animation.

### Trigger and sequence
1. Let the existing water-splash Lottie play exactly as it does now.
2. Start the logo animation only after the Lottie reports `onAnimationFinish` (or the project's existing reliable completion callback). Avoid arbitrary timers as the primary trigger.
3. Animate the separate logo pieces into their final positions:
   - `K` and `D` enter subtly from the left/near their final positions, settling with a small overshoot.
   - The lowercase `i` stem appears in its final position.
   - The `O` enters from the right side and slides into the final position beside `D`, with a little spring/overshoot.
   - The `i` dot drops in from above, lands on the stem, bounces once, then settles precisely in place.
4. Once every piece has settled, reveal the complete wordmark `KIDO` together with a short opacity/scale reveal (scale about 0.96 to 1, opacity 0 to 1 over roughly 250–350 ms). The finished wordmark must remain still and centered until the app navigates away.
5. Keep the entire sequence playful, smooth, and child-friendly; total logo sequence around 1.4–2.0 seconds.

### Technical requirements
- First inspect the existing splash screen, the Lottie component, navigation timing, and animation library already installed. Reuse the project's current animation library (prefer Reanimated if already used; otherwise Animated from React Native). Do not add a new dependency unless absolutely necessary.
- Use transparent PNGs; preserve aspect ratios with `resizeMode="contain"` / `contentFit="contain"`. Never stretch the letters.
- Build the wordmark as one responsive composition. Measure the five asset aspect ratios and derive each displayed width from a shared target height. Align the `i` stem and dot carefully. Use a single parent container so the final composition stays centered on different screen sizes.
- Calculate each piece's final position from the intended logo layout; do not hardcode positions that only work on one device. Support narrow phones and web layouts.
- Prevent the splash screen from navigating away before the Lottie and logo animation both finish. Keep existing app navigation/auth behavior intact.
- Clean up animation values/listeners on unmount and avoid state updates after unmount.
- Respect reduced-motion/accessibility preferences if the project already has a convention for this.
- Do not change backend/API configuration, login flow, app routes, or unrelated UI.
- Run the relevant lint/typecheck/build commands available in the repository and fix issues caused by this change.

### Acceptance checklist
- [ ] Water splash Lottie finishes first.
- [ ] O enters from the right and joins the other letters.
- [ ] i dot falls from above, bounces once, and returns to its final position.
- [ ] Final KIDO wordmark appears only after the pieces settle.
- [ ] Final logo is centered, responsive, and not distorted.
- [ ] Existing splash/navigation behavior still works.
