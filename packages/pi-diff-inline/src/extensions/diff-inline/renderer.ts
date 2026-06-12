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

  const lines: string[] = [];
  const groups = groupByFile(diffData.entries);

  for (const group of groups) {
    if (group.filePath) {
      lines.push(renderFileHeader(group.filePath, width, theme));
    }

    const bodyEntries: Array<{ entry: DiffEntry; originalIndex: number }> = [];

    for (let idx = 0; idx < group.entries.length; idx++) {
      const e = group.entries[idx]!;
      if (e.kind !== "meta") {
        bodyEntries.push({ entry: e, originalIndex: group.startIndex + idx });
      }
    }

    if (mode === "split") {
      lines.push(...renderSplit(bodyEntries, diffData.inlineDiffs, width, theme));
    } else {
      lines.push(...renderUnified(bodyEntries, diffData.inlineDiffs, width, theme));
    }
  }

  return { mode, lines };
}

type FileGroup = {
  filePath?: string;
  entries: DiffEntry[];
  startIndex: number;
};

function groupByFile(entries: DiffEntry[]): FileGroup[] {
  const groups: FileGroup[] = [];
  let current: FileGroup | undefined;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    if (entry.kind === "meta" && "filePath" in entry && entry.filePath) {
      current = { filePath: entry.filePath, entries: [], startIndex: i };
      groups.push(current);
      current.entries.push(entry);
      continue;
    }

    if (!current) {
      current = { entries: [], startIndex: i };
      groups.push(current);
    }

    current.entries.push(entry);
  }

  return groups;
}

function renderFileHeader(filePath: string, width: number, theme: RendererTheme): string {
  const label = ` ${filePath} `;
  const remaining = Math.max(0, width - label.length - 4);
  const left = "──";
  const right = "─".repeat(Math.max(0, remaining));
  return pad(theme.fg("accent", `${left}${label}${right}`), width);
}

type IndexedEntry = { entry: DiffEntry; originalIndex: number };

function renderUnified(items: IndexedEntry[], inlineDiffs: InlineDiff[] | undefined, width: number, theme: RendererTheme): string[] {
  const lines: string[] = [];

  for (const { entry, originalIndex } of items) {
    if (entry.kind === "hunk") {
      lines.push(pad(theme.fg("dim", entry.text), width));
      continue;
    }

    const oldNum = formatLineNum(entry.kind === "add" ? undefined : (entry as any).oldLine);
    const newNum = formatLineNum(entry.kind === "remove" ? undefined : (entry as any).newLine);
    const gutter = `${oldNum}│${newNum}│ `;
    const text = renderEntryText(entry, originalIndex, inlineDiffs, theme);
    const row = `${theme.fg("dim", gutter)}${text}`;

    lines.push(pad(applyLineBg(entry, row, width, theme), width));
  }

  return lines;
}

function renderSplit(items: IndexedEntry[], inlineDiffs: InlineDiff[] | undefined, width: number, theme: RendererTheme): string[] {
  const lines: string[] = [];
  const separatorWidth = 3;
  const paneWidth = Math.max(10, Math.floor((width - separatorWidth) / 2));
  const separator = theme.fg("dim", " │ ");

  let i = 0;

  while (i < items.length) {
    const { entry, originalIndex } = items[i]!;

    if (entry.kind === "hunk") {
      lines.push(pad(theme.fg("dim", entry.text), width));
      i++;
      continue;
    }

    if (entry.kind === "context") {
      const num = formatLineNum((entry as any).oldLine);
      const text = entry.text;
      const leftCell = pad(`${theme.fg("dim", `${num}│`)} ${text}`, paneWidth);
      const numR = formatLineNum((entry as any).newLine);
      const rightCell = pad(`${theme.fg("dim", `${numR}│`)} ${text}`, paneWidth);
      lines.push(pad(`${leftCell}${separator}${rightCell}`, width));
      i++;
      continue;
    }

    const removes: Array<{ entry: DiffEntry; originalIndex: number }> = [];
    const adds: Array<{ entry: DiffEntry; originalIndex: number }> = [];

    while (i < items.length && items[i]!.entry.kind === "remove") {
      removes.push(items[i]!);
      i++;
    }

    while (i < items.length && items[i]!.entry.kind === "add") {
      adds.push(items[i]!);
      i++;
    }

    const count = Math.max(removes.length, adds.length);

    for (let offset = 0; offset < count; offset++) {
      const leftItem = removes[offset];
      const rightItem = adds[offset];

      const leftCell = leftItem
        ? pad(applyLineBg(leftItem.entry, renderSplitCell(leftItem.entry, leftItem.originalIndex, inlineDiffs, paneWidth, theme), paneWidth, theme), paneWidth)
        : " ".repeat(paneWidth);

      const rightCell = rightItem
        ? pad(applyLineBg(rightItem.entry, renderSplitCell(rightItem.entry, rightItem.originalIndex, inlineDiffs, paneWidth, theme), paneWidth, theme), paneWidth)
        : " ".repeat(paneWidth);

      lines.push(pad(`${leftCell}${separator}${rightCell}`, width));
    }
  }

  return lines;
}

function renderSplitCell(entry: DiffEntry, globalIndex: number, inlineDiffs: InlineDiff[] | undefined, paneWidth: number, theme: RendererTheme): string {
  const lineNum = entry.kind === "remove" ? (entry as any).oldLine : (entry as any).newLine;
  const num = formatLineNum(lineNum);
  const text = renderEntryText(entry, globalIndex, inlineDiffs, theme);
  return truncate(`${theme.fg("dim", `${num}│`)} ${text}`, paneWidth);
}

function renderEntryText(entry: DiffEntry, globalIndex: number, inlineDiffs: InlineDiff[] | undefined, theme: RendererTheme): string {
  if (!inlineDiffs || entry.kind === "context" || entry.kind === "hunk" || entry.kind === "meta") {
    return entry.text;
  }

  const inline = inlineDiffs.find((d) =>
    entry.kind === "remove" ? d.removeEntryIndex === globalIndex : d.addEntryIndex === globalIndex,
  );

  if (!inline) return entry.text;

  const spans = entry.kind === "remove" ? inline.removeSpans : inline.addSpans;
  return renderSpans(spans, entry.kind, theme);
}

function renderSpans(spans: DiffSpan[], lineKind: "add" | "remove", theme: RendererTheme): string {
  return spans.map((span) => {
    if (span.kind === "equal") return span.text;

    if (lineKind === "add" && span.kind === "add") {
      return theme.bold(theme.bg("addHighlight", span.text));
    }

    if (lineKind === "remove" && span.kind === "remove") {
      return theme.bold(theme.bg("removeHighlight", span.text));
    }

    return span.text;
  }).join("");
}

function applyLineBg(entry: DiffEntry, text: string, width: number, theme: RendererTheme): string {
  if (entry.kind === "add") return theme.bg("addBg", pad(text, width));
  if (entry.kind === "remove") return theme.bg("removeBg", pad(text, width));
  return text;
}

function formatLineNum(num: number | undefined): string {
  if (num === undefined) return "    ";
  return String(num).padStart(4, " ");
}

function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

function truncate(text: string, width: number): string {
  if (text.length <= width) return text;
  return text.slice(0, width);
}
