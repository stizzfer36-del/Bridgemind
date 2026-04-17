import { useState } from "react";

export type Block = {
  id: string;
  command: string;
  output?: string;
  startedAt: number;
  finishedAt?: number;
  exitCode?: number | null;
  state: "running" | "ok" | "err";
};

function formatDuration(ms: number): string {
  if (ms < 1000) return "< 1s";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds % 60}s`;
}

export default function CommandBlock({ block }: { block: Block }) {
  const outputLines = (block.output ?? "").split("\n").filter(Boolean);
  const defaultCollapsed = outputLines.length > 3;
  const [open, setOpen] = useState(!defaultCollapsed);

  const borderColor =
    block.state === "ok"
      ? "var(--ok, #36d399)"
      : block.state === "err"
        ? "var(--err, #ff4d4f)"
        : "var(--warn, #f5c542)";

  const durationMs =
    block.finishedAt != null ? block.finishedAt - block.startedAt : null;
  const duration =
    durationMs != null ? formatDuration(durationMs) : "…";

  function handleCopy() {
    void navigator.clipboard.writeText(block.command);
  }

  return (
    <div className="cmd-block" style={{ borderLeftColor: borderColor }}>
      <button className="cmd-block-head" onClick={() => setOpen((o) => !o)}>
        <span className="toggle-icon">{open ? "▼" : "▶"}</span>
        <span className="cmd">{block.command || "(command)"}</span>
        <span className="ts">{new Date(block.startedAt).toLocaleTimeString()}</span>
        <span className={`exit-badge state-${block.state}`}>
          {block.state === "running"
            ? "…"
            : `exit ${block.exitCode ?? "?"} · ${duration}`}
        </span>
      </button>
      <div style={{ display: "flex", gap: "4px", padding: "2px 0" }}>
        <button
          className="cmd-copy"
          onClick={handleCopy}
          title="Copy command"
          style={{ fontSize: "10px", padding: "1px 6px" }}
        >
          Copy
        </button>
      </div>
      {open && outputLines.length > 0 && (
        <div className="cmd-block-body">
          <pre style={{ margin: 0, fontSize: "11px", opacity: 0.8 }}>
            {outputLines.join("\n")}
          </pre>
        </div>
      )}
      {open && block.finishedAt == null && (
        <div className="cmd-block-body">running…</div>
      )}
    </div>
  );
}
