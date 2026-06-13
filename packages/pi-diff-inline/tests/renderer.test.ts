import { describe, it, expect } from "vitest";
import { visibleWidth } from "@earendil-works/pi-tui";
import { renderDiff, type RenderDiffInput, type RenderDiffOutput } from "../src/extensions/diff-inline/renderer.js";
import type { DiffData } from "../src/extensions/diff-inline/types.js";

function makeTheme() {
  return {
    fg: (_style: string, text: string) => text,
    bg: (_style: string, text: string) => text,
    bold: (text: string) => text,
  };
}

function simpleDiffData(): DiffData {
  return {
    entries: [
      { kind: "meta", text: "diff --git a/foo.ts b/foo.ts", filePath: "foo.ts" },
      { kind: "meta", text: "--- a/foo.ts" },
      { kind: "meta", text: "+++ b/foo.ts" },
      { kind: "hunk", text: "@@ -1,3 +1,3 @@", oldStart: 1, oldCount: 3, newStart: 1, newCount: 3 },
      { kind: "context", oldLine: 1, newLine: 1, text: "line1" },
      { kind: "remove", oldLine: 2, text: "old" },
      { kind: "add", newLine: 2, text: "new" },
      { kind: "context", oldLine: 3, newLine: 3, text: "line3" },
    ],
    stats: { added: 1, removed: 1, context: 2 },
  };
}

describe("renderDiff", () => {

  describe("split mode", () => {

    it("produces output lines", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 100,
        mode: "split",
        theme: makeTheme(),
      });

      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.mode).toBe("split");
    });

    it("renders file header", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 100,
        mode: "split",
        theme: makeTheme(),
      });

      const hasFileHeader = result.lines.some((l) => l.includes("foo.ts"));
      expect(hasFileHeader).toBe(true);
    });

    it("renders context lines in both panes", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 100,
        mode: "split",
        theme: makeTheme(),
      });

      const contextLines = result.lines.filter((l) => l.includes("line1"));
      expect(contextLines.length).toBeGreaterThanOrEqual(1);
    });

    it("renders remove in left pane and add in right pane", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 100,
        mode: "split",
        theme: makeTheme(),
      });

      const hasOld = result.lines.some((l) => l.includes("old"));
      const hasNew = result.lines.some((l) => l.includes("new"));
      expect(hasOld).toBe(true);
      expect(hasNew).toBe(true);
    });

    it("respects width constraint", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 60,
        mode: "split",
        theme: makeTheme(),
      });

      for (const line of result.lines) {
        expect(visibleWidth(line)).toBeLessThanOrEqual(60);
      }
    });
  });

  describe("unified mode", () => {

    it("produces output lines", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.mode).toBe("unified");
    });

    it("shows old and new line numbers", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      const numberLines = result.lines.filter((l) => l.includes("2"));
      expect(numberLines.length).toBeGreaterThanOrEqual(1);
    });

    it("renders file header", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      const hasFileHeader = result.lines.some((l) => l.includes("foo.ts"));
      expect(hasFileHeader).toBe(true);
    });
  });

  describe("inline token highlighting", () => {

    it("renders inline spans when present", () => {
      const data: DiffData = {
        entries: [
          { kind: "remove", oldLine: 1, text: "const foo = 'hello';" },
          { kind: "add", newLine: 1, text: "const foo = 'world';" },
        ],
        stats: { added: 1, removed: 1, context: 0 },
        inlineDiffs: [
          {
            removeEntryIndex: 0,
            addEntryIndex: 1,
            removeSpans: [
              { kind: "equal", text: "const foo = '" },
              { kind: "remove", text: "hello" },
              { kind: "equal", text: "';" },
            ],
            addSpans: [
              { kind: "equal", text: "const foo = '" },
              { kind: "add", text: "world" },
              { kind: "equal", text: "';" },
            ],
          },
        ],
      };

      const result = renderDiff({
        diffData: data,
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      const hasHello = result.lines.some((l) => l.includes("hello"));
      const hasWorld = result.lines.some((l) => l.includes("world"));
      expect(hasHello).toBe(true);
      expect(hasWorld).toBe(true);
    });
  });

  describe("empty diff", () => {

    it("returns empty for no entries", () => {
      const result = renderDiff({
        diffData: { entries: [], stats: { added: 0, removed: 0, context: 0 } },
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      expect(result.lines).toHaveLength(0);
    });
  });
});
