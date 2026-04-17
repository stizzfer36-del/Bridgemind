import type { Provider } from "../providers.js";

type Usage = { input_tokens?: number; output_tokens?: number };

export async function* stream(
  prompt: string,
  model: string,
  opts?: Record<string, unknown>,
  cfg: { apiKey?: string; baseUrl?: string } = {}
): AsyncGenerator<string> {
  const apiKey = cfg.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) throw new Error("Anthropic API key invalid");
  const baseUrl = cfg.baseUrl ?? "https://api.anthropic.com";

  const body = JSON.stringify({
    model,
    max_tokens: (opts?.maxTokens as number | undefined) ?? 4096,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  let retries = 0;
  while (true) {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body,
    });

    if (res.status === 401) throw new Error("Anthropic API key invalid");
    if (res.status === 429) {
      if (retries >= 3) throw new Error("Anthropic rate limit exceeded after 3 retries");
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      retries++;
      continue;
    }
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);

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
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        let evt: {
          type?: string;
          delta?: { type?: string; text?: string };
          message?: { usage?: Usage };
          usage?: Usage;
        };
        try { evt = JSON.parse(payload); } catch { continue; }
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta" && evt.delta.text) {
          yield evt.delta.text;
        }
      }
    }
    return;
  }
}

export function anthropic(cfg: { apiKey?: string; baseUrl?: string }): Provider {
  const apiKey = cfg.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? "https://api.anthropic.com";

  return {
    id: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    async chat(messages, model) {
      const system = messages.find((m) => m.role === "system")?.content;
      const rest = messages.filter((m) => m.role !== "system");
      let retries = 0;
      while (true) {
        const res = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            system,
            messages: rest.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        if (res.status === 401) throw new Error("Anthropic API key invalid");
        if (res.status === 429) {
          if (retries >= 3) throw new Error("Anthropic rate limit exceeded after 3 retries");
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          retries++;
          continue;
        }
        if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as { content: { text: string }[] };
        return data.content.map((c) => c.text).join("");
      }
    },
    stream(prompt, model, opts) {
      return stream(prompt, model, opts, cfg);
    },
  };
}
