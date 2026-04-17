import { replay, parseJsonl, type TraceEvent } from "@forge/replay-player";
import { getRunTrace } from "./api";
import { ptyWrite } from "./ipc";

/**
 * Fetch a run trace from the backend and replay its PTY bytes into a live
 * pane. Timing is preserved up to `speed`. Returns the full trace for
 * inspection.
 */
export async function replayRun(
  runId: string,
  paneId: string,
  speed = 1
): Promise<TraceEvent[]> {
  const trace = await getRunTrace(runId);
  const events = trace.events as TraceEvent[];
  await replay(events, {
    speed,
    onWrite: (_pane, bytes) => {
      void ptyWrite(paneId, new TextDecoder().decode(bytes));
    },
  });
  return events;
}

export { parseJsonl };
