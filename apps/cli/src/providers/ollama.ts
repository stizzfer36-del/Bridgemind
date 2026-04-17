import type { Provider } from "../providers.js";

export async function listModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/tags`);
  if (!res.ok) throw new Error(`ollama listModels ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { models: { name: string }[] };
  return (data.models ?? []).map((m) => m.name);
}

export async function pullModel(baseUrl: string, name: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/pull`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`ollama pull ${res.status}: ${await res.text()}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line) as { status?: string; completed?: number; total?: number };
        if (evt.status) {
          process.stderr.write(`[ollama pull] ${evt.status}\n`);
        }
      } catch { /* ignore */ }
    }
  }
}

async function* streamOllama(
  baseUrl: string,
  model: string,
  prompt: string
): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
  });
  if (res.status === 404) throw Object.assign(new Error("model not found"), { status: 404 });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let evt: { response?: string; done?: boolean };
      try { evt = JSON.parse(line); } catch { continue; }
      if (evt.response) yield evt.response;
      if (evt.done) return;
    }
  }
}

export function ollama(cfg: { baseUrl?: string }): Provider {
  const baseUrl = cfg.baseUrl ?? process.env.OLLAMA_URL ?? "http://localhost:11434";

  return {
    id: "ollama",
    async chat(messages, model) {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { message: { content: string } };
      return data.message.content;
    },
    async *stream(prompt, model) {
      try {
        yield* streamOllama(baseUrl, model, prompt);
      } catch (err) {
        const e = err as { status?: number };
        if (e.status === 404) {
          process.stderr.write(`[ollama] model "${model}" not found, pulling...\n`);
          await pullModel(baseUrl, model);
          yield* streamOllama(baseUrl, model, prompt);
        } else {
          throw err;
        }
      }
    },
    listModels() {
      return listModels(baseUrl);
    },
    pullModel(name: string) {
      return pullModel(baseUrl, name);
    },
  } as Provider & { listModels: () => Promise<string[]>; pullModel: (name: string) => Promise<void> };
}
