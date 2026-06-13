import { describe, it, expect } from "vitest";
import { buildDiff, mergeDiffs } from "../src/extensions/diff-inline/build-diff.js";

describe("buildDiff", () => {

  it("generates diff entries from oldText/newText", () => {
    const oldText = "line1\nline2\nline3";
    const newText = "line1\nline2a\nline3";

    const result = buildDiff(oldText, newText);

    expect(result.stats.added).toBe(1);
    expect(result.stats.removed).toBe(1);
    expect(result.stats.context).toBeGreaterThanOrEqual(2);
  });

  it("handles pure addition", () => {
    const oldText = "line1\nline2\n";
    const newText = "line1\nline2\nline3\n";

    const result = buildDiff(oldText, newText);

    expect(result.stats.added).toBe(1);
    expect(result.stats.removed).toBe(0);
  });

  it("handles pure deletion", () => {
    const oldText = "line1\nline2\nline3\n";
    const newText = "line1\nline3\n";

    const result = buildDiff(oldText, newText);

    expect(result.stats.added).toBe(0);
    expect(result.stats.removed).toBe(1);
  });

  it("returns empty for identical texts", () => {
    const text = "hello\nworld";

    const result = buildDiff(text, text);

    expect(result.entries).toHaveLength(0);
    expect(result.stats).toEqual({ added: 0, removed: 0, context: 0 });
  });

  it("respects contextLines option", () => {
    const oldText = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join("\n");
    const newText = oldText.replace("line10", "changed10");

    const defaultResult = buildDiff(oldText, newText);
    const smallResult = buildDiff(oldText, newText, { contextLines: 1 });

    expect(smallResult.stats.context).toBeLessThan(defaultResult.stats.context);
  });

  it("generates inline diffs for similar lines", () => {
    const oldText = "const foo = 'hello';";
    const newText = "const foo = 'world';";

    const result = buildDiff(oldText, newText);

    expect(result.inlineDiffs).toBeDefined();
    expect(result.inlineDiffs!.length).toBe(1);

    const inline = result.inlineDiffs![0]!;
    expect(inline.removeSpans.some((s) => s.kind === "remove")).toBe(true);
    expect(inline.addSpans.some((s) => s.kind === "add")).toBe(true);
  });

  it("skips inline diffs for very different lines", () => {
    const oldText = "completely different content here";
    const newText = "nothing at all matches the above";

    const result = buildDiff(oldText, newText);

    expect(result.inlineDiffs).toBeUndefined();
  });

  it("handles empty oldText (new file)", () => {
    const result = buildDiff("", "line1\nline2");

    expect(result.stats.added).toBe(2);
    expect(result.stats.removed).toBe(0);
  });

  it("handles empty newText (deleted file)", () => {
    const result = buildDiff("line1\nline2", "");

    expect(result.stats.added).toBe(0);
    expect(result.stats.removed).toBe(2);
  });
});

describe("mergeDiffs", () => {

  it("merges multiple text pairs into one DiffData", () => {

    const result = mergeDiffs([
      { oldText: "aaa", newText: "bbb" },
      { oldText: "ccc", newText: "ddd" },
    ]);

    expect(result.stats.added).toBe(2);
    expect(result.stats.removed).toBe(2);
    expect(result.entries.length).toBeGreaterThan(2);
  });

  it("adds meta entry with label between blocks", () => {

    const result = mergeDiffs([
      { oldText: "aaa", newText: "bbb", label: "file1.ts" },
      { oldText: "ccc", newText: "ddd", label: "file2.ts" },
    ]);

    const metas = result.entries.filter((e: any) => e.kind === "meta");
    expect(metas.length).toBe(2);
    expect(metas[0].filePath).toBe("file1.ts");
    expect(metas[1].filePath).toBe("file2.ts");
  });

  it("skips blocks with no changes", () => {

    const result = mergeDiffs([
      { oldText: "same", newText: "same" },
      { oldText: "aaa", newText: "bbb" },
    ]);

    expect(result.stats.added).toBe(1);
    expect(result.stats.removed).toBe(1);
  });
});
