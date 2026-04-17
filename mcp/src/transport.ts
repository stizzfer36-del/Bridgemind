/**
 * Transport selection helpers. Consumers should prefer the Streamable HTTP
 * endpoint (`POST /mcp`); the SSE pair (`GET /sse` + `POST /messages`) is kept
 * only for legacy clients pinned to the 2024 MCP protocol revision.
 */
export const TRANSPORT_ENDPOINTS = {
  streamable: "/mcp",
  sse: "/sse",
  messages: "/messages",
} as const;

export const SSE_SESSION_TTL_MS = 30 * 60 * 1000;
