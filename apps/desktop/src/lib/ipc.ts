import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type BlockEvent =
  | { kind: "prompt_start"; ts: number }
  | { kind: "prompt_end"; ts: number }
  | { kind: "command_start"; ts: number }
  | { kind: "command_finished"; exit_code: number | null; ts: number };

export type PtyDataEvent = { paneId: string; bytes: string };
export type PtyExitEvent = { paneId: string; code: number };

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
