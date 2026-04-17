#!/usr/bin/env node
import { loadProviders } from "./providers.js";
import { plan } from "./plan.js";
import { exec } from "./exec.js";
import { diff } from "./diff.js";

async function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const providers = await loadProviders();

  switch (sub) {
    case "plan": {
      const goal = rest.join(" ");
      await plan(providers, goal);
      break;
    }
    case "exec": {
      const [taskId] = rest;
      if (!taskId) die("usage: forge exec <taskId>");
      await exec(providers, taskId);
      break;
    }
    case "review": {
      const [runId] = rest;
      if (!runId) die("usage: forge review <runId>");
      await diff(providers, runId);
      break;
    }
    case "workspace":
      // workspace new --template quad → open desktop ADE
      if (rest[0] === "new") {
        const tpl = (rest.indexOf("--template") >= 0 ? rest[rest.indexOf("--template") + 1] : "single") ?? "single";
        console.log(`launching Forge ADE with template=${tpl}`);
        // In a packaged build, spawn the installed `forge-desktop` binary.
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

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function printHelp() {
  console.log(
    [
      "forge — open-core coding CLI",
      "",
      "Commands:",
      "  forge plan <goal>            Decompose a goal into tasks",
      "  forge exec <taskId>          Run a task against the best provider",
      "  forge review <runId>         Review a completed run",
      "  forge workspace new          Launch the Forge ADE",
      "  forge bench                  Run the benchmark harness",
      "  forge run replay <runId>     Replay a saved run trace",
      "",
      "Providers: Anthropic, OpenAI, Google, xAI, Groq, Ollama, vLLM.",
      "Configure via ~/.forge/providers.yaml — BYO keys, no lock-in.",
    ].join("\n")
  );
}

void main();
