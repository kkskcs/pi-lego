import type { DiffData, DiffEntry, DiffStats } from "./types.js";

export function parseDiff(diffText: string): DiffData {
  if (!diffText.trim()) {
    return { entries: [], stats: { added: 0, removed: 0, context: 0 } };
  }

  const lines = diffText.split("\n");
  const entries: DiffEntry[] = [];

  let currentFile: string | undefined;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of lines) {
    if (raw.startsWith("diff --git ")) {
      const match = raw.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = match?.[2] ?? match?.[1];
      entries.push({ kind: "meta", text: raw, filePath: currentFile });
      continue;
    }

    if (raw.startsWith("--- ")) {
      entries.push({ kind: "meta", text: raw });
      continue;
    }

    if (raw.startsWith("+++ ")) {
      entries.push({ kind: "meta", text: raw });
      continue;
    }

    if (raw.startsWith("@@")) {
      const match = raw.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

      if (match) {
        const oldStart = Number(match[1]);
        const oldCount = Number(match[2] ?? 1);
        const newStart = Number(match[3]);
        const newCount = Number(match[4] ?? 1);

        oldLine = oldStart;
        newLine = newStart;

        entries.push({ kind: "hunk", text: raw, oldStart, oldCount, newStart, newCount });
      }

      continue;
    }

    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      entries.push({ kind: "add", newLine, text: raw.slice(1) });
      newLine++;
      continue;
    }

    if (raw.startsWith("-") && !raw.startsWith("---")) {
      entries.push({ kind: "remove", oldLine, text: raw.slice(1) });
      oldLine++;
      continue;
    }

    if (raw.startsWith(" ")) {
      entries.push({ kind: "context", oldLine, newLine, text: raw.slice(1) });
      oldLine++;
      newLine++;
      continue;
    }

    if (raw.trim()) {
      entries.push({ kind: "meta", text: raw });
    }
  }

  return { entries, stats: buildStats(entries) };
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
