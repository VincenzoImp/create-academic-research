import { spawn, type StdioOptions } from "node:child_process";

export interface RunnerOptions {
  cwd?: string;
  stdio?: StdioOptions;
}

export interface CommandResult {
  code: number;
}

export interface Runner {
  run(command: string[], options?: RunnerOptions): Promise<CommandResult>;
}

export const defaultRunner: Runner = {
  run(command: string[], options: RunnerOptions = {}) {
    const executable = command[0];
    if (!executable) throw new Error("cannot run an empty command");
    return new Promise((resolve, reject) => {
      const child = spawn(executable, command.slice(1), {
        cwd: options.cwd,
        stdio: options.stdio ?? "inherit",
        shell: false
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve({ code });
        else reject(new Error(`command failed (${code}): ${command.join(" ")}`));
      });
    });
  }
};
