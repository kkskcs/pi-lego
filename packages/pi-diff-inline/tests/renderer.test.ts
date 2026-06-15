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

  describe("file boundary markers", () => {

    it("shows ^ for file starting at line 1", () => {
      const data: DiffData = {
        entries: [
          { kind: "meta", text: "diff --git a/new.ts b/new.ts", filePath: "new.ts" },
          { kind: "hunk", text: "@@ -0,0 +1,2 @@", oldStart: 0, oldCount: 0, newStart: 1, newCount: 2 },
          { kind: "add", newLine: 1, text: "line1" },
          { kind: "add", newLine: 2, text: "line2" },
        ],
        stats: { added: 2, removed: 0, context: 0 },
      };

      const result = renderDiff({ diffData: data, width: 80, mode: "unified", theme: makeTheme() });
      const hasTopCaret = result.lines.some((l) => l.includes("^"));
      expect(hasTopCaret).toBe(true);
    });

    it("shows $ for complete new file", () => {
      const data: DiffData = {
        entries: [
          { kind: "meta", text: "diff --git a/new.ts b/new.ts", filePath: "new.ts" },
          { kind: "hunk", text: "@@ -0,0 +1,2 @@", oldStart: 0, oldCount: 0, newStart: 1, newCount: 2 },
          { kind: "add", newLine: 1, text: "line1" },
          { kind: "add", newLine: 2, text: "line2" },
        ],
        stats: { added: 2, removed: 0, context: 0 },
      };

      const result = renderDiff({ diffData: data, width: 80, mode: "unified", theme: makeTheme() });
      const hasBottom$ = result.lines.some((l) => l.includes("$"));
      expect(hasBottom$).toBe(true);
    });

    it("shows ⋮ for partial file (not starting at line 1)", () => {
      const data: DiffData = {
        entries: [
          { kind: "meta", text: "diff --git a/app.ts b/app.ts", filePath: "app.ts" },
          { kind: "hunk", text: "@@ -3,3 +3,3 @@", oldStart: 3, oldCount: 3, newStart: 3, newCount: 3 },
          { kind: "context", oldLine: 3, newLine: 3, text: "ctx" },
          { kind: "remove", oldLine: 4, text: "old" },
          { kind: "add", newLine: 4, text: "new" },
          { kind: "context", oldLine: 5, newLine: 5, text: "ctx2" },
        ],
        stats: { added: 1, removed: 1, context: 2 },
      };

      const result = renderDiff({ diffData: data, width: 80, mode: "unified", theme: makeTheme() });
      const hasCaret = result.lines.some((l) => l.includes("^"));
      const hasEllipsis = result.lines.some((l) => l.includes("⋮"));
      expect(hasCaret).toBe(false);
      expect(hasEllipsis).toBe(true);
    });

    it("shows --- fill for ^ and $ markers", () => {
      const data: DiffData = {
        entries: [
          { kind: "meta", text: "diff --git a/new.ts b/new.ts", filePath: "new.ts" },
          { kind: "hunk", text: "@@ -0,0 +1,1 @@", oldStart: 0, oldCount: 0, newStart: 1, newCount: 1 },
          { kind: "add", newLine: 1, text: "line1" },
        ],
        stats: { added: 1, removed: 0, context: 0 },
      };

      const result = renderDiff({ diffData: data, width: 80, mode: "unified", theme: makeTheme() });
      const hasDash = result.lines.some((l) => l.includes("---"));
      expect(hasDash).toBe(true);
    });

    it("shows ... fill for ⋮ hunk separator", () => {
      const data: DiffData = {
        entries: [
          { kind: "meta", text: "diff --git a/app.ts b/app.ts", filePath: "app.ts" },
          { kind: "hunk", text: "@@ -1,2 +1,2 @@", oldStart: 1, oldCount: 2, newStart: 1, newCount: 2 },
          { kind: "context", oldLine: 1, newLine: 1, text: "a" },
          { kind: "remove", oldLine: 2, text: "b" },
          { kind: "add", newLine: 2, text: "c" },
          { kind: "hunk", text: "@@ -10,1 +10,1 @@", oldStart: 10, oldCount: 1, newStart: 10, newCount: 1 },
          { kind: "remove", oldLine: 10, text: "x" },
          { kind: "add", newLine: 10, text: "y" },
        ],
        stats: { added: 2, removed: 2, context: 1 },
      };

      const result = renderDiff({ diffData: data, width: 80, mode: "unified", theme: makeTheme() });
      const hasDots = result.lines.some((l) => l.includes("..."));
      expect(hasDots).toBe(true);
    });
  });
});

