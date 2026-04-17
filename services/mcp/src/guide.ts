export const DEVELOPER_GUIDE = `# Forge Developer Guide

Forge is a task-and-agent orchestration platform with an open-core ADE.
Projects group tasks, agents, and swarms. Tasks flow
\`todo → in-progress → in-review → complete\` (or \`cancelled\`). Agents are
CLI-backed assistants (ClaudeCode, Cursor, Codex, Gemini, Windsurf, local
models via Ollama/vLLM) plus custom profiles with user-defined system
prompts.

## Auth
Bearer a \`forge_live_\` / \`forge_test_\` API key OR a JWT from the OAuth2
PKCE flow. \`?apiKey=\` query fallback is supported on MCP endpoints.
Rate limit: 120 req/min per key.

## Task contract for agents
Every agent launched in a Forge pane receives \`taskId\`, \`instructions\`,
and \`taskKnowledge\` on stdin via a here-doc. On completion the agent MUST
call the MCP tool \`update_task\` with \`status="in-review"\`; if blocked,
\`status="todo"\` with updated instructions.

## UI tools (U4 — reverse MCP)
Beyond data, Forge exposes \`open_file\`, \`save_file\`, \`split_pane\`,
\`focus_pane\`, \`run_command\`, \`move_card\`, \`set_layout\`, \`set_theme\`,
\`toast\`. These are forwarded to the user's desktop client over a
WebSocket bridge. They are opt-in per session; denial is returned if no
desktop client is connected for the API key.

## Swarm mailbox (U10)
Every message in a swarm mailbox is HMAC-signed (\`sig\`) and timestamped
(\`ts\`). Agents should call \`read_mailbox\` to poll and \`send_message\` to
communicate. The mailbox is viewable in the ADE Mailbox tab.

## Deterministic replay (U5)
Every run produces a JSONL trace fetchable via \`get_run_trace\`. A
standalone \`replay.sh\` reproducer is available at
\`/v1/runs/:id/replay.sh\`.

## Limits
  - instructions   ≤ 5,000
  - taskKnowledge  ≤ 50,000
  - systemPrompt   ≤ 100,000
  - messages       ≤ 10,000
  - name           ≤ 255
  - description    ≤ 2,000
  - roles per swarm≤ 16
`;
