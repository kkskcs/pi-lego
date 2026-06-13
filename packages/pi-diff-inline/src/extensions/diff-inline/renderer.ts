import { visibleWidth, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import type { DiffData, DiffEntry, DiffSpan, InlineDiff } from "./types.js";

export type DiffRenderMode = "unified" | "split";

export type RendererTheme = {
  fg(style: string, text: string): string;
  bg(style: string, text: string): string;
  bold(text: string): string;
};

export type RenderDiffInput = {
  diffData: DiffData;
  width: number;
  mode: DiffRenderMode;
  theme: RendererTheme;
};

export type RenderDiffOutput = {
  mode: DiffRenderMode;
  lines: string[];
};

export function renderDiff(input: RenderDiffInput): RenderDiffOutput {
  const { diffData, width, mode, theme } = input;

  if (diffData.entries.length === 0) {
    return { mode, lines: [] };
  }

  const hunkCount = diffData.entries.filter((e) => e.kind === "hunk").length || 1;
  const header = `+${diffData.stats.added} -${diffData.stats.removed} • ${hunkCount} hunk`;
  const lines: string[] = [theme.fg("dim", header), ""];

  if (mode === "split") {
    const pane = Math.max(10, Math.floor((width - 3) / 2));
    lines.push(padRight("old", pane) + " │ " + "new");
    lines.push(...splitRows(diffData, width, theme));
    return { mode, lines };
  }

  lines.push(...unifiedRows(diffData, width, theme));
  return { mode, lines };
}

function tint(theme: RendererTheme, entry: DiffEntry, text: string): string {
  if (entry.kind === "add") return theme.bg("toolSuccessBg", theme.fg("success", text));
  if (entry.kind === "remove") return theme.bg("toolErrorBg", theme.fg("error", text));
  return text;
}

function gutterMarker(entry: DiffEntry): string {
  if (entry.kind === "add") return "+";
  if (entry.kind === "remove") return "-";
  return " ";
}

function lineNo(entry: DiffEntry): string {
  if (entry.kind === "add") return String((entry as any).newLine);
  if (entry.kind === "remove") return String((entry as any).oldLine);
  if (entry.kind === "context") return String((entry as any).newLine);
  return "";
}

function inlineText(entry: DiffEntry, index: number, diffData: DiffData, theme: RendererTheme): string {
  const text = "text" in entry ? entry.text : "";

  if (!diffData.inlineDiffs || (entry.kind !== "add" && entry.kind !== "remove")) {
    return text;
  }

  const pair = diffData.inlineDiffs.find((d) =>
    entry.kind === "remove" ? d.removeEntryIndex === index : d.addEntryIndex === index,
  );

  if (!pair) return text;

  const spans = entry.kind === "remove" ? pair.removeSpans : pair.addSpans;
  return renderSpans(spans, theme);
}

function renderSpans(spans: DiffSpan[], theme: RendererTheme): string {
  return spans.map((s) => {
    if (s.kind === "add") return theme.bold(theme.fg("success", s.text));
    if (s.kind === "remove") return theme.bold(theme.fg("error", s.text));
    return s.text;
  }).join("");
}

function wrapWithHangingIndent(
  prefix: string,
  content: string,
  width: number,
  options: { tint?: (text: string) => string } = {},
): string[] {
  const tintFn = options.tint ?? ((t: string) => t);

  const combined = prefix + content;

  if (visibleWidth(combined) <= width) {
    return [tintFn(combined)];
  }

  const prefixWidth = visibleWidth(prefix);
  const contentWidth = Math.max(1, width - prefixWidth);
  const wrapped = wrapTextWithAnsi(content, contentWidth);

  if (wrapped.length === 0) {
    return [tintFn(truncateToWidth(prefix, width))];
  }

  const indent = " ".repeat(prefixWidth);

  return wrapped.map((line, i) =>
    tintFn(truncateToWidth(i === 0 ? prefix + line : indent + line, width)),
  );
}

function padRight(line: string, width: number): string {
  const vis = visibleWidth(line);
  return vis >= width ? line : line + " ".repeat(width - vis);
}

function unifiedRows(diffData: DiffData, width: number, theme: RendererTheme): string[] {
  const rows: string[] = [];

  for (const [i, e] of diffData.entries.entries()) {
    if (e.kind === "meta") {
      if ("filePath" in e && e.filePath) {
        rows.push(padRight(theme.fg("accent", `── ${e.filePath} ──`), width));
      }
      continue;
    }

    if (e.kind === "hunk") {
      continue;
    }

    const prefix = `▌${gutterMarker(e)} ${lineNo(e)} │ `;
    const content = inlineText(e, i, diffData, theme);
    const tinted = wrapWithHangingIndent(prefix, content, width, {
      tint: (text) => tint(theme, e, text + " ".repeat(Math.max(0, width - visibleWidth(text)))),
    });

    rows.push(...tinted);
  }

  return rows;
}

function splitRows(diffData: DiffData, width: number, theme: RendererTheme): string[] {
  const pane = Math.max(10, Math.floor((width - 3) / 2));
  const rows: string[] = [];
  const separator = " │ ";

  let maxOld = 1;
  let maxNew = 1;

  for (const e of diffData.entries) {
    if ("oldLine" in e && typeof e.oldLine === "number" && e.oldLine > maxOld) maxOld = e.oldLine;
    if ("newLine" in e && typeof e.newLine === "number" && e.newLine > maxNew) maxNew = e.newLine;
  }

  const lw = String(maxOld).length;
  const rw = String(maxNew).length;

  function fmtLeft(num: number): string { return String(num).padStart(lw, " "); }
  function fmtRight(num: number): string { return String(num).padStart(rw, " "); }

  const blankLeft = `▌  ${" ".repeat(lw)} │ `;
  const blankRight = `▌  ${" ".repeat(rw)} │ `;
  const blankLeftPane = padRight(theme.fg("dim", blankLeft), pane);
  const blankRightPane = padRight(theme.fg("dim", blankRight), pane);

  let i = 0;

  while (i < diffData.entries.length) {
    const e = diffData.entries[i]!;

    if (e.kind === "meta") {
      if ("filePath" in e && e.filePath) {
        rows.push(padRight(theme.fg("accent", `── ${e.filePath} ──`), width));
      }
      i++;
      continue;
    }

    if (e.kind === "hunk") {
      i++;
      continue;
    }

    if (e.kind === "context") {
      const content = inlineText(e, i, diffData, theme);
      const leftPrefix = `▌  ${fmtLeft((e as any).oldLine)} │ `;
      const rightPrefix = `▌  ${fmtRight((e as any).newLine)} │ `;
      const rawLeft = truncateToWidth(leftPrefix + content, pane);
      const rawRight = truncateToWidth(rightPrefix + content, pane);
      const left = tint(theme, e, rawLeft + " ".repeat(Math.max(0, pane - visibleWidth(rawLeft))));
      const right = tint(theme, e, rawRight + " ".repeat(Math.max(0, pane - visibleWidth(rawRight))));
      rows.push(left + separator + right);
      i++;
      continue;
    }

    const removes: Array<{ entry: DiffEntry; globalIndex: number }> = [];
    const adds: Array<{ entry: DiffEntry; globalIndex: number }> = [];

    while (i < diffData.entries.length && diffData.entries[i]!.kind === "remove") {
      removes.push({ entry: diffData.entries[i]!, globalIndex: i });
      i++;
    }

    while (i < diffData.entries.length && diffData.entries[i]!.kind === "add") {
      adds.push({ entry: diffData.entries[i]!, globalIndex: i });
      i++;
    }

    const count = Math.max(removes.length, adds.length);

    for (let offset = 0; offset < count; offset++) {
      const leftItem = removes[offset];
      const rightItem = adds[offset];

      let leftLines: string[];

      if (leftItem) {
        const prefix = `▌- ${fmtLeft((leftItem.entry as any).oldLine)} │ `;
        const content = inlineText(leftItem.entry, leftItem.globalIndex, diffData, theme);
        leftLines = wrapWithHangingIndent(prefix, content, pane, {
          tint: (text) => tint(theme, leftItem.entry, padRight(text, pane)),
        });
      } else {
        leftLines = [blankLeftPane];
      }

      let rightLines: string[];

      if (rightItem) {
        const prefix = `▌+ ${fmtRight((rightItem.entry as any).newLine)} │ `;
        const content = inlineText(rightItem.entry, rightItem.globalIndex, diffData, theme);
        rightLines = wrapWithHangingIndent(prefix, content, pane, {
          tint: (text) => tint(theme, rightItem.entry, padRight(text, pane)),
        });
      } else {
        rightLines = [blankRightPane];
      }

      const lineCount = Math.max(leftLines.length, rightLines.length);

      for (let l = 0; l < lineCount; l++) {
        const left = leftLines[l] ?? blankLeftPane;
        const right = rightLines[l] ?? blankRightPane;
        rows.push(left + separator + right);
      }
    }
  }

  return rows;
}