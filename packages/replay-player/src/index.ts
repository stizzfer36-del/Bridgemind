/**
 * Replay a Forge run trace (JSONL) in a headless xterm, preserving timing
 * so that byte-for-byte output matches the original session.
 */

export type TraceEvent =
  | { type: "osc133"; kind: string; exitCode?: number; ts: number }
  | { type: "llm"; provider: string; model: string; ts: number }
  | { type: "pty"; paneId: string; bytes: string; ts: number };

export type ReplayOptions = {
  /** Multiplier on inter-event gaps. 1 = real time, 0 = instant. */
  speed?: number;
  /** Called with each raw byte chunk written to the terminal. */
  onWrite?: (paneId: string, bytes: Uint8Array) => void;
};

export async function replay(trace: TraceEvent[], opts: ReplayOptions = {}): Promise<void> {
  const speed = opts.speed ?? 1;
  let prevTs = trace.find((e) => "ts" in e)?.ts ?? 0;
  for (const ev of trace) {
    if (speed > 0 && ev.ts > prevTs) {
      const gap = (ev.ts - prevTs) / speed;
      if (gap > 0) await new Promise((r) => setTimeout(r, gap));
    }
    prevTs = ev.ts;
    if (ev.type === "pty") {
      const bytes = Uint8Array.from(Buffer.from(ev.bytes, "base64"));
      opts.onWrite?.(ev.paneId, bytes);
    }
  }
}

export function parseJsonl(source: string): TraceEvent[] {
  return source
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TraceEvent);
}
