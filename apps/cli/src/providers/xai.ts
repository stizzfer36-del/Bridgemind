import type { Provider } from "../providers.js";
import { streamOpenAI } from "./openai.js";

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function xai(cfg: { apiKey?: string; baseUrl?: string }): Provider {
  const apiKey = cfg.apiKey ?? process.env.XAI_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? "https://api.x.ai";

  return {
    id: "xai",
    envKey: "XAI_API_KEY",
    async chat(messages, model) {
      let retries = 0;
      while (true) {
        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({ model, messages }),
        });
        if (res.status === 429) {
          if (retries >= 3) throw new Error("xAI rate limit exceeded after 3 retries");
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
          await sleep(retryAfter * 1000);
          retries++;
          continue;
        }
        if (!res.ok) throw new Error(`xai ${res.status}: ${await res.text()}`);
        const data = (await res.json()) as {
          choices: { message: { content: string } }[];
        };
        return data.choices[0]?.message.content ?? "";
      }
    },
    // xAI uses OpenAI-compatible SSE streaming
    stream(prompt, model, opts) {
      return streamOpenAI(prompt, model, apiKey, baseUrl, opts);
    },
  };
}
