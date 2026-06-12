import { run, shellEscape } from "../exec.js";
import type { Direction, PlatformProvider } from "../types.js";

function detectTerminal(): string {
  if (process.env.TMUX) return "tmux";
  return process.env.TERM_PROGRAM || "unknown";
}

function ghosttySplitScript(direction: string, cwd: string): string {
  return `osascript -e 'tell application "Ghostty"
  set cfg to new surface configuration
  set initial working directory of cfg to "${cwd}"
  split (focused terminal of selected tab of front window) direction ${direction} with configuration cfg
end tell'`;
}

function ghosttyNewWindowScript(cwd: string): string {
  return `osascript -e 'tell application "Ghostty"
  set cfg to new surface configuration
  set initial working directory of cfg to "${cwd}"
  new window with configuration cfg
end tell'`;
}

function itermSplitScript(vertical: boolean): string {
  const cmd = vertical
    ? "tell current session of current tab of current window to split vertically with default profile"
    : "tell current session of current tab of current window to split horizontally with default profile";

  return `osascript -e 'tell application "iTerm2"
  ${cmd}
end tell'`;
}

const TERM_APP_NAME: Record<string, string> = {
  ghostty: "Ghostty",
  "iTerm.app": "iTerm",
  kitty: "kitty",
  WezTerm: "WezTerm",
  Apple_Terminal: "Terminal",
  alacritty: "Alacritty",
  WarpTerminal: "Warp",
};


export const darwinProvider: PlatformProvider = {

  supportedSplitDirections() {
    const term = detectTerminal();
    const allDirs: Direction[] = ["down", "right", "up", "left"];
    const basicDirs: Direction[] = ["down", "right"];

    switch (term) {
      case "tmux":
      case "ghostty":
      case "WezTerm":
        return allDirs;

      case "iTerm.app":
      case "iTerm2":
      case "kitty":
        return basicDirs;

      default:
        return [];
    }
  },

  openFinder(cwd) {
    return run(`open ${shellEscape(cwd)}`);
  },

  openTerminal(cwd) {
    const term = detectTerminal();
    const esc = shellEscape(cwd);

    switch (term) {
      case "tmux":
        return run(`tmux new-window -c ${esc}`);

      case "ghostty":
        return run(ghosttyNewWindowScript(cwd));

      case "iTerm.app":
      case "iTerm2":
        return run(`open -a iTerm ${esc}`);

      case "kitty":
        return run(`kitty --single-instance --directory=${esc}`);

      case "WezTerm":
        return run(`wezterm cli spawn --cwd ${esc}`);

      case "alacritty":
        return run(`alacritty --working-directory ${esc}`);

      default: {
        const app = TERM_APP_NAME[term] || "Terminal";
        return run(`open -a "${app}" ${esc}`);
      }
    }
  },

  split(direction: Direction, cwd) {
    const term = detectTerminal();
    const esc = shellEscape(cwd);

    switch (term) {
      case "tmux": {
        const flag = direction === "right" ? "-h"
                   : direction === "left" ? "-hb"
                   : direction === "up" ? "-vb"
                   : "-v";
        return run(`tmux split-window ${flag} -c ${esc}`);
      }

      case "ghostty":
        return run(ghosttySplitScript(direction, cwd));

      case "iTerm.app":
      case "iTerm2":
        return run(itermSplitScript(direction === "right" || direction === "left"));

      case "kitty": {
        const loc = direction === "right" || direction === "left" ? "hsplit" : "vsplit";
        return run(`kitty @ launch --location=${loc} --cwd=${esc}`);
      }

      case "WezTerm": {
        const flagMap = { down: "--bottom", up: "--top", right: "--right", left: "--left" } as const;
        const flag = flagMap[direction];
        return run(`wezterm cli split-pane ${flag} --cwd ${esc}`);
      }

      default:
        return Promise.reject(new Error(`Unsupported terminal for split: ${term}`));
    }
  },
};
