import React from "react";

const features = [
  { icon: "🖥️", title: "Native ADE", desc: "Tauri desktop, zero browser overhead. Full multi-pane terminal + editor + Kanban in one window." },
  { icon: "🔌", title: "MCP Server", desc: "11 data tools + 9 UI control tools. Reverse MCP bridges agents to your actual UI state." },
  { icon: "🔄", title: "Deterministic Replay", desc: "JSONL trace captures every event. Byte-perfect reproducer for any agent session." },
  { icon: "🌊", title: "Multi-agent Swarms", desc: "HMAC-signed mailbox routes tasks across 1–16 parallel agents with a full audit trail." },
  { icon: "🎨", title: "25 Themes", desc: "Schema-validated themes sync xterm.js and CodeMirror palettes simultaneously." },
  { icon: "🦀", title: "Open Core", desc: "MIT apps, AGPL backend. Buy a commercial license only when you ship SaaS." },
];

export default function Home() {
  return (
    <>
      <style>{`
        nav { border-bottom: 1px solid var(--border); }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 56px; }
        .nav-logo { font-size: 1.25rem; font-weight: 700; color: var(--fg); }
        .nav-links { display: flex; gap: 24px; align-items: center; }
        .hero { padding: 96px 0 72px; text-align: center; }
        .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; }
        .hero p { font-size: 1.15rem; color: #aaa; max-width: 560px; margin: 0 auto 36px; }
        .hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .terminal-demo { background: #111; border: 1px solid var(--border); border-radius: 10px; padding: 24px; font-family: monospace; font-size: 0.85rem; color: #a3e635; max-width: 680px; margin: 56px auto 0; text-align: left; overflow: hidden; white-space: pre; line-height: 1.6; }
        @keyframes typing { from { width: 0 } to { width: 100% } }
        @keyframes blink { 50% { opacity: 0 } }
        .typed { display: inline-block; overflow: hidden; white-space: nowrap; animation: typing 2s steps(40) forwards; }
        .cursor { display: inline-block; width: 8px; height: 1em; background: #a3e635; vertical-align: text-bottom; animation: blink 1s step-end infinite; margin-left: 2px; }
        .features { padding: 80px 0; }
        .features h2 { text-align: center; font-size: 1.8rem; margin-bottom: 48px; }
        .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 768px) { .feature-grid { grid-template-columns: 1fr; } }
        .feature-card { background: #111; border: 1px solid var(--border); border-radius: 10px; padding: 28px; }
        .feature-icon { font-size: 2rem; margin-bottom: 12px; }
        .feature-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
        .feature-card p { color: #aaa; font-size: 0.9rem; line-height: 1.5; }
        footer { border-top: 1px solid var(--border); padding: 32px 0; }
        .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .footer-links { display: flex; gap: 20px; }
        .footer-copy { color: #666; font-size: 0.85rem; }
      `}</style>
      <nav>
        <div className="container nav-inner">
          <span className="nav-logo">⚒ Forge</span>
          <div className="nav-links">
            <a href="/download">Download</a>
            <a href="https://github.com/forge-sh/forge" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="/dashboard/projects">Sign in</a>
          </div>
        </div>
      </nav>

      <div className="container">
        <section className="hero">
          <h1>Build faster with AI agents that remember context</h1>
          <p>Forge is an open-core AI Development Environment with native Tauri desktop, MCP tools, multi-agent swarms, and deterministic replay.</p>
          <div className="hero-ctas">
            <a href="/download" className="btn btn-primary">Download for macOS</a>
            <a href="https://github.com/forge-sh/forge" target="_blank" rel="noopener noreferrer" className="btn btn-outline">View on GitHub</a>
          </div>
          <pre className="terminal-demo">{`$ forge init my-project
✓ Scaffolded monorepo in 0.4s

$ forge agent run --model claude-3-7-sonnet --swarm 4
◆ Spawning 4 agents with HMAC-signed mailbox...
  [agent-1] ✓ claimed task: implement auth middleware
  [agent-2] ✓ claimed task: write unit tests
  [agent-3] ✓ claimed task: update OpenAPI schema
  [agent-4] ✓ claimed task: fix linting errors

$ forge replay --trace .forge/traces/session-abc123.jsonl
◆ Replaying 847 events — byte-perfect`}</pre>
        </section>

        <section className="features">
          <h2>Everything in one window</h2>
          <div className="feature-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer>
        <div className="container footer-inner">
          <span className="footer-copy">© {new Date().getFullYear()} Forge contributors. Open-core software.</span>
          <div className="footer-links">
            <a href="https://github.com/forge-sh/forge" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="/docs">Docs</a>
            <a href="/pricing">Pricing</a>
          </div>
        </div>
      </footer>
    </>
  );
}
