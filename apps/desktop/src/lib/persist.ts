import { load, Store } from "@tauri-apps/plugin-store";

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (store) return store;
  store = await load("bridgespace.store.json", { defaults: {}, autoSave: true });
  return store;
}

export async function loadStore(key: string): Promise<unknown> {
  try {
    const s = await getStore();
    return (await s.get(key)) ?? null;
  } catch {
    // running outside of Tauri (tests / SSR)
    const raw = globalThis.localStorage?.getItem(`bs:${key}`);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveStore(key: string, value: unknown): Promise<void> {
  try {
    const s = await getStore();
    await s.set(key, value);
    await s.save();
  } catch {
    globalThis.localStorage?.setItem(`bs:${key}`, JSON.stringify(value));
  }
}
