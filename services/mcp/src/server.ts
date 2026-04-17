import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { randomUUID } from "node:crypto";
import { ForgeClient } from "./api.js";
import { dataTools } from "./tools.js";
import { uiTools } from "./ui_tools.js";
import { DEVELOPER_GUIDE } from "./guide.js";

/**
 * UI bridges — per-apiKey sockets from the desktop client. When a remote
 * MCP caller invokes a UI tool (U4), the MCP server forwards the call over
 * the bridge and awaits the response.
 */
const uiBridges = new Map<string, WebSocket>();
const uiPending = new Map<string, (v: unknown) => void>();

function forwardToUi(apiKey: string, tool: string, args: unknown): Promise<unknown> {
  const ws = uiBridges.get(apiKey);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error("desktop not connected"));
  }
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      uiPending.delete(id);
      reject(new Error("ui tool timeout"));
    }, 15_000);
    uiPending.set(id, (v) => {
      clearTimeout(timeout);
      resolve(v);
    });
    ws.send(JSON.stringify({ id, tool, args }));
  });
}

function buildServer(apiKey: string): McpServer {
  const server = new McpServer({ name: "forge-mcp", version: "1.0.0" });
  const client = new ForgeClient(apiKey);

  // Data tools
  for (const [name, def] of Object.entries(dataTools)) {
    server.registerTool(
      name,
      { description: def.description, inputSchema: def.input.shape as never },
      async (args: unknown) => {
        const result = await def.run(client)(args as never);
        return {
          content: [{ type: "text", text: JSON.stringify(result ?? null, null, 2) }],
        };
      }
    );
  }

  // UI action tools (U4) — forwarded to desktop via ui_bridge
  for (const [name, def] of Object.entries(uiTools)) {
    server.registerTool(
      name,
      { description: def.description, inputSchema: def.input.shape as never },
      async (args: unknown) => {
        const result = await forwardToUi(apiKey, name, args);
        return {
          content: [{ type: "text", text: JSON.stringify(result ?? null, null, 2) }],
        };
      }
    );
  }

  server.registerResource(
    "forge_developer_guide",
    "forge://guide",
    {
      title: "Forge developer guide",
      description: "Canonical usage guide for the Forge platform.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [{ uri: "forge://guide", mimeType: "text/markdown", text: DEVELOPER_GUIDE }],
    })
  );

  return server;
}

function extractApiKey(req: express.Request): string | null {
  const h = req.headers["authorization"];
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) {
    return h.slice(7).trim();
  }
  const q = req.query.apiKey;
  if (typeof q === "string" && q) return q;
  return null;
}

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/mcp", async (req, res) => {
  const key = extractApiKey(req);
  if (!key) return res.status(401).json({ error: "missing api key" });
  const srv = buildServer(key);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  res.on("close", () => void transport.close());
  await srv.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const sseSessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();
const SESSION_TTL = 30 * 60 * 1000;

app.get("/sse", async (req, res) => {
  const key = extractApiKey(req);
  if (!key) return res.status(401).end("missing api key");
  const transport = new SSEServerTransport("/messages", res);
  const srv = buildServer(key);
  await srv.connect(transport);
  sseSessions.set(transport.sessionId, { transport, server: srv });
  setTimeout(() => {
    void transport.close();
    sseSessions.delete(transport.sessionId);
  }, SESSION_TTL);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) return res.status(400).json({ error: "missing sessionId" });
  const s = sseSessions.get(sessionId);
  if (!s) return res.status(404).json({ error: "unknown session" });
  await s.transport.handlePostMessage(req, res, req.body);
});

app.get("/health", (_, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 4100);
const httpServer = app.listen(port, () => console.log(`forge-mcp on :${port}`));

// UI bridge (U4) — desktop clients connect here and listen for forwarded tool calls.
const wss = new WebSocketServer({ server: httpServer, path: "/ui-bridge" });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const key = url.searchParams.get("apiKey") ?? "";
  if (!key) {
    ws.close(1008, "apiKey required");
    return;
  }
  uiBridges.set(key, ws);
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(String(data)) as { id: string; result: unknown };
      const cb = uiPending.get(msg.id);
      if (cb) {
        uiPending.delete(msg.id);
        cb(msg.result);
      }
    } catch {
      /* ignore */
    }
  });
  ws.on("close", () => {
    if (uiBridges.get(key) === ws) uiBridges.delete(key);
  });
});

