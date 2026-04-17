import type { Provider } from "../providers.js";

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
  };
}
