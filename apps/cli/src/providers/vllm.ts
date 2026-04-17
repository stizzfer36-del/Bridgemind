import type { Provider } from "../providers.js";
import { streamOpenAI } from "./openai.js";

export async function listModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/v1/models`, {
    headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
  });
  if (!res.ok) throw new Error(`vllm listModels ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: { id: string }[] };
  return (data.data ?? []).map((m) => m.id);
}

export function vllm(cfg: { baseUrl?: string; apiKey?: string }): Provider {
  const baseUrl = cfg.baseUrl ?? process.env.VLLM_URL ?? "http://localhost:8000";
  const apiKey = cfg.apiKey ?? process.env.VLLM_API_KEY ?? "";

  return {
    id: "vllm",
    async chat(messages, model) {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          "content-type": "application/json",
        },
        body: JSON.stringify({ model, messages }),
      });
      if (!res.ok) throw new Error(`vllm ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      return data.choices[0]?.message.content ?? "";
    },
    // vLLM uses OpenAI-compatible streaming
    stream(prompt, model, opts) {
      return streamOpenAI(prompt, model, apiKey, baseUrl, opts);
    },
    listModels() {
      return listModels(baseUrl, apiKey);
    },
  } as Provider & { listModels: () => Promise<string[]> };
}
