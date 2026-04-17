import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Provider } from "./providers.js";
import { C } from "./index.js";

type RunEvent = {
  type: string;
  ts?: number;
  data?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  exit_code?: number;
};

type Run = {
  id: string;
  taskId: string;
  events: RunEvent[] | string[];
  createdAt?: string;
};

async function getToken(): Promise<string> {
  try {
    const raw = await readFile(join(homedir(), ".forge", "token"), "utf8");
    return (JSON.parse(raw) as { access_token: string }).access_token;
  } catch {
    throw new Error("Not logged in. Run: forge login");
  }
}

export async function diff(
  _providers: Record<string, Provider>,
  runId: string
): Promise<void> {
  const token = await getToken();
  const apiUrl = process.env.FORGE_API_URL ?? "https://api.forge.sh";

  const res = await fetch(`${apiUrl}/v1/runs/${runId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GET /v1/runs/${runId} → ${res.status}: ${await res.text()}`);
  }
  const run = (await res.json()) as Run;

  // Normalize events: they may be stored as JSON strings or objects
  const events: RunEvent[] = (run.events ?? []).map((e) => {
    if (typeof e === "string") {
      try { return JSON.parse(e) as RunEvent; } catch { return { type: "raw", data: e }; }
    }
    return e as RunEvent;
  });

  const totalEvents = events.length;

  // Duration from first to last ts
  const timestamps = events.map((e) => e.ts ?? 0).filter((t) => t > 0);
  const firstTs = timestamps.length ? Math.min(...timestamps) : 0;
  const lastTs = timestamps.length ? Math.max(...timestamps) : 0;
  const durationSec = firstTs && lastTs ? ((lastTs - firstTs) / 1000).toFixed(1) : "0.0";

  // Tokens from llm events
  let promptTokens = 0;
  let completionTokens = 0;
  for (const e of events) {
    if (e.usage) {
      promptTokens += e.usage.prompt_tokens ?? 0;
      completionTokens += e.usage.completion_tokens ?? 0;
    }
  }

  // Exit codes from osc133 command_finished events
  let okCommands = 0;
  let failedCommands = 0;
  for (const e of events) {
    if (e.type === "osc133" || e.type === "command_finished") {
      if (e.exit_code === 0) okCommands++;
      else failedCommands++;
    }
  }

  // PTY events byte count
  let ptyBytes = 0;
  for (const e of events) {
    if (e.type === "pty" && e.data) {
      ptyBytes += Buffer.byteLength(e.data, "utf8");
    }
  }

  console.log(`${C.bold}Run${C.reset} ${run.id}`);
  console.log(`Duration: ${durationSec}s`);
  console.log(`Events: ${totalEvents}`);
  console.log(`Tokens: ${promptTokens} (prompt) + ${completionTokens} (completion)`);
  console.log(`Commands: ${okCommands} ok, ${failedCommands} failed`);
  console.log(`PTY output: ${ptyBytes} bytes`);
}
