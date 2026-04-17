import { z } from "zod";

/**
 * Reverse MCP (U4). These tools are implemented by the Forge desktop client,
 * NOT by the backend. The MCP server brokers them: when a remote agent
 * invokes `open_file`, the server forwards the request to the desktop client
 * over a per-session WebSocket (ui_bridge). The desktop client executes the
 * action against the running UI and returns the result.
 *
 * This file ships the schemas so the MCP server can advertise the tool
 * surface; the runtime forwarding is in ./server.ts.
 */
export const uiTools = {
  open_file: {
    description: "Open a file in the Forge ADE and focus its editor pane.",
    input: z.object({ path: z.string().min(1) }),
  },
  save_file: {
    description: "Save content to a path from the ADE.",
    input: z.object({
      path: z.string().min(1),
      content: z.string(),
    }),
  },
  split_pane: {
    description: "Split the focused pane in the given direction.",
    input: z.object({ direction: z.enum(["horizontal", "vertical"]) }),
  },
  focus_pane: {
    description: "Focus a pane by id.",
    input: z.object({ paneId: z.string().min(1) }),
  },
  run_command: {
    description: "Type a command into the focused terminal pane and execute it.",
    input: z.object({ paneId: z.string().min(1), command: z.string().min(1) }),
  },
  move_card: {
    description: "Move a Kanban card to a new column.",
    input: z.object({
      taskId: z.string().min(1),
      column: z.enum(["todo", "in-progress", "in-review", "complete", "cancelled"]),
    }),
  },
  set_layout: {
    description: "Change the active tab's grid template.",
    input: z.object({
      template: z.enum([
        "single",
        "split",
        "stack",
        "quad",
        "six",
        "eight",
        "ten",
        "twelve",
        "fourteen",
        "sixteen",
      ]),
    }),
  },
  set_theme: {
    description: "Switch the desktop theme by name.",
    input: z.object({ name: z.string().min(1) }),
  },
  toast: {
    description: "Show a transient notification in the desktop UI.",
    input: z.object({
      kind: z.enum(["info", "success", "warn", "error"]),
      message: z.string().max(500),
    }),
  },
} as const;

export type UiToolName = keyof typeof uiTools;
