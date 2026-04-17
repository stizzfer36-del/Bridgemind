import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import {
  spawnPane,
  ptyWrite,
  ptyResize,
  killPane,
  onPtyData,
  onBlockEvent,
  onPtyExit,
  type BlockEvent,
} from "../lib/ipc";
import CommandBlock, { type Block } from "./CommandBlock";
import { useWorkspace } from "../state/workspace";

function getThemeFromCss(el: HTMLElement) {
  const styles = getComputedStyle(el);
  const bg = styles.getPropertyValue("--bg").trim() || "#0b0d10";
  const fg = styles.getPropertyValue("--fg").trim() || "#d7e0ea";
  const accent = styles.getPropertyValue("--accent").trim() || "#7aa2f7";
  return { background: bg, foreground: fg, cursor: accent };
}

export default function TerminalPane({
  paneId,
  cwd,
}: {
  paneId: string;
  cwd?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [showExitBanner, setShowExitBanner] = useState(false);
  const [spawnArgs, setSpawnArgs] = useState<{ workspaceId: string; paneId: string; cwd?: string } | null>(null);
  const workspaceId = useWorkspace((s) => s.activeTabId);

  useEffect(() => {
    if (!ref.current) return;
    const theme = getThemeFromCss(ref.current);
    const term = new Terminal({
      fontFamily: 'ui-monospace, "JetBrains Mono", "Fira Code", Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: { background: theme.background, foreground: theme.foreground, cursor: theme.cursor },
      allowTransparency: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    const search = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(search);
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL unavailable; fall back silently
    }
    term.open(ref.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;
    searchRef.current = search;

    const unsubscribers: Promise<() => void>[] = [];

    unsubscribers.push(
      onPtyData(paneId, (ev) => {
        term.write(ev.bytes);
        if (loading) setLoading(false);
      })
    );
    unsubscribers.push(
      onBlockEvent(paneId, (ev) => handleBlockEvent(ev, setBlocks))
    );
    unsubscribers.push(
      onPtyExit(paneId, (ev) => {
        setExitCode(ev.code);
        setShowExitBanner(true);
      })
    );

    term.onData((data) => {
      void ptyWrite(paneId, data);
    });

    const ro = new ResizeObserver(() => {
      fit.fit();
      const { cols, rows } = term;
      void ptyResize(paneId, cols, rows);
    });
    ro.observe(ref.current);

    const args = { workspaceId, paneId, cwd };
    setSpawnArgs(args);
    void spawnPane({ ...args, cols: term.cols, rows: term.rows }).then(() =>
      setLoading(false)
    );

    const onSearch = () => {
      search.findNext("");
    };
    document.addEventListener("forge:search", onSearch);

    return () => {
      document.removeEventListener("forge:search", onSearch);
      ro.disconnect();
      void killPane(paneId);
      term.dispose();
      for (const p of unsubscribers) void p.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]);

  async function handleReconnect() {
    if (!spawnArgs) return;
    setShowExitBanner(false);
    setExitCode(null);
    termRef.current?.clear();
    await spawnPane({
      ...spawnArgs,
      cols: termRef.current?.cols,
      rows: termRef.current?.rows,
    });
  }

  return (
    <div className="terminal-pane" aria-label="Terminal pane">
      {loading && <div className="spinner">loading…</div>}
      {showExitBanner && (
        <div className="banner error" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          PTY exited (code {exitCode ?? "?"}) —{" "}
          <button onClick={() => void handleReconnect()}>Reconnect</button>
        </div>
      )}
      <div className="term" ref={ref} />
      <div className="blocks">
        {blocks.slice(-8).map((b) => (
          <CommandBlock key={b.id} block={b} />
        ))}
      </div>
    </div>
  );
}

function handleBlockEvent(
  ev: BlockEvent,
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
) {
  setBlocks((prev) => {
    switch (ev.kind) {
      case "prompt_start":
        return prev;
      case "command_start":
        return [
          ...prev,
          {
            id: `b-${ev.ts}-${prev.length}`,
            command: "",
            startedAt: ev.ts,
            state: "running",
          },
        ];
      case "command_finished": {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const last = next[next.length - 1];
        last.finishedAt = ev.ts;
        last.exitCode = ev.exit_code ?? null;
        last.state = (ev.exit_code ?? 1) === 0 ? "ok" : "err";
        return next;
      }
      default:
        return prev;
    }
  });
}
