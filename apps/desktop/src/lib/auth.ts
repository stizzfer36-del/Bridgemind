import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";
import { loadStore, saveStore } from "./persist";

const OAUTH_AUTHORIZE_URL =
  (import.meta.env.VITE_OAUTH_AUTHORIZE_URL as string | undefined) ??
  "https://auth.forge.sh/oauth/authorize";
const OAUTH_CLIENT_ID =
  (import.meta.env.VITE_OAUTH_CLIENT_ID as string | undefined) ??
  "forge-desktop";
const OAUTH_REFRESH_URL =
  (import.meta.env.VITE_OAUTH_REFRESH_URL as string | undefined) ??
  "https://auth.forge.sh/oauth/refresh";
const API_URL =
  (import.meta.env.VITE_FORGE_API_URL as string | undefined) ??
  "https://api.forge.sh";
const REDIRECT_URI = "forge://auth";

type AuthState = {
  apiKey: string | null;
  signing: boolean;
  pkceVerifier: string | null;
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  refreshToken: () => Promise<void>;
};

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkce() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = base64url(new Uint8Array(hash));
  useAuth.setState({ pkceVerifier: verifier });
  return { verifier, challenge };
}

export const useAuth = create<AuthState>((set, get) => ({
  apiKey: null,
  signing: false,
  pkceVerifier: null,

  init: async () => {
    const key = (await loadStore("auth.apiKey")) as string | null;
    if (key) set({ apiKey: key });
    try {
      await invoke("register_deeplink_listener");
    } catch {
      // non-tauri environment
    }
    void listen<string>("deeplink://auth", async (ev) => {
      const url = new URL(ev.payload);
      const token = url.searchParams.get("token");
      if (token) {
        await saveStore("auth.apiKey", token);
        set({ apiKey: token, signing: false });
      }
    });
  },

  signIn: async () => {
    set({ signing: true });
    const { challenge } = await pkce();
    const params = new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: "projects:rw tasks:rw agents:rw",
    });
    await openUrl(`${OAUTH_AUTHORIZE_URL}?${params.toString()}`);
  },

  signOut: async () => {
    const { apiKey } = get();
    if (apiKey && apiKey.startsWith("forge_live_")) {
      // Extract key ID — format: forge_live_<id>_<secret>
      const parts = apiKey.split("_");
      const keyId = parts.length >= 3 ? parts[2] : apiKey;
      try {
        await fetch(`${API_URL}/v1/keys/${keyId}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${apiKey}` },
        });
      } catch {
        // best-effort deletion
      }
    }
    await saveStore("auth.apiKey", null);
    set({ apiKey: null, pkceVerifier: null });
  },

  setApiKey: async (key) => {
    await saveStore("auth.apiKey", key);
    set({ apiKey: key });
  },

  refreshToken: async () => {
    const { apiKey } = get();
    if (!apiKey) return;
    try {
      const res = await fetch(OAUTH_REFRESH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ token: apiKey }),
      });
      if (!res.ok) throw new Error(`refresh failed: ${res.status}`);
      const data = (await res.json()) as { token: string };
      if (data.token) {
        await saveStore("auth.apiKey", data.token);
        set({ apiKey: data.token });
      }
    } catch {
      await get().signOut();
    }
  },
}));

export async function getApiKey(): Promise<string | null> {
  const fromStore = useAuth.getState().apiKey;
  if (fromStore) return fromStore;
  return ((await loadStore("auth.apiKey")) as string | null) ?? null;
}
