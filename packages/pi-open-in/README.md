# @kkskcs/pi-open-in

A [pi](https://github.com/earendil-works/pi-coding-agent) extension that opens the current working directory in another
app — finder, a new terminal window, or a split pane.

## Features

- **Split pane** — split the current terminal in a given direction
- **New terminal** — open a new terminal window at cwd
- **Finder / File manager** — reveal cwd in the system file manager
- **Fuzzy filter** — type to narrow down actions
- Unsupported actions are hidden from the list (no dead options)

## Install

```bash
pi install npm:@kkskcs/pi-open-in
```

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

## Usage

Register the extension in your pi config:

```json
{
  "pi": {
    "extensions": [
      "@kkskcs/pi-open-in"
    ]
  }
}
```

Then run:

```
/open-in
```

### Example: macOS + Ghostty

```
/open-in

┌──────────────────────────────────────────────────────────┐
│ > type to filter...                                      │
│                                                          │
│ ❯ split-down                                             │
│   split-right                                            │
│   split-up                                               │
│   split-left                                             │
│   terminal                                               │
│   finder                                                 │
│                                                          │
│ ↑↓ navigate • enter select • esc cancel • type to filter │
└──────────────────────────────────────────────────────────┘
```

Select `split-right` → opens a new Ghostty split pane to the right with cwd.

### Example: Linux + tmux

```
/open-in

┌──────────────────────────────────────────────────────────┐
│ > type to filter...                                      │
│                                                          │
│ ❯ split-down                                             │
│   split-right                                            │
│   split-up                                               │
│   split-left                                             │
│   terminal                                               │
│   finder                                                 │
│                                                          │
│ ↑↓ navigate • enter select • esc cancel • type to filter │
└──────────────────────────────────────────────────────────┘
```

Select `terminal` → opens a new tmux window at cwd.  
Select `finder` → runs `xdg-open` on cwd.

### Example: Windows + Windows Terminal

```
/open-in

┌──────────────────────────────────────────────────────────┐
│ > type to filter...                                      │
│                                                          │
│ ❯ split-down                                             │
│   split-right                                            │    
│   terminal                                               │
│   finder                                                 │
│                                                          │
│ ↑↓ navigate • enter select • esc cancel • type to filter │
└──────────────────────────────────────────────────────────┘
```

Only `down` and `right` splits available (Windows Terminal limitation).  
`finder` → opens Explorer.

## Development

```bash
cd packages/pi-open-in
pnpm install
pnpm run build
```