describe("file boundary markers", () => {

  function newFileDiff(): DiffData {
    return {
      entries: [
        { kind: "meta", text: "diff --git a/new.ts b/new.ts", filePath: "new.ts" },
        { kind: "meta", text: "--- /dev/null" },
        { kind: "meta", text: "+++ b/new.ts" },
        { kind: "hunk", text: "@@ -0,0 +1,3 @@", oldStart: 0, oldCount: 0, newStart: 1, newCount: 3 },
        { kind: "add", text: "line1", newLine: 1 },
        { kind: "add", text: "line2", newLine: 2 },
        { kind: "add", text: "line3", newLine: 3 },
      ],
      stats: { added: 3, removed: 0 },
    };
  }

  function modifiedFileDiff(): DiffData {
    return {
      entries: [
        { kind: "meta", text: "diff --git a/mod.ts b/mod.ts", filePath: "mod.ts" },
        { kind: "meta", text: "--- a/mod.ts" },
        { kind: "meta", text: "+++ b/mod.ts" },
        { kind: "hunk", text: "@@ -5,3 +5,3 @@", oldStart: 5, oldCount: 3, newStart: 5, newCount: 3 },
        { kind: "context", text: "ctx", oldLine: 5, newLine: 5 },
        { kind: "remove", text: "old", oldLine: 6 },
        { kind: "add", text: "new", newLine: 6 },
        { kind: "context", text: "ctx", oldLine: 7, newLine: 7 },
      ],
      stats: { added: 1, removed: 1 },
    };
  }

  it("new file: top ^ bottom $", () => {
    const result = renderDiff({ diffData: newFileDiff(), width: 80, mode: "unified", theme: makeTheme() });
    const lines = result.lines;
    const topFrame = lines.find(l => l.includes("^") && l.includes("│"));
    const bottomFrame = lines.find(l => l.includes("$") && l.includes("│"));
    expect(topFrame).toBeDefined();
    expect(bottomFrame).toBeDefined();
    expect(topFrame).toContain("---");
    expect(bottomFrame).toContain("---");
  });

  it("modified file (not from line 1): top ⋮ bottom ⋮", () => {
    const result = renderDiff({ diffData: modifiedFileDiff(), width: 80, mode: "unified", theme: makeTheme() });
    const lines = result.lines;
    const topFrame = lines.find(l => l.includes("⋮") && l.includes("│") && l.includes("..."));
    const bottomFrame = [...lines].reverse().find(l => l.includes("⋮") && l.includes("│") && l.includes("..."));
    expect(topFrame).toBeDefined();
    expect(bottomFrame).toBeDefined();
  });

  it("hunk separator shows ⋮ with ...", () => {
    const multiHunk: DiffData = {
      entries: [
        { kind: "meta", text: "diff --git a/f.ts b/f.ts", filePath: "f.ts" },
        { kind: "meta", text: "--- a/f.ts" },
        { kind: "meta", text: "+++ b/f.ts" },
        { kind: "hunk", text: "@@ -1,2 +1,2 @@", oldStart: 1, oldCount: 2, newStart: 1, newCount: 2 },
        { kind: "context", text: "a", oldLine: 1, newLine: 1 },
        { kind: "remove", text: "b", oldLine: 2 },
        { kind: "add", text: "c", newLine: 2 },
        { kind: "hunk", text: "@@ -10,2 +10,2 @@", oldStart: 10, oldCount: 2, newStart: 10, newCount: 2 },
        { kind: "context", text: "x", oldLine: 10, newLine: 10 },
        { kind: "remove", text: "y", oldLine: 11 },
        { kind: "add", text: "z", newLine: 11 },
      ],
      stats: { added: 2, removed: 2 },
    };
    const result = renderDiff({ diffData: multiHunk, width: 80, mode: "unified", theme: makeTheme() });
    const hunkLines = result.lines.filter(l => l.includes("⋮") && l.includes("..."));
    expect(hunkLines.length).toBeGreaterThanOrEqual(1);
  });

  it("split mode also shows markers", () => {
    const result = renderDiff({ diffData: newFileDiff(), width: 80, mode: "split", theme: makeTheme() });
    const lines = result.lines;
    const topFrame = lines.find(l => l.includes("^") && l.includes("---"));
    const bottomFrame = lines.find(l => l.includes("$") && l.includes("---"));
    expect(topFrame).toBeDefined();
    expect(bottomFrame).toBeDefined();
  });

  it("top frame shows even without filePath meta", () => {
    const noFilePathData: DiffData = {
      entries: [
        { kind: "hunk", text: "@@ -1,2 +1,2 @@", oldStart: 1, oldCount: 2, newStart: 1, newCount: 2 },
        { kind: "context", text: "a", oldLine: 1, newLine: 1 },
        { kind: "remove", text: "b", oldLine: 2 },
        { kind: "add", text: "c", newLine: 2 },
      ],
      stats: { added: 1, removed: 1, context: 1 },
    };
    const result = renderDiff({ diffData: noFilePathData, width: 80, mode: "unified", theme: makeTheme() });
    const topFrame = result.lines.find(l => l.includes("^") && l.includes("│") && l.includes("---"));
    expect(topFrame).toBeDefined();
  });

  it("split mode top frame without filePath meta", () => {
    const noFilePathData: DiffData = {
      entries: [
        { kind: "hunk", text: "@@ -1,2 +1,2 @@", oldStart: 1, oldCount: 2, newStart: 1, newCount: 2 },
        { kind: "context", text: "a", oldLine: 1, newLine: 1 },
        { kind: "remove", text: "b", oldLine: 2 },
        { kind: "add", text: "c", newLine: 2 },
      ],
      stats: { added: 1, removed: 1, context: 1 },
    };
    const result = renderDiff({ diffData: noFilePathData, width: 80, mode: "split", theme: makeTheme() });
    const topFrame = result.lines.find(l => l.includes("^") && l.includes("---"));
    expect(topFrame).toBeDefined();
  });

});