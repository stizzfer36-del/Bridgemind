import { create } from "zustand";
import * as api from "../lib/api";
import type { Task, TaskStatus } from "../lib/api";

type KanbanState = {
  projectId: string | null;
  tasks: Task[];
  loading: boolean;
  error: string | null;
  offline: boolean;
  pollId: number | null;

  selectProject: (projectId: string | null) => void;
  refresh: () => Promise<void>;
  createTask: (input: { instructions: string; taskKnowledge?: string }) => Promise<Task | null>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  moveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
};

export const useKanban = create<KanbanState>((set, get) => ({
  projectId: null,
  tasks: [],
  loading: false,
  error: null,
  offline: false,
  pollId: null,

  selectProject: (projectId) => {
    set({ projectId, tasks: [] });
    if (projectId) void get().refresh();
  },

  refresh: async () => {
    const { projectId } = get();
    if (!projectId) return;
    set({ loading: true });
    try {
      const tasks = await api.listTasks(projectId);
      set({ tasks, loading: false, offline: false, error: null });
    } catch (err) {
      set({ loading: false, offline: true, error: (err as Error).message });
    }
  },

  createTask: async ({ instructions, taskKnowledge }) => {
    const { projectId } = get();
    if (!projectId) return null;
    if (instructions.length > 5000) throw new Error("instructions too long");
    if (taskKnowledge && taskKnowledge.length > 50000)
      throw new Error("taskKnowledge too long");
    const task = await api.createTask({ projectId, instructions, taskKnowledge });
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (taskId, patch) => {
    // optimistic
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
    try {
      await api.updateTask(taskId, patch);
    } catch (err) {
      set({ offline: true, error: (err as Error).message });
    }
  },

  moveTask: async (taskId, status) => {
    await get().updateTask(taskId, { status });
  },

  startPolling: () => {
    if (get().pollId != null) return;
    const id = window.setInterval(() => {
      void get().refresh();
    }, 5000);
    set({ pollId: id });
  },

  stopPolling: () => {
    const id = get().pollId;
    if (id != null) window.clearInterval(id);
    set({ pollId: null });
  },
}));
