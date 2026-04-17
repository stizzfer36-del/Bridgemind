import type { Provider } from "./providers.js";

export async function diff(
  _providers: Record<string, Provider>,
  runId: string
): Promise<void> {
  console.log(`forge review ${runId}`);
}
