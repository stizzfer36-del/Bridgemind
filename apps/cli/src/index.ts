#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { loadProviders, defaultProvider } from "./providers.js";
import { plan } from "./plan.js";
import { exec } from "./exec.js";
import { diff } from "./diff.js";

export const C = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const PROVIDERS_YAML = `# Forge providers configuration
# Uncomment and fill in your API keys

# anthropic:
#   apiKey: sk-ant-...
#   model: claude-opus-4-7

# openai:
#   apiKey: sk-...
#   model: gpt-4o

# google:
#   apiKey: AIza...
#   model: gemini-1.5-pro

# xai:
#   apiKey: xai-...
#   model: grok-2-latest

# ollama:
#   baseUrl: http://localhost:11434
#   model: llama3.2

# vllm:
#   baseUrl: http://localhost:8000
#   model: meta-llama/Llama-3.1-8B-Instruct
`;

function randomHex(n: number): string {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function cmdInit(): Promise<void> {
  const dir = join(process.cwd(), ".forge");
  await mkdir(dir, { recursive: true });
  const dest = join(dir, "providers.yaml");
  await writeFile(dest, PROVIDERS_YAML, { flag: "wx" }).catch(() => {
    console.log(`${C.yellow}already exists:${C.reset} ${dest}`);
    return;
  });
  console.log(`${C.green}Initialized${C.reset} .forge/providers.yaml`);
}

async function cmdLogin(): Promise<void> {
  const state = randomHex(16);
  const authBase = process.env.FORGE_AUTH_URL ?? "https://auth.forge.sh";
  const url =
    `${authBase}/oauth/authorize?client_id=forge-cli` +
    `&redirect_uri=http://localhost:9876/callback&state=${state}`;

  console.log(`${C.blue}Opening browser…${C.reset}`);
  console.log(url);
  const { exec: cpExec } = await import("node:child_process");
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  cpExec(`${opener} "${url}"`);

  const code = await new Promise<string>((resolve, reject) => {
    const srv = createServer((req, res) => {
      const u = new URL(req.url ?? "/", "http://localhost:9876");
      if (u.pathname !== "/callback") { res.end("not found"); return; }
      const gotState = u.searchParams.get("state");
      const gotCode = u.searchParams.get("code");
      if (gotState !== state) { res.end("state mismatch"); reject(new Error("state mismatch")); srv.close(); return; }
      if (!gotCode) { res.end("missing code"); reject(new Error("missing code")); srv.close(); return; }
      res.end("<html><body><h2>Logged in! You can close this tab.</h2></body></html>");
      srv.close();
      resolve(gotCode);
    });
    srv.listen(9876, "127.0.0.1");
    srv.on("error", reject);
  });

  const tokenDir = join(homedir(), ".forge");
  await mkdir(tokenDir, { recursive: true });
  await writeFile(join(tokenDir, "token"), JSON.stringify({ access_token: code }), "utf8");
  console.log(`${C.green}Logged in!${C.reset} Token saved to ~/.forge/token`);
}

async function cmdStatus(): Promise<void> {
  const tokenPath = join(homedir(), ".forge", "token");
  let token = "";
  try {
    const raw = await readFile(tokenPath, "utf8");
    token = (JSON.parse(raw) as { access_token: string }).access_token;
  } catch {
    console.error(`${C.red}Not logged in.${C.reset} Run: forge login`);
    process.exit(1);
  }
  const apiUrl = process.env.FORGE_API_URL ?? "https://api.forge.sh";
  const res = await fetch(`${apiUrl}/v1/projects`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`${C.red}API error${C.reset} ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const projects = (await res.json()) as { id: string; name: string; taskCount?: number }[];
  const top = projects.slice(0, 5);
  console.log(`${C.bold}Projects:${C.reset}`);
  for (const p of top) {
    console.log(`  ${C.blue}${p.name}${C.reset} (${p.id}) — ${p.taskCount ?? 0} tasks`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    const req = createRequire(import.meta.url);
    const pkg = req("../package.json") as { version: string };
    console.log(pkg.version);
    return;
  }

  const [sub, ...rest] = args;
  const providers = await loadProviders();

  switch (sub) {
    case "init":
      await cmdInit();
      break;
    case "login":
      await cmdLogin();
      break;
    case "status":
      await cmdStatus();
      break;
    case "plan": {
      const flags = parseFlags(rest);
      const goal = flags.positional.join(" ");
      await plan(providers, goal, flags);
      break;
    }
    case "exec": {
      const flags = parseFlags(rest);
      const taskId = flags.positional[0];
      if (!taskId) die("usage: forge exec <taskId>");
      await exec(providers, taskId, flags);
      break;
    }
    case "review": {
      const [runId] = rest;
      if (!runId) die("usage: forge review <runId>");
      await diff(providers, runId);
      break;
    }
    case "workspace":
      if (rest[0] === "new") {
        const tpl = (rest.indexOf("--template") >= 0 ? rest[rest.indexOf("--template") + 1] : "single") ?? "single";
        console.log(`launching Forge ADE with template=${tpl}`);
        process.exit(0);
      }
      die("usage: forge workspace new --template <name>");
      break;
    case "bench":
      console.log("forge bench: see apps/bench for the Python harness.");
      break;
    case "run":
      if (rest[0] === "replay") {
        const [, runId] = rest;
        console.log(`replaying ${runId} via @forge/replay-player`);
      }
      break;
    case undefined:
    case "--help":
    case "-h":
    case "help":
      printHelp();
      break;
    default:
      die(`unknown command: ${sub}`);
  }
}

function parseFlags(args: string[]): Record<string, string | boolean> & { positional: string[] } {
  const result: Record<string, string | boolean> & { positional: string[] } = { positional: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    } else {
      result.positional.push(a);
    }
  }
  return result;
}

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function printHelp() {
  console.log(
    [
      `${C.bold}forge${C.reset} — open-core coding CLI`,
      "",
      "Commands:",
      "  forge init                   Create .forge/providers.yaml scaffold",
      "  forge login                  OAuth login, save token to ~/.forge/token",
      "  forge status                 Show first 5 projects with task counts",
      "  forge plan <goal>            Decompose a goal into tasks",
      "  forge exec <taskId>          Run a task against the best provider",
      "  forge review <runId>         Review a completed run",
      "  forge workspace new          Launch the Forge ADE",
      "  forge bench                  Run the benchmark harness",
      "  forge run replay <runId>     Replay a saved run trace",
      "",
      "Flags:",
      "  --version                    Print version",
      "",
      "Providers: Anthropic, OpenAI, Google, xAI, Groq, Ollama, vLLM.",
      "Configure via ~/.forge/providers.yaml — BYO keys, no lock-in.",
    ].join("\n")
  );
}

void main();
