export default function Home() {
  return (
    <main className="landing">
      <h1>Forge</h1>
      <p>
        One desktop window to orchestrate 1–16 parallel coding agents against a
        single codebase. Open-core, single hostname, real free tier.
      </p>
      <ul>
        <li>ADE — multi-pane terminal + editor + Kanban</li>
        <li>Swarms — signed mailbox, deterministic replay</li>
        <li>MCP — 15 data tools + 9 UI tools (reverse MCP)</li>
        <li>CLI — BYO keys for 7 providers</li>
        <li>Voice — hotkey push-to-talk, local whisper.cpp</li>
        <li>Bench — 130 tasks × 6 categories, Docker-sandboxed</li>
      </ul>
      <a href="/pricing">Pricing →</a>
    </main>
  );
}
