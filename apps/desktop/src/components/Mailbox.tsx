import { useMemo } from "react";
import { useSwarms } from "../state/swarms";

export default function Mailbox() {
  const active = useSwarms((s) => s.active);
  const mailbox = useSwarms((s) => s.mailbox);
  const filter = useSwarms((s) => s.filterAgentId);
  const setFilter = useSwarms((s) => s.setFilter);

  const visible = useMemo(
    () => (filter ? mailbox.filter((m) => m.fromAgentId === filter || m.toAgentId === filter) : mailbox),
    [filter, mailbox]
  );

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
        {filter && (
          <button onClick={() => setFilter(null)}>Clear filter</button>
        )}
      </header>
      <ol className="mail-log">
        {visible.map((m) => (
          <li key={m.id} className="mail-row">
            <div className="mail-head">
              <span
                className="from"
                onClick={() => setFilter(m.fromAgentId)}
                title="Filter by sender"
              >
                {m.fromAgentId}
              </span>
              {m.toAgentId && (
                <>
                  <span className="arrow">→</span>
                  <span
                    className="to"
                    onClick={() => setFilter(m.toAgentId!)}
                    title="Filter by recipient"
                  >
                    {m.toAgentId}
                  </span>
                </>
              )}
              <span className="ts">{new Date(m.ts).toLocaleTimeString()}</span>
              <span className="sig" title={m.sig}>
                sig:{m.sig.slice(0, 8)}…
              </span>
            </div>
            <div className="mail-body">{m.body}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
