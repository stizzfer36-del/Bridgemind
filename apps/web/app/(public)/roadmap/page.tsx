import React from "react";

type Status = "shipped" | "in-progress" | "planned";

const milestones: { version: string; status: Status; title: string; items: string[] }[] = [
  {
    version: "v0.1",
    status: "shipped",
    title: "Scaffold",
    items: ["Monorepo setup (Turborepo)", "25 schema-validated themes", "Basic PTY integration"],
  },
  {
    version: "v0.2",
    status: "shipped",
    title: "MCP Server",
    items: ["11 data tools (read/write/search)", "9 UI control tools (reverse MCP)", "HMAC-signed agent mailbox"],
  },
  {
    version: "v0.3",
    status: "in-progress",
    title: "Production hardening",
    items: ["REST API hardening + rate limiting", "Bench harness (130 tasks × 6 categories)", "Deterministic replay via JSONL traces"],
  },
  {
    version: "v0.4",
    status: "planned",
    title: "Plugin WASM runtime",
    items: ["WASM sandboxed skill plugins (U7)", "Plugin registry + versioning", "Hot-reload without restart"],
  },
  {
    version: "v0.5",
    status: "planned",
    title: "Voice transcription",
    items: ["Whisper.cpp local transcription", "Hotkey push-to-talk", "Voice-to-task pipeline"],
  },
  {
    version: "v1.0",
    status: "planned",
    title: "Public launch",
    items: ["brew / scoop / apt packages", "forge.sh marketing site live", "Stable API + plugin ABI"],
  },
];

const badge: Record<Status, { label: string; color: string; bg: string }> = {
  shipped:     { label: "Shipped",      color: "#22c55e", bg: "#052e16" },
  "in-progress": { label: "In Progress", color: "#facc15", bg: "#1c1400" },
  planned:     { label: "Planned",      color: "#888",    bg: "#111" },
};

export default function Roadmap() {
  return (
    <>
      <style>{`
        .roadmap-page { padding: 72px 0 96px; }
        .roadmap-page h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
        .roadmap-intro { color: #aaa; margin-bottom: 64px; font-size: 1rem; }
        .timeline { position: relative; padding-left: 32px; }
        .timeline::before { content: ""; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: var(--border); }
        .milestone { position: relative; margin-bottom: 40px; }
        .milestone::before { content: ""; position: absolute; left: -29px; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg); }
        .milestone-card { background: #111; border: 1px solid var(--border); border-radius: 10px; padding: 24px 28px; }
        .milestone-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .milestone-version { font-size: 0.9rem; font-weight: 700; color: var(--accent); font-family: monospace; }
        .milestone-title { font-size: 1.05rem; font-weight: 700; }
        .badge { font-size: 0.75rem; font-weight: 600; padding: 2px 10px; border-radius: 9999px; }
        .milestone-items { list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .milestone-items li { color: #aaa; font-size: 0.875rem; padding-left: 16px; position: relative; }
        .milestone-items li::before { content: "·"; position: absolute; left: 0; color: var(--accent); }
      `}</style>
      <div className="container roadmap-page">
        <h1>Roadmap</h1>
        <p className="roadmap-intro">Where Forge has been and where it&apos;s going.</p>
        <div className="timeline">
          {milestones.map((m) => {
            const b = badge[m.status];
            return (
              <div key={m.version} className="milestone">
                <div className="milestone-card">
                  <div className="milestone-header">
                    <span className="milestone-version">{m.version}</span>
                    <span className="milestone-title">{m.title}</span>
                    <span
                      className="badge"
                      style={{ color: b.color, background: b.bg, border: `1px solid ${b.color}33` }}
                    >
                      {b.label}
                    </span>
                  </div>
                  <ul className="milestone-items">
                    {m.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
