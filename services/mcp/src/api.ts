const BASE = process.env.FORGE_API_URL ?? "http://localhost:4000";

export class ForgeClient {
  constructor(private apiKey: string) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  listProjects = () => this.req<unknown[]>("/v1/projects");
  createProject = (body: unknown) =>
    this.req("/v1/projects", { method: "POST", body: JSON.stringify(body) });

  listTasks = (projectId: string) =>
    this.req<unknown[]>(`/v1/projects/${projectId}/tasks`);
  getTask = (id: string) => this.req(`/v1/tasks/${id}`);
  createTask = (body: unknown) =>
    this.req("/v1/tasks", { method: "POST", body: JSON.stringify(body) });
  updateTask = (id: string, body: unknown) =>
    this.req(`/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });

  listAgents = (projectId: string) =>
    this.req<unknown[]>(`/v1/projects/${projectId}/agents`);
  getAgent = (id: string) => this.req(`/v1/agents/${id}`);
  createAgent = (body: unknown) =>
    this.req("/v1/agents", { method: "POST", body: JSON.stringify(body) });
  updateAgent = (id: string, body: unknown) =>
    this.req(`/v1/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  deleteAgent = (id: string) =>
    this.req(`/v1/agents/${id}`, { method: "DELETE" });

  createSwarm = (body: unknown) =>
    this.req("/v1/swarms", { method: "POST", body: JSON.stringify(body) });
  getSwarm = (id: string) => this.req(`/v1/swarms/${id}`);
  sendMessage = (id: string, body: unknown) =>
    this.req(`/v1/swarms/${id}/messages`, { method: "POST", body: JSON.stringify(body) });

  getRunTrace = (id: string) => this.req(`/v1/runs/${id}`);
}
