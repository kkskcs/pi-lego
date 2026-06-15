import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, SelectList, type SelectItem, Text } from "@earendil-works/pi-tui";

import type { Action, PlatformProvider } from "./types.js";
import { darwinProvider } from "./platform/darwin.js";
import { linuxProvider } from "./platform/linux.js";
import { win32Provider } from "./platform/win32.js";

function getPlatform(): PlatformProvider {
  switch (process.platform) {
    case "darwin":
      return darwinProvider;

    case "win32":
      return win32Provider;

    default:
      return linuxProvider;
  }
}

function buildActions(platform: PlatformProvider): Action[] {
  const actions: Action[] = [];

  for (const dir of platform.supportedSplitDirections()) {
    actions.push({ id: `split-${dir}`, label: `split-${dir}`, exec: (cwd) => platform.split(dir, cwd) });
  }

  actions.push(
    { id: "terminal", label: "terminal", exec: (cwd) => platform.openTerminal(cwd) },
    { id: "finder", label: "finder", exec: (cwd) => platform.openFinder(cwd) },
  );

  return actions;
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }

  return qi === q.length;
}

export default function openIn(pi: ExtensionAPI) {

  pi.registerCommand("open-in", {
    description: "Open current directory in another app",
    handler: async (_args, ctx) => {
      const platform = getPlatform();
      const actions = buildActions(platform);

      const choice = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
        let query = "";
        let filtered = actions;

        const toItems = (list: Action[]): SelectItem[] =>
          list.map(a => ({ value: a.id, label: a.label }));

        const container = new Container();
        container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

        const titleText = new Text(theme.bold("Open in..."), 1, 0);
        container.addChild(titleText);

        const queryText = new Text("", 1, 0);
        container.addChild(queryText);

        let selectList = new SelectList(toItems(filtered), Math.min(filtered.length, 10), {
          selectedPrefix: (t) => theme.fg("accent", t),
          selectedText: (t) => theme.fg("accent", t),
          description: (t) => theme.fg("dim", t),
          scrollInfo: (t) => theme.fg("dim", t),
          noMatch: (t) => theme.fg("warning", t),
        });
        selectList.onSelect = (item) => done(item.value);
        selectList.onCancel = () => done(null);
        container.addChild(selectList);

        container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel • type to filter"), 1, 0));
        container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

        function rebuild() {
          filtered = query ? actions.filter(a => fuzzyMatch(query, a.id)) : actions;
          queryText.setText(query ? theme.fg("accent", `> ${query}`) : theme.fg("dim", "> type to filter..."));

          container.removeChild(selectList);
          selectList = new SelectList(toItems(filtered), Math.min(filtered.length, 10), {
            selectedPrefix: (t) => theme.fg("accent", t),
            selectedText: (t) => theme.fg("accent", t),
            description: (t) => theme.fg("dim", t),
            scrollInfo: (t) => theme.fg("dim", t),
            noMatch: (t) => theme.fg("warning", t),
          });
          selectList.onSelect = (item) => done(item.value);
          selectList.onCancel = () => done(null);
          container.children.splice(3, 0, selectList);
          tui.requestRender();
        }

        rebuild();

        return {
          render: (w: number) => container.render(w),
          invalidate: () => container.invalidate(),
          handleInput: (data: string) => {
            if (data === "\x7f" || data === "\b") {
              query = query.slice(0, -1);
              rebuild();
            } else if (data.length === 1 && data >= " ") {
              query += data;
              rebuild();
            } else {
              selectList.handleInput(data);
              tui.requestRender();
            }
          },
        };
      });

      if (!choice) return;

      const action = actions.find(a => a.id === choice);

      if (!action) return;

      try {
        await action.exec(ctx.cwd);
        ctx.ui.notify(`Opened ${action.label}.`, "info");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.ui.notify(msg, "error");
      }
    },
  });
}
