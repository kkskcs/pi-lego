import { run, shellEscape } from "../exec.js";
import type { Direction, PlatformProvider } from "../types.js";

function detectTerminal(): string {
  if (process.env.TMUX) return "tmux";
  if (process.env.TERM_PROGRAM) return process.env.TERM_PROGRAM;
  if (process.env.TERM === "xterm-kitty") return "kitty";
  if (process.env.TERM === "alacritty") return "alacritty";
  return "unknown";
}

const SPLIT_TERMINALS = ["tmux", "kitty", "WezTerm"];

export const linuxProvider: PlatformProvider = {

  canSplit() {
    return SPLIT_TERMINALS.includes(detectTerminal());
  },

  openFinder(cwd) {
    return run(`xdg-open ${shellEscape(cwd)}`);
  },

  openTerminal(cwd) {
    const term = detectTerminal();
    const esc = shellEscape(cwd);

    switch (term) {
      case "tmux":
        return run(`tmux new-window -c ${esc}`);

      case "ghostty":
        return run(`ghostty --working-directory=${esc}`);

      case "kitty":
        return run(`kitty --single-instance --directory=${esc}`);

      case "WezTerm":
        return run(`wezterm cli spawn --cwd ${esc}`);

      case "alacritty":
        return run(`alacritty --working-directory ${esc}`);

      default:
        return run(`xdg-open ${esc}`);
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
