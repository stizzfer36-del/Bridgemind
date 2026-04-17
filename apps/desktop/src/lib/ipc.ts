import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type BlockEvent =
  | { kind: "prompt_start"; ts: number }
  | { kind: "prompt_end"; ts: number }
  | { kind: "command_start"; ts: number }
  | { kind: "command_finished"; exit_code: number | null; ts: number };

export type PtyDataEvent = { paneId: string; bytes: string };
export type PtyExitEvent = { paneId: string; code: number };

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | undefined> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not available")) {
      console.warn(`[ipc] ${cmd} not available in this context`);
      return undefined;
    }
    throw err;
  }
}

export async function spawnPane(args: {
  workspaceId: string;
  paneId: string;
  cwd?: string;
  shell?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}) {
  return invoke<void>("spawn_pane", { args });
}

export async function ptyWrite(paneId: string, data: string) {
  return invoke<void>("pty_write", { paneId, data });
}

export async function ptyResize(paneId: string, cols: number, rows: number) {
  return invoke<void>("pty_resize", { paneId, cols, rows });
}

export async function killPane(paneId: string) {
  return invoke<void>("kill_pane", { paneId });
}

export async function openFile(path: string) {
  return invoke<string>("open_file", { path });
}

export async function saveFile(path: string, content: string) {
  return invoke<void>("save_file", { path, content });
}

export async function detectShell() {
  return invoke<string | null>("detect_shell");
}

export async function onPtyData(
  paneId: string,
  cb: (e: PtyDataEvent) => void
): Promise<UnlistenFn> {
  return listen<PtyDataEvent>(`pty_data::${paneId}`, (e) => cb(e.payload));
}

export async function onBlockEvent(
  paneId: string,
  cb: (e: BlockEvent) => void
): Promise<UnlistenFn> {
  return listen<BlockEvent>(`block_event::${paneId}`, (e) => cb(e.payload));
}

export async function onPtyExit(
  paneId: string,
  cb: (e: PtyExitEvent) => void
): Promise<UnlistenFn> {
  return listen<PtyExitEvent>(`pty_exit::${paneId}`, (e) => cb(e.payload));
}

export function decodeFrame(data: Uint8Array): { paneId: string; bytes: Uint8Array; ts: number } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const length = view.getUint32(0, false); // big-endian
  const jsonBytes = data.slice(4, 4 + length);
  const text = new TextDecoder().decode(jsonBytes);
  const parsed = JSON.parse(text) as { paneId: string; bytes: string; ts: number };
  const bytes = Uint8Array.from(atob(parsed.bytes), (c) => c.charCodeAt(0));
  return { paneId: parsed.paneId, bytes, ts: parsed.ts };
}

export async function onPtyDataBinary(
  paneId: string,
  cb: (bytes: Uint8Array, ts: number) => void
): Promise<UnlistenFn> {
  return listen<number[]>(`pty_data_binary::${paneId}`, (e) => {
    const raw = new Uint8Array(e.payload);
    const { bytes, ts } = decodeFrame(raw);
    cb(bytes, ts);
  });
}
