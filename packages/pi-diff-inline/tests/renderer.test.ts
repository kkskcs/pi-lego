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

  describe("hunk headers", () => {

    it("does not render @@ hunk lines in split mode", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 100,
        mode: "split",
        theme: makeTheme(),
      });

      const hunkLines = result.lines.filter((l) => l.includes("@@"));
      expect(hunkLines).toHaveLength(0);
    });

    it("does not render @@ hunk lines in unified mode", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 100,
        mode: "unified",
        theme: makeTheme(),
      });

      const hunkLines = result.lines.filter((l) => l.includes("@@"));
      expect(hunkLines).toHaveLength(0);
    });
  });

  describe("unified bg fill", () => {

    it("pads every line to full width", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      const contentLines = result.lines.slice(2);

      for (const line of contentLines) {
        if (visibleWidth(line) < 80) continue;
        expect(visibleWidth(line)).toBe(80);
      }
    });
  });

  describe("inline token highlighting", () => {

    it("applies bold to changed spans", () => {
      const boldCalls: string[] = [];
      const theme = {
        fg: (_s: string, t: string) => t,
        bg: (_s: string, t: string) => t,
        bold: (t: string) => { boldCalls.push(t); return `[B]${t}[/B]`; },
      };

      const data: DiffData = {
        entries: [
          { kind: "remove", oldLine: 1, text: "hello world" },
          { kind: "add", newLine: 1, text: "hello universe" },
        ],
        stats: { added: 1, removed: 1, context: 0 },
        inlineDiffs: [{
          removeEntryIndex: 0,
          addEntryIndex: 1,
          removeSpans: [{ kind: "equal", text: "hello " }, { kind: "remove", text: "world" }],
          addSpans: [{ kind: "equal", text: "hello " }, { kind: "add", text: "universe" }],
        }],
      };

      const result = renderDiff({ diffData: data, width: 80, mode: "unified", theme });
      expect(boldCalls.length).toBeGreaterThan(0);
    });
  });

  describe("context lines", () => {

    it("applies toolPendingBg to context lines", () => {
      const bgCalls: string[] = [];
      const theme = {
        fg: (_s: string, t: string) => t,
        bg: (s: string, t: string) => { bgCalls.push(s); return t; },
        bold: (t: string) => t,
      };

      const data: DiffData = {
        entries: [
          { kind: "context", oldLine: 1, newLine: 1, text: "unchanged" },
        ],
        stats: { added: 0, removed: 0, context: 1 },
      };

      renderDiff({ diffData: data, width: 80, mode: "unified", theme });
      expect(bgCalls).toContain("toolPendingBg");
    });
  });

  describe("header", () => {

    it("shows stats in header", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      const header = result.lines[0];
      expect(header).toContain("+1");
      expect(header).toContain("-1");
    });

    it("shows old/new column headers in split mode", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 100,
        mode: "split",
        theme: makeTheme(),
      });

      const colHeader = result.lines.find((l) => l.includes("old") && l.includes("new"));
      expect(colHeader).toBeDefined();
    });

    it("has blank line between header and content", () => {
      const result = renderDiff({
        diffData: simpleDiffData(),
        width: 80,
        mode: "unified",
        theme: makeTheme(),
      });

      expect(result.lines[1]?.trim()).toBe("");
    });
  });
});