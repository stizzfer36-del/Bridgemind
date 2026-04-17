import type { Provider } from "./providers.js";

export async function exec(
  providers: Record<string, Provider>,
  taskId: string
): Promise<void> {
  const provider = providers.anthropic ?? Object.values(providers)[0];
  if (!provider) throw new Error("no providers configured");
  console.log(`forge exec ${taskId} (provider=${provider.id})`);
}
