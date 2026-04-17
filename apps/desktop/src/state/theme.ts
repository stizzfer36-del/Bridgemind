import { create } from "zustand";
import { loadStore, saveStore } from "../lib/persist";

import Void from "../themes/void.json";
import Ghost from "../themes/ghost.json";
import Plasma from "../themes/plasma.json";
import Carbon from "../themes/carbon.json";
import Hex from "../themes/hex.json";
import NeonTokyo from "../themes/neon-tokyo.json";
import Obsidian from "../themes/obsidian.json";
import Nebula from "../themes/nebula.json";
import Storm from "../themes/storm.json";
import Infrared from "../themes/infrared.json";
import Nova from "../themes/nova.json";
import Stealth from "../themes/stealth.json";
import Hologram from "../themes/hologram.json";
import Dracula from "../themes/dracula.json";
import Forge from "../themes/forge.json";
import Synthwave from "../themes/synthwave.json";
import Cybernetics from "../themes/cybernetics.json";
import Quantum from "../themes/quantum.json";
import Mecha from "../themes/mecha.json";
import Abyss from "../themes/abyss.json";
import Paper from "../themes/paper.json";
import Chalk from "../themes/chalk.json";
import Solar from "../themes/solar.json";
import Arctic from "../themes/arctic.json";
import Ivory from "../themes/ivory.json";

export type Theme = {
  name: string;
  bg: string;
  fg: string;
  muted?: string;
  accent: string;
  border: string;
  ansi: Record<string, string>;
  syntax: Record<string, string>;
  block?: { success: string; failure: string; running: string };
};

const BLOCK_DEFAULT = { success: "#36d399", failure: "#ff4d4f", running: "#f5c542" };

function deriveMuted(bg: string, fg: string): string {
  const mix = (a: string, b: string) => {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) + (pb >> 16)) / 2);
    const g = Math.round((((pa >> 8) & 255) + ((pb >> 8) & 255)) / 2);
    const bl = Math.round(((pa & 255) + (pb & 255)) / 2);
    return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
  };
  return mix(bg, fg);
}

function normalize(t: Theme): Theme {
  return {
    ...t,
    muted: t.muted ?? deriveMuted(t.bg, t.fg),
    block: t.block ?? BLOCK_DEFAULT,
  };
}

export const THEMES: Theme[] = [
  Void, Ghost, Plasma, Carbon, Hex, NeonTokyo, Obsidian, Nebula, Storm, Infrared,
  Nova, Stealth, Hologram, Dracula, Forge, Synthwave, Cybernetics, Quantum, Mecha, Abyss,
  Paper, Chalk, Solar, Arctic, Ivory,
].map((t) => normalize(t as Theme));

type ThemeState = {
  current: string;
  setCurrent: (name: string) => void;
  apply: (name: string) => void;
  cycle: () => void;
  hydrate: () => Promise<void>;
};

export const useTheme = create<ThemeState>((set, get) => ({
  current: "Forge",

  setCurrent: (name) => {
    set({ current: name });
    get().apply(name);
    void saveStore("theme", name);
  },

  apply: (name) => {
    const t = THEMES.find((x) => x.name === name) ?? THEMES[0];
    const root = document.documentElement;
    root.style.setProperty("--bg", t.bg);
    root.style.setProperty("--fg", t.fg);
    root.style.setProperty("--muted", t.muted!);
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--border", t.border);
    for (const [k, v] of Object.entries(t.ansi)) {
      root.style.setProperty(`--ansi-${k}`, v);
    }
    for (const [k, v] of Object.entries(t.syntax)) {
      root.style.setProperty(`--syntax-${k}`, v);
    }
    root.style.setProperty("--block-success", t.block!.success);
    root.style.setProperty("--block-failure", t.block!.failure);
    root.style.setProperty("--block-running", t.block!.running);
  },

  cycle: () => {
    const cur = get().current;
    const i = THEMES.findIndex((t) => t.name === cur);
    const next = THEMES[(i + 1) % THEMES.length];
    get().setCurrent(next.name);
  },

  hydrate: async () => {
    const saved = (await loadStore("theme")) as string | null;
    if (saved) {
      set({ current: saved });
      get().apply(saved);
    } else {
      get().apply(get().current);
    }
  },
}));
