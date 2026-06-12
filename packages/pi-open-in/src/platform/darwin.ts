import { run } from "../exec.js";
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

const SPLIT_TERMINALS = ["tmux", "ghostty", "iTerm.app", "iTerm2", "kitty", "WezTerm"];

export const darwinProvider: PlatformProvider = {

  canSplit() {
    return SPLIT_TERMINALS.includes(detectTerminal());
  },

  openFinder(cwd) {
    return run(`open "${cwd}"`);
  },

  openTerminal(cwd) {
    const term = detectTerminal();

    switch (term) {
      case "tmux":
        return run(`tmux new-window -c "${cwd}"`);

      case "ghostty":
        return run(ghosttyNewWindowScript(cwd));

      case "iTerm.app":
      case "iTerm2":
        return run(`open -a iTerm "${cwd}"`);

      case "kitty":
        return run(`kitty --single-instance --directory="${cwd}"`);

      case "WezTerm":
        return run(`wezterm cli spawn --cwd "${cwd}"`);

      case "alacritty":
        return run(`alacritty --working-directory "${cwd}"`);

      default: {
        const app = TERM_APP_NAME[term] || "Terminal";
        return run(`open -a "${app}" "${cwd}"`);
      }
    }
  },

  split(direction: Direction, cwd) {
    const term = detectTerminal();

    switch (term) {
      case "tmux": {
        const flag = direction === "right" || direction === "left" ? "-h" : "-v";
        return run(`tmux split-window ${flag} -c "${cwd}"`);
      }

      case "ghostty":
        return run(ghosttySplitScript(direction, cwd));

      case "iTerm.app":
      case "iTerm2":
        return run(itermSplitScript(direction === "right" || direction === "left"));

      case "kitty": {
        const loc = direction === "right" || direction === "left" ? "hsplit" : "vsplit";
        return run(`kitty @ launch --location=${loc} --cwd="${cwd}"`);
      }

      case "WezTerm": {
        const flag = direction === "down" || direction === "up" ? "--bottom" : "--right";
        return run(`wezterm cli split-pane ${flag} --cwd "${cwd}"`);
      }

      default:
        return Promise.reject(new Error(`Unsupported terminal for split: ${term}`));
    }
  },
};

const TERM_APP_NAME: Record<string, string> = {
  ghostty: "Ghostty",
  "iTerm.app": "iTerm",
  kitty: "kitty",
  WezTerm: "WezTerm",
  Apple_Terminal: "Terminal",
  alacritty: "Alacritty",
  WarpTerminal: "Warp",
};
