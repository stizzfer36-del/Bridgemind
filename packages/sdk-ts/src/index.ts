import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const TaskStatusSchema = z.enum([
  "todo",
  "in-progress",
  "in-review",
  "complete",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  instructions: z.string(),
  taskKnowledge: z.string().optional(),
  status: TaskStatusSchema,
  role: z.string().optional(),
  runId: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskCreateSchema = z.object({
  projectId: z.string().min(1),
  instructions: z.string().min(1).max(5000),
  taskKnowledge: z.string().max(50000).optional(),
  status: TaskStatusSchema.optional(),
  role: z.string().optional(),
});
export type TaskCreate = z.infer<typeof TaskCreateSchema>;

export const TaskPatchSchema = z.object({
  instructions: z.string().max(5000).optional(),
  taskKnowledge: z.string().max(50000).optional(),
  status: TaskStatusSchema.optional(),
});
export type TaskPatch = z.infer<typeof TaskPatchSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  name: z.string(),
  systemPrompt: z.string(),
  model: z.string(),
  cliBinary: z.string(),
  cliArgs: z.array(z.string()).optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const AgentCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  systemPrompt: z.string().max(100000),
  model: z.string().min(1),
  cliBinary: z.string().min(1),
  cliArgs: z.array(z.string()).optional(),
});
export type AgentCreate = z.infer<typeof AgentCreateSchema>;

export const AgentPatchSchema = z.object({
  name: z.string().max(255).optional(),
  systemPrompt: z.string().max(100000).optional(),
  model: z.string().optional(),
  cliBinary: z.string().optional(),
  cliArgs: z.array(z.string()).optional(),
});
export type AgentPatch = z.infer<typeof AgentPatchSchema>;

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  agentId: z.string(),
  paneId: z.string().optional(),
});
export type Role = z.infer<typeof RoleSchema>;

export const SwarmSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  goal: z.string(),
  status: z.enum(["running", "done", "failed"]),
  roles: z.array(RoleSchema),
  mailboxId: z.string(),
  mailbox: z.array(z.lazy(() => MessageSchema)).optional(),
});
export type Swarm = z.infer<typeof SwarmSchema>;

export const SwarmCreateSchema = z.object({
  projectId: z.string().min(1),
  goal: z.string().min(1).max(5000),
  roles: z.array(RoleSchema),
});
export type SwarmCreate = z.infer<typeof SwarmCreateSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  swarmId: z.string(),
  fromAgentId: z.string(),
  toAgentId: z.string().optional(),
  body: z.string(),
  sig: z.string(),
  ts: z.number(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessageCreateSchema = z.object({
  from: z.string().min(1),
  to: z.string().optional(),
  body: z.string().max(10000),
});
export type MessageCreate = z.infer<typeof MessageCreateSchema>;

export const RunTraceEventSchema = z.union([
  z.object({
    type: z.literal("osc133"),
    kind: z.enum(["prompt_start", "prompt_end", "command_start", "command_finished"]),
    exitCode: z.number().optional(),
    ts: z.number(),
  }),
  z.object({
    type: z.literal("llm"),
    provider: z.string(),
    model: z.string(),
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    ts: z.number(),
  }),
  z.object({
    type: z.literal("pty"),
    paneId: z.string(),
    bytes: z.string(),
    ts: z.number(),
  }),
]);
export type RunTraceEvent = z.infer<typeof RunTraceEventSchema>;

export const RunTraceSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  events: z.array(RunTraceEventSchema),
});
export type RunTrace = z.infer<typeof RunTraceSchema>;

// ── Client ────────────────────────────────────────────────────────────────────

export interface ForgeClientOptions {
  baseUrl?: string;
  token?: string;
}

export class ForgeClient {
  private readonly base: string;
  private token: string | undefined;

  constructor(opts: ForgeClientOptions = {}) {
    this.base = opts.baseUrl ?? "https://api.forge.sh";
    this.token = opts.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  private async request<T>(
    schema: z.ZodType<T>,
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    if (res.status === 204) return undefined as T;
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  listProjects(): Promise<Project[]> {
    return this.request(z.array(ProjectSchema), "GET", "/v1/projects");
  }
  createProject(input: ProjectCreate): Promise<Project> {
    return this.request(ProjectSchema, "POST", "/v1/projects", input);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  listTasks(projectId: string): Promise<Task[]> {
    return this.request(z.array(TaskSchema), "GET", `/v1/projects/${projectId}/tasks`);
  }
  createTask(input: TaskCreate): Promise<Task> {
    return this.request(TaskSchema, "POST", "/v1/tasks", input);
  }
  getTask(id: string): Promise<Task> {
    return this.request(TaskSchema, "GET", `/v1/tasks/${id}`);
  }
  updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return this.request(TaskSchema, "PATCH", `/v1/tasks/${id}`, patch);
  }

  // ── Agents ────────────────────────────────────────────────────────────────
  listAgents(projectId: string): Promise<Agent[]> {
    return this.request(z.array(AgentSchema), "GET", `/v1/projects/${projectId}/agents`);
  }
  createAgent(input: AgentCreate): Promise<Agent> {
    return this.request(AgentSchema, "POST", "/v1/agents", input);
  }
  getAgent(id: string): Promise<Agent> {
    return this.request(AgentSchema, "GET", `/v1/agents/${id}`);
  }
  updateAgent(id: string, patch: AgentPatch): Promise<Agent> {
    return this.request(AgentSchema, "PATCH", `/v1/agents/${id}`, patch);
  }
  deleteAgent(id: string): Promise<void> {
    return this.request(z.undefined(), "DELETE", `/v1/agents/${id}`);
  }

  // ── Swarms ────────────────────────────────────────────────────────────────
  createSwarm(input: SwarmCreate): Promise<Swarm> {
    return this.request(SwarmSchema, "POST", "/v1/swarms", input);
  }
  getSwarm(id: string): Promise<Swarm> {
    return this.request(SwarmSchema, "GET", `/v1/swarms/${id}`);
  }
  sendMessage(swarmId: string, msg: MessageCreate): Promise<Message> {
    return this.request(MessageSchema, "POST", `/v1/swarms/${swarmId}/messages`, msg);
  }

  // ── Runs ──────────────────────────────────────────────────────────────────
  getRunTrace(id: string): Promise<RunTrace> {
    return this.request(RunTraceSchema, "GET", `/v1/runs/${id}`);
  }
  async getReplayScript(id: string): Promise<string> {
    const res = await fetch(`${this.base}/v1/runs/${id}/replay.sh`, {
      headers: this.headers({ "Content-Type": "text/plain" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
}
