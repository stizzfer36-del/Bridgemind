import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { BridgeMindClient } from "./api.js";
import { toolDefs } from "./tools.js";
import { DEVELOPER_GUIDE } from "./guide.js";

function buildServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "bridgemind-mcp",
    version: "0.1.0",
  });

  const client = new BridgeMindClient(apiKey);

  for (const [name, def] of Object.entries(toolDefs)) {
    server.registerTool(
      name,
      {
        description: def.description,
        inputSchema: def.input.shape as never,
      },
      async (args: unknown) => {
        const result = await def.handler(client)(args as never);
        return {
          content: [
            { type: "text", text: JSON.stringify(result ?? null, null, 2) },
          ],
        };
      }
    );
  }

  server.registerResource(
    "bridgemind_developer_guide",
    "bridgemind://guide",
    {
      title: "BridgeMind developer guide",
      description: "Canonical usage guide for the BridgeMind platform.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "bridgemind://guide",
          mimeType: "text/markdown",
          text: DEVELOPER_GUIDE,
        },
      ],
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

// Streamable HTTP transport (preferred)
app.post("/mcp", async (req, res) => {
  const key = extractApiKey(req);
  if (!key) return res.status(401).json({ error: "missing api key" });
  const server = buildServer(key);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });
  res.on("close", () => void transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Legacy SSE transport — 30 min session
const sseSessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();
const SESSION_TTL = 30 * 60 * 1000;

app.get("/sse", async (req, res) => {
  const key = extractApiKey(req);
  if (!key) return res.status(401).end("missing api key");
  const transport = new SSEServerTransport("/messages", res);
  const server = buildServer(key);
  await server.connect(transport);
  sseSessions.set(transport.sessionId, { transport, server });
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
app.listen(port, () => {
  console.log(`BridgeMCP listening on :${port}`);
});
