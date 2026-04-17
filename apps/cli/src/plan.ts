import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Provider } from "./providers.js";
import { defaultProvider } from "./providers.js";
import { C } from "./index.js";

type PlanItem = {
  title: string;
  complexity: "easy" | "medium" | "hard";
  estimatedMinutes: number;
};

function parseItems(raw: string): PlanItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("No JSON array found in LLM response");
    parsed = JSON.parse(raw.slice(start, end + 1));
  }
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
  return parsed as PlanItem[];
}

function complexityColor(c: string): string {
  if (c === "easy") return C.green;
  if (c === "medium") return C.yellow;
  return C.red;
}

async function getToken(): Promise<string> {
  try {
    const raw = await readFile(join(homedir(), ".forge", "token"), "utf8");
    return (JSON.parse(raw) as { access_token: string }).access_token;
  } catch {
    return "";
  }
}

export async function plan(
  providers: Record<string, Provider>,
  goal: string,
  flags: { positional: string[]; [key: string]: string | boolean | string[] } = { positional: [] as string[] }
): Promise<void> {
  const model = (flags.model as string | undefined) ?? "claude-opus-4-7";
  const provider = providers[defaultProvider(providers)] ?? Object.values(providers)[0];
  if (!provider) throw new Error("no providers configured");

  const system =
    'You are a planner. Decompose the user\'s goal into ≤8 atomic coding tasks. ' +
    'Output ONLY a JSON array: [{ "title": string, "complexity": "easy"|"medium"|"hard", "estimatedMinutes": number }]';

  let response: string;
  const providerWithStream = provider as Provider & {
    stream?: (prompt: string, model: string) => AsyncGenerator<string>;
  };

  if (providerWithStream.stream) {
    const chunks: string[] = [];
    for await (const chunk of providerWithStream.stream(
      `System: ${system}\n\nUser: ${goal}`,
      model
    )) {
      chunks.push(chunk);
    }
    response = chunks.join("");
  } else {
    response = await provider.chat(
      [
        { role: "system", content: system },
        { role: "user", content: goal },
      ],
      model
    );
  }

  const items = parseItems(response);

  console.log(`\n${C.bold}Plan for:${C.reset} ${goal}\n`);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const col = complexityColor(item.complexity);
    console.log(
      `${i + 1}. ${col}[${item.complexity}]${C.reset} ${item.title} (${item.estimatedMinutes}m)`
    );
  }
  console.log("");

  if (flags["dry-run"]) {
    console.log(`${C.yellow}--dry-run: skipping task creation${C.reset}`);
    return;
  }

  if (flags.create) {
    const token = await getToken();
    if (!token) {
      console.error(`${C.red}Not logged in. Run: forge login${C.reset}`);
      process.exit(1);
    }
    const apiUrl = process.env.FORGE_API_URL ?? "https://api.forge.sh";
    let created = 0;
    for (const item of items) {
      const res = await fetch(`${apiUrl}/v1/tasks`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: item.title,
          complexity: item.complexity,
          estimatedMinutes: item.estimatedMinutes,
        }),
      });
      if (res.ok) {
        created++;
      } else {
        console.error(`${C.red}Failed to create task "${item.title}":${C.reset} ${res.status}`);
      }
    }
    console.log(`${C.green}Created ${created}/${items.length} tasks${C.reset}`);
  }
}
