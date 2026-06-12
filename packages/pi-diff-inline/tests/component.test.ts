import { describe, it, expect } from "vitest";
import { DiffInlineComponent } from "../src/extensions/diff-inline/component.js";
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
      { kind: "hunk", text: "@@ -1,3 +1,3 @@", oldStart: 1, oldCount: 3, newStart: 1, newCount: 3 },
      { kind: "context", oldLine: 1, newLine: 1, text: "line1" },
      { kind: "remove", oldLine: 2, text: "old" },
      { kind: "add", newLine: 2, text: "new" },
      { kind: "context", oldLine: 3, newLine: 3, text: "line3" },
    ],
    stats: { added: 1, removed: 1, context: 2 },
  };
}

describe("DiffInlineComponent", () => {

  it("renders collapsed summary when not expanded", () => {
    const component = new DiffInlineComponent({
      diffData: simpleDiffData(),
      theme: makeTheme(),
      expanded: false,
      mode: "unified",
    });

    const lines = component.render(80);

    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("+1");
    expect(lines[0]).toContain("-1");
  });

  it("renders full diff when expanded", () => {
    const component = new DiffInlineComponent({
      diffData: simpleDiffData(),
      theme: makeTheme(),
      expanded: true,
      mode: "unified",
    });

    const lines = component.render(80);

    expect(lines.length).toBeGreaterThan(1);
  });

  it("caches render result for same width", () => {
    const component = new DiffInlineComponent({
      diffData: simpleDiffData(),
      theme: makeTheme(),
      expanded: true,
      mode: "unified",
    });

    const lines1 = component.render(80);
    const lines2 = component.render(80);

    expect(lines1).toBe(lines2);
  });

  it("invalidates cache on width change", () => {
    const component = new DiffInlineComponent({
      diffData: simpleDiffData(),
      theme: makeTheme(),
      expanded: true,
      mode: "unified",
    });

    const lines1 = component.render(80);
    const lines2 = component.render(100);

    expect(lines1).not.toBe(lines2);
  });

  it("supports mode update", () => {
    const component = new DiffInlineComponent({
      diffData: simpleDiffData(),
      theme: makeTheme(),
      expanded: true,
      mode: "unified",
    });

    const unified = component.render(100);

    component.update({
      diffData: simpleDiffData(),
      theme: makeTheme(),
      expanded: true,
      mode: "split",
    });

    const split = component.render(100);

    expect(unified).not.toBe(split);
  });

  it("renders label when provided", () => {
    const component = new DiffInlineComponent({
      diffData: simpleDiffData(),
      theme: makeTheme(),
      expanded: true,
      mode: "unified",
      label: "My Diff",
    });

    const lines = component.render(80);
    const hasLabel = lines.some((l) => l.includes("My Diff"));

    expect(hasLabel).toBe(true);
  });
});
