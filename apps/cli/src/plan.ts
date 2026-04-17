import type { Provider } from "./providers.js";

export async function plan(
  providers: Record<string, Provider>,
  goal: string
): Promise<void> {
  const provider = providers.anthropic ?? Object.values(providers)[0];
  if (!provider) throw new Error("no providers configured");
  const system =
    "You are a planner. Decompose the user's goal into ≤8 atomic coding tasks. Output JSON array.";
  const content = await provider.chat(
    [
      { role: "system", content: system },
      { role: "user", content: goal },
    ],
    "claude-opus-4-7"
  );
  console.log(content);
}
