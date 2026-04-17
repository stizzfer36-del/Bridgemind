import type { Provider } from "../providers.js";

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function* streamOpenAI(
  prompt: string,
  model: string,
  apiKey: string,
  baseUrl: string,
  opts?: Record<string, unknown>
): AsyncGenerator<string> {
  let retries = 0;
  while (true) {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        ...(opts ?? {}),
      }),
    });

    if (res.status === 429) {
      if (retries >= 3) throw new Error(`${baseUrl} rate limit exceeded after 3 retries`);
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
      await sleep(retryAfter * 1000);
      retries++;
      continue;
    }
    if (!res.ok) throw new Error(`openai-compat ${res.status}: ${await res.text()}`);

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
        let chunk: { choices?: { delta?: { content?: string } }[] };
        try { chunk = JSON.parse(payload); } catch { continue; }
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) yield text;
      }
    }
    return;
  }
}

export function openai(cfg: { apiKey?: string; baseUrl?: string }): Provider {
  const apiKey = cfg.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? "https://api.openai.com";

  return {
    id: "openai",
    envKey: "OPENAI_API_KEY",
    async chat(messages, model) {
      let retries = 0;
      while (true) {
        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({ model, messages }),
        });
        if (res.status === 429) {
          if (retries >= 3) throw new Error("OpenAI rate limit exceeded after 3 retries");
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
          await sleep(retryAfter * 1000);
          retries++;
          continue;
        }
        if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as {
          choices: { message: { content: string } }[];
        };
        return data.choices[0]?.message.content ?? "";
      }
    },
    stream(prompt, model, opts) {
      return streamOpenAI(prompt, model, apiKey, baseUrl, opts);
    },
  };
}
