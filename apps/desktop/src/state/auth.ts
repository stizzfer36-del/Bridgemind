import { create } from "zustand";
import { loadStore, saveStore } from "../lib/persist";

type AuthState = {
  token: string | null;
  ready: boolean;

  hydrate: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
};

export const useAuthState = create<AuthState>((set) => ({
  token: null,
  ready: false,

  hydrate: async () => {
    const stored = (await loadStore("auth.token")) as string | null;
    set({ token: stored ?? null, ready: true });
  },

  setToken: async (token) => {
    await saveStore("auth.token", token);
    set({ token });
  },

  clearToken: async () => {
    await saveStore("auth.token", null);
    set({ token: null });
  },
}));

export function getToken(): string | null {
  return useAuthState.getState().token;
}
