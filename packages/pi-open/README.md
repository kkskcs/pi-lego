# @kkskcs/pi-open

Open files with the default app, or open your current directory in finder, terminal, or a split pane — instantly from pi.

## Commands

### /open \<path\>

Opens a file or directory with the OS default application.

```
/open @src/index.ts
/open ./README.md
/open assets/
```

- Accepts direct paths or @-mention autocomplete
- Files open in the associated default app
- Directories open in the system file manager (Finder, Nautilus, Explorer)
- Shows an error if the path does not exist

### /open-cwd

Opens the current session directory in another app. Select an action from the fuzzy-filterable list.

```
/open-cwd
```

Actions:
- **Split pane** — split the current terminal in a given direction
- **New terminal** — open a new terminal window at cwd
- **Finder / File manager** — reveal cwd in the system file manager

Unsupported actions are hidden from the list.

## Supported Platforms

| Platform | `/open` command | `/open-cwd` terminals |
|----------|----------------|----------------------|
| macOS | `open` | Ghostty, WezTerm, tmux, iTerm2, kitty, Alacritty, Terminal, Warp |
| Linux | `xdg-open` | WezTerm, tmux, kitty, Ghostty, Alacritty |
| Windows | `start` | WezTerm, Windows Terminal, Alacritty |

## Installation

```bash
pi install npm:@kkskcs/pi-open
```

## Development

```bash
cd packages/pi-open
pnpm install
pnpm run build
```
