import { z } from "zod";
import { ForgeClient } from "./api.js";

/**
 * Data-plane tools — mirror the REST surface 1:1. Paired with U4 UI-action
 * tools in ./ui_tools.ts.
 */
export const dataTools = {
  list_projects: {
    description: "List all projects owned by the current credential.",
    input: z.object({}),
    run: (c: ForgeClient) => () => c.listProjects(),
  },
  create_project: {
    description: "Create a new project.",
    input: z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
    }),
    run: (c: ForgeClient) => (a: unknown) => c.createProject(a),
  },
  list_tasks: {
    description: "List tasks for a project.",
    input: z.object({ projectId: z.string().min(1) }),
    run: (c: ForgeClient) => (a: { projectId: string }) => c.listTasks(a.projectId),
  },
  get_task: {
    description: "Get a task by id.",
    input: z.object({ taskId: z.string().min(1) }),
    run: (c: ForgeClient) => (a: { taskId: string }) => c.getTask(a.taskId),
  },
  create_task: {
    description: "Create a task.",
    input: z.object({
      projectId: z.string().min(1),
      instructions: z.string().min(1).max(5000),
      taskKnowledge: z.string().max(50000).optional(),
      status: z.enum(["todo", "in-progress", "in-review", "complete", "cancelled"]).optional(),
      role: z.string().max(64).optional(),
    }),
    run: (c: ForgeClient) => (a: unknown) => c.createTask(a),
  },
  update_task: {
    description:
      "Update a task. Agents MUST call with status=in-review when work is done, or status=todo + updated instructions if blocked.",
    input: z.object({
      taskId: z.string().min(1),
      instructions: z.string().max(5000).optional(),
      taskKnowledge: z.string().max(50000).optional(),
      status: z.enum(["todo", "in-progress", "in-review", "complete", "cancelled"]).optional(),
    }),
    run:
      (c: ForgeClient) =>
      ({ taskId, ...rest }: { taskId: string } & Record<string, unknown>) =>
        c.updateTask(taskId, rest),
  },
  list_agents: {
    description: "List agents for a project.",
    input: z.object({ projectId: z.string().min(1) }),
    run: (c: ForgeClient) => (a: { projectId: string }) => c.listAgents(a.projectId),
  },
  get_agent: {
    description: "Get an agent by id.",
    input: z.object({ agentId: z.string().min(1) }),
    run: (c: ForgeClient) => (a: { agentId: string }) => c.getAgent(a.agentId),
  },
  create_agent: {
    description: "Create a custom agent profile.",
    input: z.object({
      projectId: z.string().min(1),
      name: z.string().min(1).max(255),
      systemPrompt: z.string().max(100000),
      model: z.string(),
      cliBinary: z.string(),
      cliArgs: z.array(z.string()).optional(),
    }),
    run: (c: ForgeClient) => (a: unknown) => c.createAgent(a),
  },
  update_agent: {
    description: "Update an agent.",
    input: z.object({
      agentId: z.string().min(1),
      name: z.string().max(255).optional(),
      systemPrompt: z.string().max(100000).optional(),
      model: z.string().optional(),
      cliBinary: z.string().optional(),
      cliArgs: z.array(z.string()).optional(),
    }),
    run:
      (c: ForgeClient) =>
      ({ agentId, ...rest }: { agentId: string } & Record<string, unknown>) =>
        c.updateAgent(agentId, rest),
  },
  delete_agent: {
    description: "Delete an agent.",
    input: z.object({ agentId: z.string().min(1) }),
    run: (c: ForgeClient) => (a: { agentId: string }) => c.deleteAgent(a.agentId),
  },
  create_swarm: {
    description: "Start a multi-agent swarm with roles. Each role spawns in its own pane.",
    input: z.object({
      projectId: z.string().min(1),
      goal: z.string().min(1).max(5000),
      roles: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            agentId: z.string(),
          })
        )
        .min(1)
        .max(16),
    }),
    run: (c: ForgeClient) => (a: unknown) => c.createSwarm(a),
  },
  read_mailbox: {
    description: "Read the swarm mailbox. Every message is HMAC-signed.",
    input: z.object({ swarmId: z.string().min(1), since: z.number().optional() }),
    run: (c: ForgeClient) => (a: { swarmId: string }) => c.getSwarm(a.swarmId),
  },
  send_message: {
    description: "Send a message in the swarm mailbox.",
    input: z.object({
      swarmId: z.string().min(1),
      from: z.string().min(1),
      to: z.string().optional(),
      body: z.string().max(10000),
    }),
    run:
      (c: ForgeClient) =>
      ({ swarmId, ...rest }: { swarmId: string } & Record<string, unknown>) =>
        c.sendMessage(swarmId, rest),
  },
  get_run_trace: {
    description: "Fetch the deterministic replay trace for a run (U5).",
    input: z.object({ runId: z.string().min(1) }),
    run: (c: ForgeClient) => (a: { runId: string }) => c.getRunTrace(a.runId),
  },
} as const;

export type DataToolName = keyof typeof dataTools;
