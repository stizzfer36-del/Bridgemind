import { spawn } from "node:child_process";

/** Run a shell command, streaming output to stdout. */
export function runShell(cmd: string, cwd = process.cwd()): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd, shell: true, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? -1));
  });
}
