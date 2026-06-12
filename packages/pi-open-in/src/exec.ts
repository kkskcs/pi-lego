import { exec, type ChildProcess } from "child_process";

export function run(command: string, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = exec(command);

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("timeout"));
    }, timeoutMs);

    child.on("exit", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`exit code ${code}`));
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
