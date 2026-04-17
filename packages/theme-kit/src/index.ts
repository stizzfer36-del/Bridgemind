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
