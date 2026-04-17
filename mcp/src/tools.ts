import { z } from "zod";
import { BridgeMindClient } from "./api.js";

/**
 * The 11 MCP tools mirroring the BridgeMind REST surface. Each tool is
 * registered against the MCP server in server.ts with the schema exported
 * here; the handler is a thin wrapper around the REST client.
 */
export const toolDefs = {
  list_projects: {
    description: "List all projects owned by the current API key.",
    input: z.object({}),
    handler: (c: BridgeMindClient) => () => c.listProjects(),
  },
  create_project: {
    description: "Create a new project.",
    input: z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
    }),
    handler: (c: BridgeMindClient) => (args: unknown) => c.createProject(args),
  },
  list_tasks: {
    description: "List tasks for a project.",
    input: z.object({ projectId: z.string().min(1) }),
    handler: (c: BridgeMindClient) => (args: { projectId: string }) =>
      c.listTasks(args.projectId),
  },
  get_task: {
    description: "Get a single task by id.",
    input: z.object({ taskId: z.string().min(1) }),
    handler: (c: BridgeMindClient) => (args: { taskId: string }) =>
      c.getTask(args.taskId),
  },
  create_task: {
    description: "Create a new task.",
    input: z.object({
      projectId: z.string().min(1),
      instructions: z.string().min(1).max(5000),
      taskKnowledge: z.string().max(50000).optional(),
      status: z
        .enum(["todo", "in-progress", "in-review", "complete", "cancelled"])
        .optional(),
    }),
    handler: (c: BridgeMindClient) => (args: unknown) => c.createTask(args),
  },
  update_task: {
    description:
      "Update a task's status, instructions, or knowledge. Agents MUST call this with status=in-review when work is done.",
    input: z.object({
      taskId: z.string().min(1),
      instructions: z.string().max(5000).optional(),
      taskKnowledge: z.string().max(50000).optional(),
      status: z
        .enum(["todo", "in-progress", "in-review", "complete", "cancelled"])
        .optional(),
    }),
    handler:
      (c: BridgeMindClient) =>
      ({ taskId, ...rest }: { taskId: string } & Record<string, unknown>) =>
        c.updateTask(taskId, rest),
  },
  list_agents: {
    description: "List agents available for a project.",
    input: z.object({ projectId: z.string().min(1) }),
    handler: (c: BridgeMindClient) => (args: { projectId: string }) =>
      c.listAgents(args.projectId),
  },
  get_agent: {
    description: "Get a single agent by id.",
    input: z.object({ agentId: z.string().min(1) }),
    handler: (c: BridgeMindClient) => (args: { agentId: string }) =>
      c.getAgent(args.agentId),
  },
  create_agent: {
    description: "Create a new custom agent profile.",
    input: z.object({
      projectId: z.string().min(1),
      name: z.string().min(1).max(255),
      systemPrompt: z.string().max(100000),
    }),
    handler: (c: BridgeMindClient) => (args: unknown) => c.createAgent(args),
  },
  update_agent: {
    description: "Update an existing agent.",
    input: z.object({
      agentId: z.string().min(1),
      name: z.string().max(255).optional(),
      systemPrompt: z.string().max(100000).optional(),
    }),
    handler:
      (c: BridgeMindClient) =>
      ({ agentId, ...rest }: { agentId: string } & Record<string, unknown>) =>
        c.updateAgent(agentId, rest),
  },
  delete_agent: {
    description: "Delete an agent.",
    input: z.object({ agentId: z.string().min(1) }),
    handler: (c: BridgeMindClient) => (args: { agentId: string }) =>
      c.deleteAgent(args.agentId),
  },
} as const;

export type ToolName = keyof typeof toolDefs;
