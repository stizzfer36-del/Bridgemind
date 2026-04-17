import { useState } from "react";

export type Block = {
  id: string;
  command: string;
  startedAt: number;
  finishedAt?: number;
  exitCode?: number | null;
  state: "running" | "ok" | "err";
};

export default function CommandBlock({ block }: { block: Block }) {
  const [open, setOpen] = useState(true);
  const borderColor =
    block.state === "ok"
      ? "var(--ok, #36d399)"
      : block.state === "err"
        ? "var(--err, #ff4d4f)"
        : "var(--warn, #f5c542)";

  const duration =
    block.finishedAt != null
      ? `${((block.finishedAt - block.startedAt) / 1000).toFixed(2)}s`
      : "…";

  return (
    <div className="cmd-block" style={{ borderLeftColor: borderColor }}>
      <button className="cmd-block-head" onClick={() => setOpen((o) => !o)}>
        <span className="cmd">{block.command || "(command)"}</span>
        <span className="ts">{new Date(block.startedAt).toLocaleTimeString()}</span>
        <span className={`exit-badge state-${block.state}`}>
          {block.state === "running"
            ? "…"
            : `exit ${block.exitCode ?? "?"} · ${duration}`}
        </span>
      </button>
      {open && block.finishedAt == null && (
        <div className="cmd-block-body">running…</div>
      )}
    </div>
  );
}
