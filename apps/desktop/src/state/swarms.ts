import { create } from "zustand";
import * as api from "../lib/api";
import type { Swarm, Message } from "../lib/api";

type SwarmsState = {
  active: Swarm | null;
  mailbox: Message[];
  pollId: number | null;
  error: string | null;
  filterAgentId: string | null;

  start: (projectId: string, goal: string, roles: { name: string; agentId: string }[]) => Promise<Swarm>;
  select: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  send: (from: string, to: string | undefined, body: string) => Promise<void>;
  setFilter: (agentId: string | null) => void;
  stop: (swarmId?: string) => Promise<void>;
  filterMessages: (swarmId: string, since: number, until?: number) => Message[];
};

export const useSwarms = create<SwarmsState>((set, get) => ({
  active: null,
  mailbox: [],
  pollId: null,
  error: null,
  filterAgentId: null,

  start: async (projectId, goal, roles) => {
    const swarm = await api.createSwarm({
      projectId,
      goal,
      roles: roles.map((r, i) => ({
        id: `r-${i}`,
        name: r.name,
        agentId: r.agentId,
      })),
    });
    set({ active: swarm, mailbox: swarm.mailbox ?? [] });
    void get().refresh();
    return swarm;
  },

  select: async (id) => {
    const s = await api.getSwarm(id);
    set({ active: s, mailbox: s.mailbox ?? [] });
    if (get().pollId == null) {
      const pid = window.setInterval(() => void get().refresh(), 2000);
      set({ pollId: pid });
    }
  },

  refresh: async () => {
    const s = get().active;
    if (!s) return;
    try {
      const fresh = await api.getSwarm(s.id);
      set({ active: fresh, mailbox: fresh.mailbox ?? [], error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  send: async (from, to, body) => {
    const s = get().active;
    if (!s) return;
    const msg = await api.postSwarmMessage(s.id, { from, to, body });
    set((state) => ({ mailbox: [...state.mailbox, msg] }));
  },

  setFilter: (agentId) => set({ filterAgentId: agentId }),

  stop: async (swarmId) => {
    const id = swarmId ?? get().active?.id;
    if (id) {
      try {
        await api.updateSwarm(id, { status: "done" });
      } catch {
        // best-effort
      }
    }
    const pollId = get().pollId;
    if (pollId != null) window.clearInterval(pollId);
    set({ pollId: null, active: null, mailbox: [] });
  },

  filterMessages: (swarmId, since, until) => {
    return get().mailbox.filter(
      (m) =>
        m.swarmId === swarmId &&
        m.ts >= since &&
        (until === undefined || m.ts <= until)
    );
  },
}));
