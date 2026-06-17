import { run, shellEscape, winEscape } from "./exec.js";

function getCommand(target: string): string {
  switch (process.platform) {
    case "darwin":
      return `open ${shellEscape(target)}`;

    case "win32":
      return `start "" ${winEscape(target)}`;

    default:
      return `xdg-open ${shellEscape(target)}`;
  }
}

export function openDefault(target: string): Promise<void> {
  return run(getCommand(target));
}
