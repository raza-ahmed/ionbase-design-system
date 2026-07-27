/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Paste into `use_figma` with the IonBase file open. Returns the contents of
 * `src/figma/effect-styles.json`; save the output over that file verbatim.
 *
 * Effect styles are not variables and not text styles — a third Figma API that
 * neither export covers. They are also NOT variable-bound in this file, which
 * is why they cannot become tokens: there is nothing to alias. Committing the
 * raw values and generating CSS from them is the next best thing, and it is
 * what stops a hand-transcribed shadow drifting from the design.
 *
 * That drift is not hypothetical. The Button focus ring was hand-mapped to the
 * nearest solid token (#070a0d) when Figma renders it at 50% alpha, and no
 * check in the pipeline could see it.
 */

const styles = await figma.getLocalEffectStylesAsync();

const out = {};
for (const s of styles) {
  out[s.name] = s.effects
    .filter((fx) => fx.visible !== false)
    .map((fx) => ({
      type: fx.type,
      x: fx.offset.x,
      y: fx.offset.y,
      blur: fx.radius,
      spread: fx.spread ?? 0,
      // 0-255 channels and alpha kept separate so the generator can emit
      // `rgb(r g b / a%)` without re-deriving anything.
      r: Math.round(fx.color.r * 255),
      g: Math.round(fx.color.g * 255),
      b: Math.round(fx.color.b * 255),
      a: fx.color.a === undefined ? 1 : Number(fx.color.a.toFixed(4)),
    }));
}

return {
  source: 'figma-effect-styles',
  count: styles.length,
  effectStyles: out,
};
