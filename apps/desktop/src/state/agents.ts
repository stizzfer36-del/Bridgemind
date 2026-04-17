import { create } from "zustand";
import * as api from "../lib/api";
import type { Agent } from "../lib/api";

type AgentsState = {
  projectId: string | null;
  agents: Agent[];
  loading: boolean;
  error: string | null;
  selectedAgentId: string | null;

  selectProject: (projectId: string | null) => void;
  refresh: () => Promise<void>;
  createAgent: (input: { name: string; systemPrompt: string }) => Promise<Agent | null>;
  updateAgent: (id: string, patch: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  selectAgent: (id: string | null) => void;
};

const BUILTINS: Agent[] = [
  {
    id: "builtin:claude-code",
    name: "ClaudeCode",
    systemPrompt: "",
    cliBinary: "claude",
    cliArgs: [],
  },
  {
    id: "builtin:cursor-agent",
    name: "Cursor",
    systemPrompt: "",
    cliBinary: "cursor-agent",
    cliArgs: [],
  },
  {
    id: "builtin:codex",
    name: "Codex",
    systemPrompt: "",
    cliBinary: "codex",
    cliArgs: [],
  },
  {
    id: "builtin:gemini",
    name: "Gemini",
    systemPrompt: "",
    cliBinary: "gemini",
    cliArgs: [],
  },
  {
    id: "builtin:windsurf",
    name: "Windsurf",
    systemPrompt: "",
    cliBinary: "windsurf",
    cliArgs: [],
  },
];

export const useAgents = create<AgentsState>((set, get) => ({
  projectId: null,
  agents: BUILTINS,
  loading: false,
  error: null,
  selectedAgentId: "builtin:claude-code",

  selectProject: (projectId) => {
    set({ projectId });
    if (projectId) void get().refresh();
  },

  refresh: async () => {
    const { projectId } = get();
    if (!projectId) return;
    set({ loading: true });
    try {
      const remote = await api.listAgents(projectId);
      set({
        agents: [...BUILTINS, ...remote],
        loading: false,
        error: null,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  createAgent: async ({ name, systemPrompt }) => {
    const { projectId } = get();
    if (!projectId) return null;
    if (name.length > 255) throw new Error("name too long");
    if (systemPrompt.length > 100000) throw new Error("systemPrompt too long");
    const agent = await api.createAgent({ projectId, name, systemPrompt });
    set((s) => ({ agents: [...s.agents, agent] }));
    return agent;
  },

  updateAgent: async (id, patch) => {
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
    if (!id.startsWith("builtin:")) await api.updateAgent(id, patch);
  },

  deleteAgent: async (id) => {
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) }));
    if (!id.startsWith("builtin:")) await api.deleteAgent(id);
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
}));
