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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const workspaceId = useWorkspace((s) => s.activeTabId);

  useEffect(() => {
    if (!ref.current) return;
    const term = new Terminal({
      fontFamily: 'ui-monospace, "JetBrains Mono", "Fira Code", Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: { background: "rgba(0,0,0,0)" },
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
      onPtyExit(paneId, (ev) => setExitCode(ev.code))
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

    void spawnPane({
      workspaceId,
      paneId,
      cwd,
      cols: term.cols,
      rows: term.rows,
    }).then(() => setLoading(false));

    const onSearch = () => {
      const q = window.prompt("Search");
      if (q) search.findNext(q);
    };
    window.addEventListener("bs:search", onSearch);

    return () => {
      window.removeEventListener("bs:search", onSearch);
      ro.disconnect();
      void killPane(paneId);
      term.dispose();
      for (const p of unsubscribers) void p.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]);

  return (
    <div className="terminal-pane">
      {loading && <div className="spinner">loading…</div>}
      {exitCode !== null && exitCode !== 0 && (
        <div className="banner error">Shell exited with code {exitCode}</div>
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
