import { useEffect, useMemo, useRef } from "react";
import { useSwarms } from "../state/swarms";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(ts: number): string {
  const diffMs = ts - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  return rtf.format(diffDay, "day");
}

type MailMsg = { id: string; swarmId: string; fromAgentId: string; toAgentId?: string; body: string; sig: string; ts: number };

function exportMessages(messages: MailMsg[]) {
  const data = JSON.stringify(messages, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mailbox-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Mailbox() {
  const active = useSwarms((s) => s.active);
  const mailbox = useSwarms((s) => s.mailbox);
  const filter = useSwarms((s) => s.filterAgentId);
  const setFilter = useSwarms((s) => s.setFilter);
  const listRef = useRef<HTMLOListElement>(null);

  const visible = useMemo(
    () => (filter ? mailbox.filter((m) => m.fromAgentId === filter || m.toAgentId === filter) : mailbox),
    [filter, mailbox]
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [visible]);

  if (!active) {
    return (
      <div className="mailbox empty">
        <p>No active swarm.</p>
        <p className="muted">Start a swarm from the Kanban to see signed messages here.</p>
      </div>
    );
  }

  return (
    <div className="mailbox">
      <header>
        <div>
          <div className="swarm-goal">{active.goal}</div>
          <div className="swarm-meta">
            {active.roles.length} roles · status: <b>{active.status}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {filter && <button onClick={() => setFilter(null)}>Clear filter</button>}
          <button onClick={() => exportMessages(mailbox)} title="Export messages as JSON">Export</button>
        </div>
      </header>
      <ol className="mail-log" ref={listRef}>
        {visible.map((m) => (
          <li key={m.id} className="mail-row">
            <div className="mail-head">
              <span className="from" onClick={() => setFilter(m.fromAgentId)} title="Filter by sender">
                {m.fromAgentId}
              </span>
              {m.toAgentId && (
                <>
                  <span className="arrow">→</span>
                  <span className="to" onClick={() => setFilter(m.toAgentId!)} title="Filter by recipient">
                    {m.toAgentId}
                  </span>
                </>
              )}
              <span className="ts" title={new Date(m.ts).toLocaleString()}>
                {relativeTime(m.ts)}
              </span>
              <span className="sig" title={m.sig} style={{ color: m.sig.length > 0 ? "var(--ok, #36d399)" : "var(--border)" }}>
                {m.sig.length > 0 ? "✓" : "?"}
              </span>
            </div>
            <div className="mail-body">{m.body}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
