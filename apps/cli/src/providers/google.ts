import type { Provider } from "../providers.js";

type GoogleUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export async function* streamGoogle(
  prompt: string,
  model: string,
  apiKey: string,
  baseUrl: string
): AsyncGenerator<string> {
  const url =
    `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent` +
    `?key=${apiKey}&alt=sse`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) throw new Error(`google ${res.status}: ${await res.text()}`);

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
      if (!payload) continue;
      let evt: {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: GoogleUsage;
      };
      try { evt = JSON.parse(payload); } catch { continue; }
      const text = evt.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) yield text;
    }
  }
}

export function google(cfg: { apiKey?: string; baseUrl?: string }): Provider {
  const apiKey = cfg.apiKey ?? process.env.GOOGLE_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? "https://generativelanguage.googleapis.com";

  return {
    id: "google",
    envKey: "GOOGLE_API_KEY",
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
    stream(prompt, model) {
      return streamGoogle(prompt, model, apiKey, baseUrl);
    },
  };
}
