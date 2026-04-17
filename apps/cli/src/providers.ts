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
  envKey?: string;
  chat: (messages: { role: "system" | "user" | "assistant"; content: string }[], model: string) => Promise<string>;
  stream?: (prompt: string, model: string, opts?: Record<string, unknown>) => AsyncGenerator<string>;
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

// Maps provider id to the env var that holds its API key
const ENV_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
  groq: "GROQ_API_KEY",
  ollama: "",  // no key required
  vllm: "",    // no key required
};

export async function loadProviders(): Promise<Record<string, Provider>> {
  const configPath = join(homedir(), ".forge", "providers.yaml");
  let raw = "";
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    // no config — fall back to env-only providers
  }
  const cfg = raw ? ConfigSchema.parse(parseYaml(raw)) : { providers: {} };

  const all: Record<string, Provider> = {
    anthropic: anthropic(cfg.providers.anthropic ?? {}),
    openai: openai(cfg.providers.openai ?? {}),
    google: google(cfg.providers.google ?? {}),
    xai: xai(cfg.providers.xai ?? {}),
    groq: groq(cfg.providers.groq ?? {}),
    ollama: ollama(cfg.providers.ollama ?? {}),
    vllm: vllm(cfg.providers.vllm ?? {}),
  };

  // Only include providers where API key is set (or no key required)
  const result: Record<string, Provider> = {};
  for (const [id, provider] of Object.entries(all)) {
    const envKey = ENV_KEYS[id] ?? "";
    const cfgKey = cfg.providers[id]?.apiKey ?? "";
    if (!envKey || cfgKey || process.env[envKey]) {
      result[id] = { ...provider, envKey };
    }
  }
  return result;
}

export function defaultProvider(providers: Record<string, Provider>): string {
  // 1. Check ~/.forge/config.yaml for default: field
  // (we do this synchronously via a cached value; async version below)
  const envDefault = process.env.FORGE_DEFAULT_PROVIDER;
  if (envDefault && providers[envDefault]) return envDefault;

  // Prefer priority order
  const priority = ["anthropic", "openai", "google", "xai", "groq", "ollama", "vllm"];
  for (const id of priority) {
    if (providers[id]) return id;
  }
  return Object.keys(providers)[0] ?? "anthropic";
}

export async function defaultProviderAsync(providers: Record<string, Provider>): Promise<string> {
  // Check config.yaml
  try {
    const configPath = join(homedir(), ".forge", "config.yaml");
    const raw = await readFile(configPath, "utf8");
    const cfg = parseYaml(raw) as { default?: string };
    if (cfg.default && providers[cfg.default]) return cfg.default;
  } catch {
    // ignore
  }
  return defaultProvider(providers);
}

export async function healthCheck(provider: Provider): Promise<boolean> {
  try {
    const providerWithStream = provider as Provider & {
      stream?: (prompt: string, model: string) => AsyncGenerator<string>;
    };
    if (providerWithStream.stream) {
      // Minimal stream test
      const gen = providerWithStream.stream("ping", "claude-haiku-4-5");
      const first = await gen.next();
      await gen.return?.(undefined);
      return !first.done || typeof first.value === "string";
    }
    const result = await provider.chat([{ role: "user", content: "ping" }], "claude-haiku-4-5");
    return typeof result === "string" && result.length >= 0;
  } catch {
    return false;
  }
}
