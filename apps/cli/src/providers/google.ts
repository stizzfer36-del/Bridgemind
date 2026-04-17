import type { Provider } from "../providers.js";

export function google(cfg: { apiKey?: string; baseUrl?: string }): Provider {
  const apiKey = cfg.apiKey ?? process.env.GOOGLE_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? "https://generativelanguage.googleapis.com";
  return {
    id: "google",
    async chat(messages, model) {
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const res = await fetch(
        `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );
      if (!res.ok) throw new Error(`google ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        candidates: { content: { parts: { text: string }[] } }[];
      };
      return data.candidates[0]?.content.parts.map((p) => p.text).join("") ?? "";
    },
  };
}
