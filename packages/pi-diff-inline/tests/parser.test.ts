import { describe, it, expect } from "vitest";
import { parseDiff } from "../src/extensions/diff-inline/parser.js";

describe("parseDiff", () => {

  it("parses a simple unified diff", () => {
    const diff = [
      "diff --git a/foo.ts b/foo.ts",
      "index abc1234..def5678 100644",
      "--- a/foo.ts",
      "+++ b/foo.ts",
      "@@ -1,3 +1,4 @@",
      " line1",
      "-line2",
      "+line2a",
      "+line2b",
      " line3",
    ].join("\n");

    const result = parseDiff(diff);

    expect(result.entries.filter((e) => e.kind === "meta")).toHaveLength(4);
    expect(result.entries.filter((e) => e.kind === "hunk")).toHaveLength(1);
    expect(result.entries.filter((e) => e.kind === "context")).toHaveLength(2);
    expect(result.entries.filter((e) => e.kind === "remove")).toHaveLength(1);
    expect(result.entries.filter((e) => e.kind === "add")).toHaveLength(2);
    expect(result.stats).toEqual({ added: 2, removed: 1, context: 2 });
  });

  it("tracks line numbers correctly", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "--- a/a.ts",
      "+++ b/a.ts",
      "@@ -5,4 +5,4 @@",
      " ctx1",
      "-old",
      "+new",
      " ctx2",
    ].join("\n");

    const result = parseDiff(diff);
    const ctx1 = result.entries.find((e) => e.kind === "context" && e.text === "ctx1");
    const remove = result.entries.find((e) => e.kind === "remove");
    const add = result.entries.find((e) => e.kind === "add");
    const ctx2 = result.entries.find((e) => e.kind === "context" && e.text === "ctx2");

    expect(ctx1).toMatchObject({ oldLine: 5, newLine: 5 });
    expect(remove).toMatchObject({ oldLine: 6, text: "old" });
    expect(add).toMatchObject({ newLine: 6, text: "new" });
    expect(ctx2).toMatchObject({ oldLine: 7, newLine: 7 });
  });

  it("parses new file diff", () => {
    const diff = [
      "diff --git a/new.ts b/new.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/new.ts",
      "@@ -0,0 +1,2 @@",
      "+hello",
      "+world",
    ].join("\n");

    const result = parseDiff(diff);
    expect(result.stats).toEqual({ added: 2, removed: 0, context: 0 });
  });

  it("parses deleted file diff", () => {
    const diff = [
      "diff --git a/old.ts b/old.ts",
      "deleted file mode 100644",
      "--- a/old.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-hello",
      "-world",
    ].join("\n");

    const result = parseDiff(diff);
    expect(result.stats).toEqual({ added: 0, removed: 2, context: 0 });
  });

  it("parses multiple files", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "--- a/a.ts",
      "+++ b/a.ts",
      "@@ -1,1 +1,1 @@",
      "-old",
      "+new",
      "diff --git a/b.ts b/b.ts",
      "--- a/b.ts",
      "+++ b/b.ts",
      "@@ -1,1 +1,1 @@",
      "-foo",
      "+bar",
    ].join("\n");

    const result = parseDiff(diff);
    expect(result.stats).toEqual({ added: 2, removed: 2, context: 0 });

    const metas = result.entries.filter((e) => e.kind === "meta" && e.text.startsWith("diff --git"));
    expect(metas).toHaveLength(2);
  });

  it("extracts filePath from diff header", () => {
    const diff = [
      "diff --git a/src/utils.ts b/src/utils.ts",
      "--- a/src/utils.ts",
      "+++ b/src/utils.ts",
      "@@ -1,1 +1,1 @@",
      "-old",
      "+new",
    ].join("\n");

    const result = parseDiff(diff);
    const meta = result.entries.find((e) => e.kind === "meta" && e.filePath);
    expect(meta).toMatchObject({ filePath: "src/utils.ts" });
  });

  it("parses hunk header numbers", () => {
    const diff = [
      "diff --git a/x.ts b/x.ts",
      "--- a/x.ts",
      "+++ b/x.ts",
      "@@ -10,5 +12,7 @@ function foo()",
      " ctx",
    ].join("\n");

    const result = parseDiff(diff);
    const hunk = result.entries.find((e) => e.kind === "hunk");
    expect(hunk).toMatchObject({
      oldStart: 10,
      oldCount: 5,
      newStart: 12,
      newCount: 7,
    });
  });

  it("returns empty data for empty input", () => {
    const result = parseDiff("");
    expect(result.entries).toHaveLength(0);
    expect(result.stats).toEqual({ added: 0, removed: 0, context: 0 });
  });
});
