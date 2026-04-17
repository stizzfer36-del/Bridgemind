import type { Provider } from "../providers.js";

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
  };
}
