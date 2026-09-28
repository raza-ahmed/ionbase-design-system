/**
 * WCAG 2 contrast between two `#RRGGBB` colours, as the ratio people quote —
 * 4.5 for body text. The picker offers every colour and cannot know what
 * sits on it; the panel that knows the text is white asks this.
 */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Rounded down to one place, so 4.49 never reads as a passing 4.5. */
export const formatRatio = (ratio: number) =>
  `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
