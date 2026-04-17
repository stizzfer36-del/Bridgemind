import { getApiKey } from "./auth";

const API_URL =
  (import.meta.env.VITE_BRIDGEMIND_API_URL as string | undefined) ??
  "https://api.bridgemind.ai";

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
};

export type Task = {
  id: string;
  projectId: string;
  status: TaskStatus;
  instructions: string;
  taskKnowledge?: string;
  assignedAgentId?: string;
};

export type Agent = {
  id: string;
  name: string;
  systemPrompt: string;
  cliBinary?: string;
  cliArgs?: string[];
};

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
export const listProjects = () => req<Project[]>("/api/projects");
export const createProject = (body: { name: string; description?: string }) =>
  req<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) });

// Tasks
export const listTasks = (projectId: string) =>
  req<Task[]>(`/api/projects/${projectId}/tasks`);
export const getTask = (id: string) => req<Task>(`/api/tasks/${id}`);
export const createTask = (body: {
  projectId: string;
  instructions: string;
  taskKnowledge?: string;
  status?: TaskStatus;
}) => req<Task>("/api/tasks", { method: "POST", body: JSON.stringify(body) });
export const updateTask = (id: string, body: Partial<Task>) =>
  req<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });

// Agents
export const listAgents = (projectId: string) =>
  req<Agent[]>(`/api/projects/${projectId}/agents`);
export const getAgent = (id: string) => req<Agent>(`/api/agents/${id}`);
export const createAgent = (body: {
  projectId: string;
  name: string;
  systemPrompt: string;
}) => req<Agent>("/api/agents", { method: "POST", body: JSON.stringify(body) });
export const updateAgent = (id: string, body: Partial<Agent>) =>
  req<Agent>(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteAgent = (id: string) =>
  req<void>(`/api/agents/${id}`, { method: "DELETE" });
