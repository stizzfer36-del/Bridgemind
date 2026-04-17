const BASE =
  process.env.BRIDGEMIND_API_URL ?? "http://localhost:4000";

export class BridgeMindClient {
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

  listProjects = () => this.req<unknown[]>("/api/projects");
  createProject = (body: unknown) =>
    this.req("/api/projects", { method: "POST", body: JSON.stringify(body) });

  listTasks = (projectId: string) =>
    this.req<unknown[]>(`/api/projects/${projectId}/tasks`);
  getTask = (id: string) => this.req(`/api/tasks/${id}`);
  createTask = (body: unknown) =>
    this.req("/api/tasks", { method: "POST", body: JSON.stringify(body) });
  updateTask = (id: string, body: unknown) =>
    this.req(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });

  listAgents = (projectId: string) =>
    this.req<unknown[]>(`/api/projects/${projectId}/agents`);
  getAgent = (id: string) => this.req(`/api/agents/${id}`);
  createAgent = (body: unknown) =>
    this.req("/api/agents", { method: "POST", body: JSON.stringify(body) });
  updateAgent = (id: string, body: unknown) =>
    this.req(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  deleteAgent = (id: string) =>
    this.req(`/api/agents/${id}`, { method: "DELETE" });
}
