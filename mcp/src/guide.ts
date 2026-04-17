export const DEVELOPER_GUIDE = `# BridgeMind Developer Guide

BridgeMind is a task-and-agent orchestration platform. Projects group tasks
and agents. Tasks flow through: \`todo → in-progress → in-review → complete\`
(or \`cancelled\`). Agents are CLI-backed coding assistants (ClaudeCode,
Cursor, Codex, Gemini, Windsurf) plus custom profiles with user-defined
system prompts.

## Auth
All REST and MCP calls require a bearer API key prefixed with \`bm_live_\` or
\`bm_test_\`. MCP also accepts \`?apiKey=\` query-string auth.

## Task contract for agents
When BridgeSpace launches an agent for a task, the agent receives:
  - Task id
  - Instructions
  - Task knowledge

When the agent finishes work it MUST call the MCP tool \`update_task\` with
\`status="in-review"\`. If blocked, it MUST set \`status="todo"\` with updated
instructions describing the blocker.

## Limits
  - instructions ≤ 5,000 chars
  - taskKnowledge ≤ 50,000 chars
  - systemPrompt ≤ 100,000 chars
  - name ≤ 255 chars
  - description ≤ 2,000 chars
`;
