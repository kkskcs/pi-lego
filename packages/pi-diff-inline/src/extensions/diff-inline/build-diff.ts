import * as Diff from "diff";
import type { DiffData, DiffEntry, DiffSpan, DiffStats, InlineDiff } from "./types.js";

const INLINE_SIMILARITY_THRESHOLD = 0.35;
const INLINE_TOKEN_PATTERN = /([A-Za-z_$][\w$]*|\d+|\s+|[^A-Za-z_$\w\s]+)/gu;
const MAX_INLINE_DIFF_TOKENS = 512;

export interface BuildDiffOptions {
  contextLines?: number;
}

export function buildDiff(oldText: string, newText: string, options?: BuildDiffOptions): DiffData {
  if (oldText === newText) {
    return { entries: [], stats: { added: 0, removed: 0, context: 0 } };
  }

  const contextLines = options?.contextLines ?? 3;
  const entries = buildEntries(oldText, newText, contextLines);
  const stats = buildStats(entries);
  const inlineDiffs = buildInlineDiffs(entries);

  return {
    entries,
    stats,
    ...(inlineDiffs ? { inlineDiffs } : {}),
  };
}

function buildEntries(oldText: string, newText: string, contextLines: number): DiffEntry[] {
  const parts = Diff.diffLines(oldText, newText);
  const entries: DiffEntry[] = [];

  let oldLine = 1;
  let newLine = 1;
  let lastWasChange = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const raw = part.value.split("\n");

    if (raw[raw.length - 1] === "") raw.pop();

    if (part.added || part.removed) {
      for (const line of raw) {
        if (part.added) {
          entries.push({ kind: "add", newLine, text: line });
          newLine++;
        } else {
          entries.push({ kind: "remove", oldLine, text: line });
          oldLine++;
        }
      }

      lastWasChange = true;
      continue;
    }

    const nextPartIsChange = i < parts.length - 1 && (parts[i + 1]!.added || parts[i + 1]!.removed);

    if (lastWasChange || nextPartIsChange) {
      let linesToShow = raw;
      let skipStart = 0;
      let skipEnd = 0;

      if (!lastWasChange) {
        skipStart = Math.max(0, raw.length - contextLines);
        linesToShow = raw.slice(skipStart);
      }

      if (!nextPartIsChange && linesToShow.length > contextLines) {
        skipEnd = linesToShow.length - contextLines;
        linesToShow = linesToShow.slice(0, contextLines);
      }

      oldLine += skipStart;
      newLine += skipStart;

      for (const line of linesToShow) {
        entries.push({ kind: "context", oldLine, newLine, text: line });
        oldLine++;
        newLine++;
      }

      oldLine += skipEnd;
      newLine += skipEnd;
    } else {
      oldLine += raw.length;
      newLine += raw.length;
    }

    lastWasChange = false;
  }

  return entries;
}

function buildStats(entries: DiffEntry[]): DiffStats {
  let added = 0;
  let removed = 0;
  let context = 0;

  for (const entry of entries) {
    if (entry.kind === "add") added++;
    else if (entry.kind === "remove") removed++;
    else if (entry.kind === "context") context++;
  }

  return { added, removed, context };
}

function tokenize(text: string): string[] {
  return text.match(INLINE_TOKEN_PATTERN) ?? (text ? [text] : []);
}

function longestCommonSubsequence(a: string[], b: string[]): Array<[number, number]> {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  return pairs;
}

function pushMergedSpan(spans: DiffSpan[], span: DiffSpan): void {
  if (!span.text) return;

  const previous = spans[spans.length - 1];

  if (previous?.kind === span.kind) {
    previous.text += span.text;
    return;
  }

  spans.push({ ...span });
}

function buildInlineSpans(removeText: string, addText: string): { removeSpans: DiffSpan[]; addSpans: DiffSpan[] } | undefined {
  const removeTokens = tokenize(removeText);
  const addTokens = tokenize(addText);

  if (!removeTokens.length || !addTokens.length) return undefined;
  if (removeTokens.length > MAX_INLINE_DIFF_TOKENS || addTokens.length > MAX_INLINE_DIFF_TOKENS) return undefined;

  const pairs = longestCommonSubsequence(removeTokens, addTokens);

  const meaningfulRemove = removeTokens.filter((t) => t.trim().length > 0).length;
  const meaningfulAdd = addTokens.filter((t) => t.trim().length > 0).length;
  const meaningfulEqual = pairs.filter(([ri, ai]) => {
    const rt = removeTokens[ri] ?? "";
    const at = addTokens[ai] ?? "";
    return rt === at && rt.trim().length > 0;
  }).length;

  const similarity = meaningfulEqual / Math.max(meaningfulRemove, meaningfulAdd);

  if (similarity < INLINE_SIMILARITY_THRESHOLD) return undefined;

  const removeSpans: DiffSpan[] = [];
  const addSpans: DiffSpan[] = [];
  let removeCursor = 0;
  let addCursor = 0;

  for (const [removeIndex, addIndex] of pairs) {
    if (removeCursor < removeIndex) {
      pushMergedSpan(removeSpans, { kind: "remove", text: removeTokens.slice(removeCursor, removeIndex).join("") });
    }

    if (addCursor < addIndex) {
      pushMergedSpan(addSpans, { kind: "add", text: addTokens.slice(addCursor, addIndex).join("") });
    }

    pushMergedSpan(removeSpans, { kind: "equal", text: removeTokens[removeIndex]! });
    pushMergedSpan(addSpans, { kind: "equal", text: addTokens[addIndex]! });
    removeCursor = removeIndex + 1;
    addCursor = addIndex + 1;
  }

  if (removeCursor < removeTokens.length) {
    pushMergedSpan(removeSpans, { kind: "remove", text: removeTokens.slice(removeCursor).join("") });
  }

  if (addCursor < addTokens.length) {
    pushMergedSpan(addSpans, { kind: "add", text: addTokens.slice(addCursor).join("") });
  }

  if (!removeSpans.some((s) => s.kind === "remove") || !addSpans.some((s) => s.kind === "add")) return undefined;

  return { removeSpans, addSpans };
}

function buildInlineDiffs(entries: DiffEntry[]): InlineDiff[] | undefined {
  const inlineDiffs: InlineDiff[] = [];

  for (let index = 0; index < entries.length;) {
    if (entries[index]?.kind !== "remove") {
      index++;
      continue;
    }

    const removeStart = index;

    while (entries[index]?.kind === "remove") index++;

    const addStart = index;

    while (entries[index]?.kind === "add") index++;

    const removeCount = addStart - removeStart;
    const addCount = index - addStart;

    if (removeCount === 0 || addCount === 0 || removeCount !== addCount) continue;

    for (let offset = 0; offset < removeCount; offset++) {
      const removeIndex = removeStart + offset;
      const addIndex = addStart + offset;
      const removeEntry = entries[removeIndex];
      const addEntry = entries[addIndex];

      if (removeEntry?.kind !== "remove" || addEntry?.kind !== "add") continue;

      const spans = buildInlineSpans(removeEntry.text, addEntry.text);

      if (!spans) continue;

      inlineDiffs.push({
        removeEntryIndex: removeIndex,
        addEntryIndex: addIndex,
        removeSpans: spans.removeSpans,
        addSpans: spans.addSpans,
      });
    }
  }

  return inlineDiffs.length ? inlineDiffs : undefined;
}
