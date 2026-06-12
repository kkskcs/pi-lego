import { run, winEscape } from "../exec.js";
import type { Direction, PlatformProvider } from "../types.js";

function detectTerminal(): string {
  if (process.env.TMUX) return "tmux";
  if (process.env.WT_SESSION) return "wt";
  if (process.env.TERM_PROGRAM === "WezTerm") return "WezTerm";
  if (process.env.TERM_PROGRAM === "alacritty") return "alacritty";
  return "unknown";
}

const SPLIT_TERMINALS = ["wt", "WezTerm"];

export const win32Provider: PlatformProvider = {

  canSplit() {
    return SPLIT_TERMINALS.includes(detectTerminal());
  },

  openFinder(cwd) {
    return run(`explorer ${winEscape(cwd)}`);
  },

  openTerminal(cwd) {
    const term = detectTerminal();
    const esc = winEscape(cwd);

    switch (term) {
      case "wt":
        return run(`wt -w 0 -d ${esc}`);

      case "WezTerm":
        return run(`wezterm cli spawn --cwd ${esc}`);

      case "alacritty":
        return run(`alacritty --working-directory ${esc}`);

      default:
        return run(`explorer ${esc}`);
    }
  },

  split(direction: Direction, cwd) {
    const term = detectTerminal();
    const esc = winEscape(cwd);

    switch (term) {
      case "wt": {
        const orient = direction === "down" || direction === "up" ? "-H" : "-V";
        return run(`wt -w 0 sp ${orient} -d ${esc}`);
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
