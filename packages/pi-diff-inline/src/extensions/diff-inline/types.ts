export type DiffLineKind = "meta" | "hunk" | "context" | "add" | "remove";

export type DiffEntry =
  | { kind: "context"; oldLine: number; newLine: number; text: string }
  | { kind: "add"; newLine: number; text: string }
  | { kind: "remove"; oldLine: number; text: string }
  | { kind: "hunk"; text: string; oldStart: number; oldCount: number; newStart: number; newCount: number }
  | { kind: "meta"; text: string; filePath?: string };

export type DiffSpan =
  | { kind: "equal"; text: string }
  | { kind: "add"; text: string }
  | { kind: "remove"; text: string };

export type InlineDiff = {
  removeEntryIndex: number;
  addEntryIndex: number;
  removeSpans: DiffSpan[];
  addSpans: DiffSpan[];
};

export type DiffStats = {
  added: number;
  removed: number;
  context: number;
};

export type DiffData = {
  entries: DiffEntry[];
  stats: DiffStats;
  inlineDiffs?: InlineDiff[];
};
