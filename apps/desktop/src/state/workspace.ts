import { create } from "zustand";
import { loadStore, saveStore } from "../lib/persist";

export type PaneKind = "terminal" | "editor" | "web" | "mailbox";

export type PaneSpec = {
  id: string;
  kind: PaneKind;
  cwd?: string;
  filePath?: string;
};

export type GridTemplate =
  | "single"
  | "split"
  | "stack"
  | "quad"
  | "six"
  | "eight"
  | "ten"
  | "twelve"
  | "fourteen"
  | "sixteen";

export const TEMPLATE_SIZES: Record<GridTemplate, number> = {
  single: 1,
  split: 2,
  stack: 2,
  quad: 4,
  six: 6,
  eight: 8,
  ten: 10,
  twelve: 12,
  fourteen: 14,
  sixteen: 16,
};

export const TEMPLATE_GRID: Record<GridTemplate, { cols: number; rows: number }> = {
  single: { cols: 1, rows: 1 },
  split: { cols: 2, rows: 1 },
  stack: { cols: 1, rows: 2 },
  quad: { cols: 2, rows: 2 },
  six: { cols: 3, rows: 2 },
  eight: { cols: 4, rows: 2 },
  ten: { cols: 5, rows: 2 },
  twelve: { cols: 4, rows: 3 },
  fourteen: { cols: 7, rows: 2 },
  sixteen: { cols: 4, rows: 4 },
};

export type Tab = {
  id: string;
  title: string;
  template: GridTemplate;
  panes: PaneSpec[];
  activePaneId?: string;
};

type WorkspaceState = {
  tabs: Tab[];
  activeTabId: string;
  sidebarView: "files" | "kanban" | "agents" | "prompts" | "mailbox";
  quickOpenVisible: boolean;
  projectPaths: Record<string, string>;

  hydrate: () => Promise<void>;
  newTab: (template?: GridTemplate) => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  setTemplate: (tabId: string, template: GridTemplate) => void;
  swapPanes: (tabId: string, a: number, b: number) => void;
  setPane: (tabId: string, index: number, pane: PaneSpec) => void;
  setActivePane: (tabId: string, paneId: string) => void;
  setSidebarView: (v: WorkspaceState["sidebarView"]) => void;
  toggleQuickOpen: () => void;
  setProjectPath: (projectId: string, path: string) => void;
};

function freshTab(template: GridTemplate): Tab {
  const size = TEMPLATE_SIZES[template];
  const panes: PaneSpec[] = Array.from({ length: size }, (_, i) => ({
    id: `p-${Date.now()}-${i}`,
    kind: "terminal",
  }));
  return {
    id: `t-${Date.now()}`,
    title: "Workspace",
    template,
    panes,
    activePaneId: panes[0]?.id,
  };
}

const INITIAL_TAB = freshTab("single");

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  tabs: [INITIAL_TAB],
  activeTabId: INITIAL_TAB.id,
  sidebarView: "files",
  quickOpenVisible: false,
  projectPaths: {},

  hydrate: async () => {
    const saved = await loadStore("workspace");
    if (saved && typeof saved === "object") {
      set(saved as Partial<WorkspaceState>);
    } else {
      const initial = freshTab("single");
      set({ tabs: [initial], activeTabId: initial.id });
    }
  },

  newTab: (template = "single") => {
    const tab = freshTab(template);
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    persist(get());
  },

  closeTab: (tabId) => {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== tabId);
      const activeTabId =
        s.activeTabId === tabId ? tabs[tabs.length - 1]?.id ?? "" : s.activeTabId;
      return { tabs, activeTabId };
    });
    persist(get());
  },

  selectTab: (tabId) => {
    set({ activeTabId: tabId });
    persist(get());
  },

  setTemplate: (tabId, template) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t;
        const size = TEMPLATE_SIZES[template];
        const panes = [...t.panes];
        while (panes.length < size) {
          panes.push({ id: `p-${Date.now()}-${panes.length}`, kind: "terminal" });
        }
        panes.length = size;
        return { ...t, template, panes };
      }),
    }));
    persist(get());
  },

  swapPanes: (tabId, a, b) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t;
        const panes = [...t.panes];
        [panes[a], panes[b]] = [panes[b], panes[a]];
        return { ...t, panes };
      }),
    }));
    persist(get());
  },

  setPane: (tabId, index, pane) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== tabId) return t;
        const panes = [...t.panes];
        panes[index] = pane;
        return { ...t, panes };
      }),
    }));
    persist(get());
  },

  setActivePane: (tabId, paneId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, activePaneId: paneId } : t)),
    }));
  },

  setSidebarView: (v) => set({ sidebarView: v }),

  toggleQuickOpen: () => set((s) => ({ quickOpenVisible: !s.quickOpenVisible })),

  setProjectPath: (projectId, path) => {
    set((s) => ({ projectPaths: { ...s.projectPaths, [projectId]: path } }));
    persist(get());
  },
}));

function persist(s: WorkspaceState) {
  const { tabs, activeTabId, sidebarView, projectPaths } = s;
  void saveStore("workspace", { tabs, activeTabId, sidebarView, projectPaths });
}
