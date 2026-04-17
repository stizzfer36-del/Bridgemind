import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

import { anthropic } from "./providers/anthropic.js";
import { openai } from "./providers/openai.js";
import { google } from "./providers/google.js";
import { xai } from "./providers/xai.js";
import { groq } from "./providers/groq.js";
import { ollama } from "./providers/ollama.js";
import { vllm } from "./providers/vllm.js";

export type Provider = {
  id: string;
  chat: (messages: { role: "system" | "user" | "assistant"; content: string }[], model: string) => Promise<string>;
};

const ConfigSchema = z.object({
  default: z.string().optional(),
  providers: z.record(
    z.object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      model: z.string().optional(),
    })
  ),
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadProviders(): Promise<Record<string, Provider>> {
  const configPath = join(homedir(), ".forge", "providers.yaml");
  let raw = "";
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    // no config — fall back to env-only providers
  }
  const cfg = raw ? ConfigSchema.parse(parseYaml(raw)) : { providers: {} };

  return {
    anthropic: anthropic(cfg.providers.anthropic ?? {}),
    openai: openai(cfg.providers.openai ?? {}),
    google: google(cfg.providers.google ?? {}),
    xai: xai(cfg.providers.xai ?? {}),
    groq: groq(cfg.providers.groq ?? {}),
    ollama: ollama(cfg.providers.ollama ?? {}),
    vllm: vllm(cfg.providers.vllm ?? {}),
  };
}
