import type { Agent, Task } from "./api";
import { ptyWrite, onBlockEvent } from "./ipc";

export type LaunchContext = {
  task: Task;
  agent: Agent;
  projectAbsolutePath: string;
};

/**
 * Build the agent launch template. Mirrors the docs step list:
 *   determine project folder → create terminal → construct command with
 *   knowledge context → wait for prompt → send command → monitor.
 */
export function buildLaunchCommand(ctx: LaunchContext): string {
  const { task, agent, projectAbsolutePath } = ctx;
  const binary = agent.cliBinary ?? "claude";
  const args = (agent.cliArgs ?? []).join(" ");
  const quotedPath = JSON.stringify(projectAbsolutePath);
  const instructions = task.instructions ?? "";
  const knowledge = task.taskKnowledge ?? "";

  return [
    `cd ${quotedPath} && ${binary} ${args}`.trim() + ` <<'PROMPT'`,
    `# Task: ${task.id}`,
    `## Instructions`,
    instructions,
    `## Knowledge`,
    knowledge,
    `## Contract`,
    `When done, call the BridgeMind MCP tool \`update_task\` with taskId=${task.id} and status="in-review". If blocked, status="todo" with updated instructions.`,
    `PROMPT`,
    ``,
  ].join("\n");
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
