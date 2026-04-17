import { z } from "zod";

export const AnsiPalette = z.object({
  black: z.string(),
  red: z.string(),
  green: z.string(),
  yellow: z.string(),
  blue: z.string(),
  magenta: z.string(),
  cyan: z.string(),
  white: z.string(),
  brightBlack: z.string(),
  brightRed: z.string(),
  brightGreen: z.string(),
  brightYellow: z.string(),
  brightBlue: z.string(),
  brightMagenta: z.string(),
  brightCyan: z.string(),
  brightWhite: z.string(),
});

export const SyntaxPalette = z.object({
  keyword: z.string(),
  string: z.string(),
  comment: z.string(),
  function: z.string(),
  type: z.string(),
  number: z.string(),
  operator: z.string().optional(),
});

export const BlockPalette = z.object({
  success: z.string(),
  failure: z.string(),
  running: z.string(),
});

export const Theme = z.object({
  name: z.string().min(1).max(64),
  bg: z.string(),
  fg: z.string(),
  muted: z.string().optional(),
  accent: z.string(),
  border: z.string(),
  ansi: AnsiPalette,
  syntax: SyntaxPalette,
  block: BlockPalette.optional(),
});

export type Theme = z.infer<typeof Theme>;

export function validateTheme(raw: unknown): Theme {
  return Theme.parse(raw);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(bg: string, fg: string): number {
  const [br, bg2, bb] = hexToRgb(bg);
  const [fr, fg2, fb] = hexToRgb(fg);
  const l1 = luminance(br, bg2, bb);
  const l2 = luminance(fr, fg2, fb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateAccessibility(theme: Theme): string[] {
  const warnings: string[] = [];
  const pairs: [string, string, string][] = [
    ["bg/fg", theme.bg, theme.fg],
    ["bg/accent", theme.bg, theme.accent],
  ];
  for (const [label, bg, fg] of pairs) {
    const ratio = contrastRatio(bg, fg);
    if (ratio < 4.5) warnings.push(`${label} contrast ratio ${ratio.toFixed(2)} < 4.5:1 (WCAG AA)`);
  }
  return warnings;
}
