import { create } from "zustand";
import * as api from "../lib/api";
import type { Task, TaskStatus } from "../lib/api";
import { useWorkspace } from "./workspace";

type KanbanState = {
  projectId: string | null;
  tasks: Task[];
  loading: boolean;
  error: string | null;
  offline: boolean;
  pollId: number | null;
  lastRefreshAt: number;
  tasksByProject: Map<string, Task[]>;

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
  lastRefreshAt: 0,
  tasksByProject: new Map(),

  selectProject: (projectId) => {
    const cached = projectId ? get().tasksByProject.get(projectId) : undefined;
    set({ projectId, tasks: cached ?? [] });
    if (projectId && !cached) void get().refresh();
    else if (projectId && cached) void get().refresh();
  },

  refresh: async () => {
    const { projectId } = get();
    if (!projectId) return;
    set({ loading: true });
    try {
      const tasks = await api.listTasks(projectId);
      set((s) => {
        const updated = new Map(s.tasksByProject);
        updated.set(projectId, tasks);
        return { tasks, loading: false, offline: false, error: null, lastRefreshAt: Date.now(), tasksByProject: updated };
      });
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
    set((s) => {
      const tasks = [...s.tasks, task];
      const updated = new Map(s.tasksByProject);
      updated.set(projectId, tasks);
      return { tasks, tasksByProject: updated };
    });
    return task;
  },

  updateTask: async (taskId, patch) => {
    const snapshot = get().tasks;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
    try {
      await api.updateTask(taskId, patch);
    } catch (err) {
      set({ tasks: snapshot, offline: true, error: (err as Error).message });
    }
  },

  moveTask: async (taskId, status) => {
    const { projectId } = get();
    const snapshot = get().tasks;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    }));
    try {
      await api.updateTask(taskId, { status });
    } catch (err) {
      set({ tasks: snapshot });
      useWorkspace.getState().showToast?.("Failed to move task");
    }
    if (projectId) {
      set((s) => {
        const updated = new Map(s.tasksByProject);
        updated.set(projectId, s.tasks);
        return { tasksByProject: updated };
      });
    }
  },

  startPolling: () => {
    if (get().pollId != null) return;
    const id = window.setInterval(() => {
      if (Date.now() - get().lastRefreshAt < 5000) return;
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
