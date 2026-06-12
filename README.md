# @kkskcs/pi-lego

Reusable modules for [pi](https://github.com/earendil-works/pi-coding-agent), packaged as independent npm extensions.

Frequently used patterns and utilities during pi sessions are extracted here so they can be shared, versioned, and
installed independently.

## Packages

| Package                                     | Description                                               |
|---------------------------------------------|-----------------------------------------------------------|
| [@kkskcs/pi-open-in](./packages/pi-open-in) | Open current directory in finder, terminal, or split pane |

## Debugging with Source

If you want to link a package locally for development/debugging:

```bash
# 1. Clone and build
git clone https://github.com/kkskcs/pi-lego.git
cd pi-lego
pnpm install
pnpm run build

# 2. Link the package you want to debug
cd packages/pi-open-in
pnpm link --global

# 3. In your pi project, link the package
pnpm link --global @kkskcs/pi-open-in
```

Changes in the source will be reflected after `pnpm run build`.

