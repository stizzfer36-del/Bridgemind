import type { Provider } from "../providers.js";

export function anthropic(cfg: { apiKey?: string; baseUrl?: string }): Provider {
  const apiKey = cfg.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? "https://api.anthropic.com";
  return {
    id: "anthropic",
    async chat(messages, model) {
      const system = messages.find((m) => m.role === "system")?.content;
      const rest = messages.filter((m) => m.role !== "system");
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
      if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { content: { text: string }[] };
      return data.content.map((c) => c.text).join("");
    },
  };
}
