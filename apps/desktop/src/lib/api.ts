import { getApiKey } from "./auth";

const API_URL =
  (import.meta.env.VITE_FORGE_API_URL as string | undefined) ??
  "https://api.forge.sh";

export type TaskStatus =
  | "todo"
  | "in-progress"
  | "in-review"
  | "complete"
  | "cancelled";

export type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Task = {
  id: string;
  projectId: string;
  status: TaskStatus;
  instructions: string;
  taskKnowledge?: string;
  role?: string;
  runId?: string;
  assignedAgentId?: string;
};

export type Agent = {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;
  cliBinary?: string;
  cliArgs?: string[];
};

export type Role = { id: string; name: string; agentId: string; paneId?: string };

export type Message = {
  id: string;
  swarmId: string;
  fromAgentId: string;
  toAgentId?: string;
  body: string;
  sig: string;
  ts: number;
};

export type Swarm = {
  id: string;
  projectId: string;
  goal: string;
  status: "running" | "done" | "failed";
  roles: Role[];
  mailboxId: string;
  mailbox?: Message[];
};

export type RunTraceEvent =
  | { type: "osc133"; kind: string; exitCode?: number; ts: number }
  | { type: "llm"; provider: string; model: string; promptTokens: number; completionTokens: number; ts: number }
  | { type: "pty"; paneId: string; bytes: string; ts: number };

export type RunTrace = { id: string; taskId: string; events: RunTraceEvent[] };

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = await getApiKey();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Projects
export const listProjects = () => req<Project[]>("/v1/projects");
export const createProject = (body: { name: string; description?: string }) =>
  req<Project>("/v1/projects", { method: "POST", body: JSON.stringify(body) });

// Tasks
export const listTasks = (projectId: string) =>
  req<Task[]>(`/v1/projects/${projectId}/tasks`);
export const getTask = (id: string) => req<Task>(`/v1/tasks/${id}`);
export const createTask = (body: {
  projectId: string;
  instructions: string;
  taskKnowledge?: string;
  status?: TaskStatus;
  role?: string;
}) => req<Task>("/v1/tasks", { method: "POST", body: JSON.stringify(body) });
export const updateTask = (id: string, body: Partial<Task>) =>
  req<Task>(`/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });

// Agents
export const listAgents = (projectId: string) =>
  req<Agent[]>(`/v1/projects/${projectId}/agents`);
export const getAgent = (id: string) => req<Agent>(`/v1/agents/${id}`);
export const createAgent = (body: {
  projectId: string;
  name: string;
  systemPrompt: string;
  model: string;
  cliBinary: string;
  cliArgs?: string[];
}) => req<Agent>("/v1/agents", { method: "POST", body: JSON.stringify(body) });
export const updateAgent = (id: string, body: Partial<Agent>) =>
  req<Agent>(`/v1/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteAgent = (id: string) =>
  req<void>(`/v1/agents/${id}`, { method: "DELETE" });

// Swarms
export const createSwarm = (body: {
  projectId: string;
  goal: string;
  roles: Omit<Role, "paneId">[];
}) => req<Swarm>("/v1/swarms", { method: "POST", body: JSON.stringify(body) });
export const getSwarm = (id: string) => req<Swarm>(`/v1/swarms/${id}`);
export const postSwarmMessage = (
  id: string,
  body: { from: string; to?: string; body: string }
) =>
  req<Message>(`/v1/swarms/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// Runs
export const getRunTrace = (id: string) => req<RunTrace>(`/v1/runs/${id}`);
