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
import BridgeMind from "../themes/bridgemind.json";
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
  accent: string;
  border: string;
  ansi: Record<string, string>;
  syntax: Record<string, string>;
};

export const THEMES: Theme[] = [
  Void,
  Ghost,
  Plasma,
  Carbon,
  Hex,
  NeonTokyo,
  Obsidian,
  Nebula,
  Storm,
  Infrared,
  Nova,
  Stealth,
  Hologram,
  Dracula,
  BridgeMind,
  Synthwave,
  Cybernetics,
  Quantum,
  Mecha,
  Abyss,
  Paper,
  Chalk,
  Solar,
  Arctic,
  Ivory,
] as Theme[];

type ThemeState = {
  current: string;
  setCurrent: (name: string) => void;
  apply: (name: string) => void;
  cycle: () => void;
  hydrate: () => Promise<void>;
};

export const useTheme = create<ThemeState>((set, get) => ({
  current: "BridgeMind",

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
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--border", t.border);
    for (const [k, v] of Object.entries(t.ansi)) {
      root.style.setProperty(`--ansi-${k}`, v);
    }
    for (const [k, v] of Object.entries(t.syntax)) {
      root.style.setProperty(`--syntax-${k}`, v);
    }
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
