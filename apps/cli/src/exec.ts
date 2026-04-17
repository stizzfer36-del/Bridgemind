import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Provider } from "./providers.js";
import { defaultProvider } from "./providers.js";
import { C } from "./index.js";

type Task = {
  id: string;
  title: string;
  instructions: string;
  taskKnowledge?: string;
  status: string;
};

async function getToken(): Promise<string> {
  try {
    const raw = await readFile(join(homedir(), ".forge", "token"), "utf8");
    return (JSON.parse(raw) as { access_token: string }).access_token;
  } catch {
    throw new Error("Not logged in. Run: forge login");
  }
}

async function apiGet<T>(token: string, path: string): Promise<T> {
  const apiUrl = process.env.FORGE_API_URL ?? "https://api.forge.sh";
  const res = await fetch(`${apiUrl}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPatch<T>(token: string, path: string, body: unknown): Promise<T> {
  const apiUrl = process.env.FORGE_API_URL ?? "https://api.forge.sh";
  const res = await fetch(`${apiUrl}${path}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const apiUrl = process.env.FORGE_API_URL ?? "https://api.forge.sh";
  const res = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function exec(
  providers: Record<string, Provider>,
  taskId: string,
  flags: { positional: string[]; [key: string]: string | boolean | string[] } = { positional: [] as string[] }
): Promise<void> {
  const token = await getToken();

  // 1. Read task from API
  const task = await apiGet<Task>(token, `/v1/tasks/${taskId}`);
  console.log(`${C.bold}Task:${C.reset} ${task.title}`);

  // 2. Mark in-progress
  await apiPatch(token, `/v1/tasks/${taskId}`, { status: "in-progress" });

  // 3. Load provider
  const providerName = (flags.provider as string | undefined) ?? defaultProvider(providers);
  const provider = providers[providerName] ?? Object.values(providers)[0];
  if (!provider) throw new Error("no providers configured");
  console.log(`${C.blue}Provider:${C.reset} ${provider.id}`);

  // 4. Build prompt
  const prompt = [
    task.instructions,
    task.taskKnowledge ? `\n\nContext:\n${task.taskKnowledge}` : "",
  ]
    .join("")
    .trim();

  // 5. Stream LLM response to stdout
  const events: string[] = [];
  try {
    const providerWithStream = provider as Provider & {
      stream?: (prompt: string, model: string) => AsyncGenerator<string>;
    };
    const model = (flags.model as string | undefined) ?? "claude-opus-4-7";
    if (providerWithStream.stream) {
      const startTs = Date.now();
      const chunks: string[] = [];
      process.stdout.write(`\n${C.bold}Response:${C.reset}\n`);
      for await (const chunk of providerWithStream.stream(prompt, model)) {
        process.stdout.write(chunk);
        chunks.push(chunk);
      }
      process.stdout.write("\n");
      const output = chunks.join("");
      events.push(JSON.stringify({ type: "pty", ts: startTs, data: output }));
    } else {
      const startTs = Date.now();
      const output = await provider.chat(
        [{ role: "user", content: prompt }],
        model
      );
      process.stdout.write(`\n${C.bold}Response:${C.reset}\n${output}\n`);
      events.push(JSON.stringify({ type: "pty", ts: startTs, data: output }));
    }

    // 6. On success: update status and post run
    await apiPatch(token, `/v1/tasks/${taskId}`, { status: "in-review" });
    await apiPost(token, "/v1/runs", {
      taskId,
      events: events,
    });
    console.log(`\n${C.green}Done.${C.reset} Task moved to in-review.`);
  } catch (err) {
    // 7. On error: revert status and rethrow
    await apiPatch(token, `/v1/tasks/${taskId}`, { status: "todo" }).catch(() => {});
    throw err;
  }
}
