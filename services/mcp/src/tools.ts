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
    run: (c: ForgeClient) => async (args: unknown) => {
      z.object({}).parse(args);
      try { return await c.listProjects(); }
      catch (e) { throw new Error(`list_projects: ${(e as Error).message}`); }
    },
  },
  create_project: {
    description: "Create a new project.",
    input: z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
    }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ name: z.string().min(1).max(255), description: z.string().max(2000).optional() }).parse(args);
      try { return await c.createProject(a); }
      catch (e) { throw new Error(`create_project: ${(e as Error).message}`); }
    },
  },
  list_tasks: {
    description: "List tasks for a project.",
    input: z.object({ projectId: z.string().min(1) }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ projectId: z.string().min(1) }).parse(args);
      try { return await c.listTasks(a.projectId); }
      catch (e) { throw new Error(`list_tasks: ${(e as Error).message}`); }
    },
  },
  get_task: {
    description: "Get a task by id.",
    input: z.object({ taskId: z.string().min(1) }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ taskId: z.string().min(1) }).parse(args);
      try { return await c.getTask(a.taskId); }
      catch (e) { throw new Error(`get_task: ${(e as Error).message}`); }
    },
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
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({
        projectId: z.string().min(1),
        instructions: z.string().min(1).max(5000),
        taskKnowledge: z.string().max(50000).optional(),
        status: z.enum(["todo", "in-progress", "in-review", "complete", "cancelled"]).optional(),
        role: z.string().max(64).optional(),
      }).parse(args);
      try { return await c.createTask(a); }
      catch (e) { throw new Error(`create_task: ${(e as Error).message}`); }
    },
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
    run: (c: ForgeClient) => async (args: unknown) => {
      const { taskId, ...rest } = z.object({
        taskId: z.string().min(1),
        instructions: z.string().max(5000).optional(),
        taskKnowledge: z.string().max(50000).optional(),
        status: z.enum(["todo", "in-progress", "in-review", "complete", "cancelled"]).optional(),
      }).parse(args);
      try { return await c.updateTask(taskId, rest); }
      catch (e) { throw new Error(`update_task: ${(e as Error).message}`); }
    },
  },
  list_agents: {
    description: "List agents for a project.",
    input: z.object({ projectId: z.string().min(1) }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ projectId: z.string().min(1) }).parse(args);
      try { return await c.listAgents(a.projectId); }
      catch (e) { throw new Error(`list_agents: ${(e as Error).message}`); }
    },
  },
  get_agent: {
    description: "Get an agent by id.",
    input: z.object({ agentId: z.string().min(1) }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ agentId: z.string().min(1) }).parse(args);
      try { return await c.getAgent(a.agentId); }
      catch (e) { throw new Error(`get_agent: ${(e as Error).message}`); }
    },
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
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({
        projectId: z.string().min(1),
        name: z.string().min(1).max(255),
        systemPrompt: z.string().max(100000),
        model: z.string(),
        cliBinary: z.string(),
        cliArgs: z.array(z.string()).optional(),
      }).parse(args);
      try { return await c.createAgent(a); }
      catch (e) { throw new Error(`create_agent: ${(e as Error).message}`); }
    },
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
    run: (c: ForgeClient) => async (args: unknown) => {
      const { agentId, ...rest } = z.object({
        agentId: z.string().min(1),
        name: z.string().max(255).optional(),
        systemPrompt: z.string().max(100000).optional(),
        model: z.string().optional(),
        cliBinary: z.string().optional(),
        cliArgs: z.array(z.string()).optional(),
      }).parse(args);
      try { return await c.updateAgent(agentId, rest); }
      catch (e) { throw new Error(`update_agent: ${(e as Error).message}`); }
    },
  },
  delete_agent: {
    description: "Delete an agent.",
    input: z.object({ agentId: z.string().min(1) }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ agentId: z.string().min(1) }).parse(args);
      try { return await c.deleteAgent(a.agentId); }
      catch (e) { throw new Error(`delete_agent: ${(e as Error).message}`); }
    },
  },
  create_swarm: {
    description: "Start a multi-agent swarm with roles. Each role spawns in its own pane.",
    input: z.object({
      projectId: z.string().min(1),
      goal: z.string().min(1).max(5000),
      roles: z.array(z.object({ id: z.string(), name: z.string(), agentId: z.string() })).min(1).max(16),
    }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({
        projectId: z.string().min(1),
        goal: z.string().min(1).max(5000),
        roles: z.array(z.object({ id: z.string(), name: z.string(), agentId: z.string() })).min(1).max(16),
      }).parse(args);
      try { return await c.createSwarm(a); }
      catch (e) { throw new Error(`create_swarm: ${(e as Error).message}`); }
    },
  },
  read_mailbox: {
    description: "Read the swarm mailbox. Every message is HMAC-signed.",
    input: z.object({ swarmId: z.string().min(1), since: z.number().optional() }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ swarmId: z.string().min(1), since: z.number().optional() }).parse(args);
      try { return await c.getSwarm(a.swarmId); }
      catch (e) { throw new Error(`read_mailbox: ${(e as Error).message}`); }
    },
  },
  send_message: {
    description: "Send a message in the swarm mailbox.",
    input: z.object({
      swarmId: z.string().min(1),
      from: z.string().min(1),
      to: z.string().optional(),
      body: z.string().max(10000),
    }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const { swarmId, ...rest } = z.object({
        swarmId: z.string().min(1),
        from: z.string().min(1),
        to: z.string().optional(),
        body: z.string().max(10000),
      }).parse(args);
      try { return await c.sendMessage(swarmId, rest); }
      catch (e) { throw new Error(`send_message: ${(e as Error).message}`); }
    },
  },
  get_run_trace: {
    description: "Fetch the deterministic replay trace for a run (U5).",
    input: z.object({ runId: z.string().min(1) }),
    run: (c: ForgeClient) => async (args: unknown) => {
      const a = z.object({ runId: z.string().min(1) }).parse(args);
      try { return await c.getRunTrace(a.runId); }
      catch (e) { throw new Error(`get_run_trace: ${(e as Error).message}`); }
    },
  },
  bench_leaderboard: {
    description: "Get benchmark leaderboard from the Forge API.",
    input: z.object({}),
    run: (c: ForgeClient) => async () => c.getBenchLeaderboard(),
  },
} as const;

export type DataToolName = keyof typeof dataTools;
