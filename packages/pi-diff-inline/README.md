# @kkskcs/pi-diff-inline

Render diffs inline in the pi conversation stream. Supports unified diff text input and text-to-text comparison with inline token highlighting.

## Features

- Inline diff rendering in the conversation stream (no full-screen TUI)
- Split (side-by-side) and unified view modes
- Inline token highlighting — only changed tokens are highlighted
- Background color tinting for added/removed lines
- Collapsed/expanded state (Ctrl+O toggle)
- 10MB input size limit

## Installation

```sh
pi install @kkskcs/pi-diff-inline
```

## Usage

### Tool: `diff_inline`

Called by the LLM to render diffs inline.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `diffText` | string | Unified diff text (git diff, diff -u, etc.) |
| `oldText` | string | Original text for comparison |
| `newText` | string | New text for comparison |
| `label` | string | Header label shown above the diff |
| `contextLines` | number | Context lines for text-to-text mode (default: 3) |

Provide either `diffText` or `oldText`/`newText`, not both.

### Command: `/diff-inline`

```
/diff-inline <free-form text describing what to compare>
```

The input is sent to the LLM, which interprets the request and calls `diff_inline` with appropriate parameters.

## Development

```sh
pnpm install
pnpm run test
pnpm run build
```
