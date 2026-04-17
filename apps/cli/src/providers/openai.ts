import type { Provider } from "../providers.js";

export function openai(cfg: { apiKey?: string; baseUrl?: string }): Provider {
  const apiKey = cfg.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? "https://api.openai.com";
  return {
    id: "openai",
    async chat(messages, model) {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, messages }),
      });
      if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      return data.choices[0]?.message.content ?? "";
    },
  };
}
