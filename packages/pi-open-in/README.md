# @kkskcs/pi-open-in

Open finder, terminal, or a split pane at your current session's project directory — instantly from pi.

Runs as a command (`/open-in`), so there's no AI response to wait for. No terminal-specific shortcuts to memorize — just pick an action, done. Works with Ghostty, WezTerm, iTerm2, kitty, tmux, and more — one unified interface regardless of which terminal you're in.

## Screenshot

![open-in](https://raw.githubusercontent.com/kkskcs/pi-lego/develop/packages/pi-open-in/assets/open-in.png)

## Features

- **Split pane** — split the current terminal in a given direction
- **New terminal** — open a new terminal window at cwd
- **Finder / File manager** — reveal cwd in the system file manager
- **Fuzzy filter** — type to narrow down actions
- Unsupported actions are hidden from the list (no dead options)

## Installation

```bash
pi install npm:@kkskcs/pi-open-in
```

## Usage

```
/open-in
```

Select an action from the list to open cwd in the chosen app.

## Supported Terminals

### macOS

| Terminal       | Detection                      | Split                      | Directions               | New Window                        |
|----------------|--------------------------------|----------------------------|--------------------------|-----------------------------------|
| Ghostty        | `$TERM_PROGRAM=ghostty`        | ✓ AppleScript              | up / down / left / right | ✓ AppleScript                     |
| WezTerm        | `$TERM_PROGRAM=WezTerm`        | ✓ `wezterm cli split-pane` | up / down / left / right | ✓ `wezterm cli spawn`             |
| tmux           | `$TMUX`                        | ✓ `tmux split-window`      | up / down / left / right | ✓ `tmux new-window`               |
| iTerm2         | `$TERM_PROGRAM=iTerm.app`      | ✓ AppleScript              | down / right             | ✓ `open -a iTerm`                 |
| kitty          | `$TERM_PROGRAM=kitty`          | ✓ `kitty @`                | down / right             | ✓ `kitty --directory`             |
| Alacritty      | `$TERM_PROGRAM=alacritty`      | —                          | —                        | ✓ `alacritty --working-directory` |
| Apple Terminal | `$TERM_PROGRAM=Apple_Terminal` | —                          | —                        | ✓ `open -a Terminal`              |
| Warp           | `$TERM_PROGRAM=WarpTerminal`   | —                          | —                        | ✓ `open -a Warp`                  |

Finder: `open <cwd>`

### Linux

| Terminal  | Detection               | Split                      | Directions               | New Window                        |
|-----------|-------------------------|----------------------------|--------------------------|-----------------------------------|
| WezTerm   | `$TERM_PROGRAM=WezTerm` | ✓ `wezterm cli split-pane` | up / down / left / right | ✓ `wezterm cli spawn`             |
| tmux      | `$TMUX`                 | ✓ `tmux split-window`      | up / down / left / right | ✓ `tmux new-window`               |
| kitty     | `$TERM=xterm-kitty`     | ✓ `kitty @`                | down / right             | ✓ `kitty --directory`             |
| Ghostty   | `$TERM_PROGRAM=ghostty` | —                          | —                        | ✓ `ghostty --working-directory`   |
| Alacritty | `$TERM=alacritty`       | —                          | —                        | ✓ `alacritty --working-directory` |

File manager: `xdg-open <cwd>`

### Windows

| Terminal         | Detection                 | Split                      | Directions               | New Window                        |
|------------------|---------------------------|----------------------------|--------------------------|-----------------------------------|
| WezTerm          | `$TERM_PROGRAM=WezTerm`   | ✓ `wezterm cli split-pane` | up / down / left / right | ✓ `wezterm cli spawn`             |
| Windows Terminal | `$WT_SESSION`             | ✓ `wt sp`                  | down / right             | ✓ `wt -w 0 -d`                    |
| Alacritty        | `$TERM_PROGRAM=alacritty` | —                          | —                        | ✓ `alacritty --working-directory` |

Explorer: `explorer <cwd>`

### Detection Priority

1. `$TMUX` → tmux
2. `$WT_SESSION` → Windows Terminal
3. `$TERM_PROGRAM` → corresponding terminal
4. `$TERM` → fallback (kitty, alacritty)

## Development

```bash
cd packages/pi-open-in
pnpm install
pnpm run build
```
