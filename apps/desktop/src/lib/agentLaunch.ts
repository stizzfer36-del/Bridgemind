import type { Agent, Task } from "./api";
import { ptyWrite, onBlockEvent } from "./ipc";

export type LaunchContext = {
  task: Task;
  agent: Agent;
  projectAbsolutePath: string;
};

/**
 * Escapes single quotes for safe use inside a shell heredoc or single-quoted string.
 * Replaces ' with '\''
 */
export function shellEscape(s: string): string {
  return s.replace(/'/g, "'\\''");
}

/**
 * Build the agent launch template based on cliBinary.
 */
export function buildLaunchCommand(ctx: LaunchContext): string {
  const { task, agent, projectAbsolutePath } = ctx;
  const binary = agent.cliBinary ?? "claude";
  const args = (agent.cliArgs ?? []).join(" ");
  const quotedPath = JSON.stringify(projectAbsolutePath);
  const instructions = task.instructions ?? "";
  const knowledge = task.taskKnowledge ?? "";

  if (binary === "claude") {
    return [
      `cd ${quotedPath} && ${binary} ${args}`.trim() + ` <<'PROMPT'`,
      `# Task: ${task.id}`,
      `## Instructions`,
      instructions,
      `## Knowledge`,
      knowledge,
      `## Contract`,
      `When done, call the Forge MCP tool \`update_task\` with taskId=${task.id} and status="in-review". If blocked, status="todo" with updated instructions.`,
      `PROMPT`,
      ``,
    ].join("\n");
  }

  if (binary === "cursor-agent") {
    const escapedInstructions = shellEscape(instructions);
    return `cd ${quotedPath} && cursor-agent run --task '${escapedInstructions}'\n`;
  }

  // Generic fallback
  const argsStr = args ? ` ${args}` : "";
  const escapedInstructions = shellEscape(instructions);
  return `cd ${quotedPath} && ${binary}${argsStr} '${escapedInstructions}'\n`;
}

/**
 * Wait for the next prompt_start event on a pane then send the launch template.
 * Times out after `timeoutMs` (default 15s) and sends anyway to avoid stalling.
 */
export async function launchAgentInPane(
  paneId: string,
  ctx: LaunchContext,
  timeoutMs = 15_000
): Promise<void> {
  const command = buildLaunchCommand(ctx);

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    void onBlockEvent(paneId, (e) => {
      if (e.kind === "prompt_start") {
        clearTimeout(timer);
        finish();
      }
    });
  });

  await ptyWrite(paneId, command);
}
