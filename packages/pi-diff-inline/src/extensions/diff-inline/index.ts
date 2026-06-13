import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { parseDiff } from "./parser.js";
import { buildDiff, mergeDiffs } from "./build-diff.js";
import { DiffInlineComponent } from "./component.js";
import type { DiffData } from "./types.js";
import type { RendererTheme, DiffRenderMode } from "./renderer.js";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

const parameters = Type.Object({
  diffText: Type.Optional(Type.String({ description: "Unified diff text (git diff, diff -u, etc.)" })),
  oldText: Type.Optional(Type.String({ description: "Original text for comparison" })),
  newText: Type.Optional(Type.String({ description: "New text for comparison" })),
  diffs: Type.Optional(Type.Array(Type.Object({
    oldText: Type.String({ description: "Original text" }),
    newText: Type.String({ description: "New text" }),
    label: Type.Optional(Type.String({ description: "Label for this diff block" })),
  }), { description: "Array of text pairs for multi-block comparison" })),
  label: Type.Optional(Type.String({ description: "Header label shown above the diff" })),
  contextLines: Type.Optional(Type.Number({ description: "Context lines for text-to-text mode (default: 3)" })),
  expandable: Type.Optional(Type.Boolean({ description: "Enable Ctrl+O collapse toggle (default: false — always show full diff)" })),
  mode: Type.Optional(Type.Union([Type.Literal("split"), Type.Literal("unified")], { description: "Render mode (default: split)" })),
});

type DiffInlineParams = {
  diffText?: string;
  oldText?: string;
  newText?: string;
  diffs?: Array<{ oldText: string; newText: string; label?: string }>;
  label?: string;
  contextLines?: number;
  expandable?: boolean;
  mode?: "split" | "unified";
};

let globalMode: DiffRenderMode = "split";
const activeComponents: Set<DiffInlineComponent> = new Set();

export default function (pi: ExtensionAPI) {

  pi.registerTool({
    name: "diff_inline",
    label: "Diff Inline",
    description: "Render a diff inline in the conversation stream",
    parameters,

    async execute(_toolCallId: string, params: DiffInlineParams) {
      const { diffData, error } = resolveInput(params);

      if (error) {
        return { content: [{ type: "text" as const, text: error }], details: {} as any };
      }

      const summary = `↳ diff +${diffData!.stats.added} -${diffData!.stats.removed}`;
      return {
        content: [{ type: "text" as const, text: summary }],
        details: { diffData: diffData!, label: params.label, expandable: params.expandable, mode: params.mode } as any,
      };
    },

    renderResult(result: any, options: any, theme: any, _context: any) {
      const diffData = result?.details?.diffData as DiffData | undefined;

      const rendererTheme: RendererTheme = {
        fg: (style: string, text: string) => theme.fg(style, text),
        bg: (style: string, text: string) => theme.bg(style, text),
        bold: (text: string) => theme.bold?.(text) ?? text,
      };

      if (!diffData) {
        return new DiffInlineComponent({
          diffData: { entries: [], stats: { added: 0, removed: 0, context: 0 } },
          theme: rendererTheme,
          expanded: true,
          expandable: false,
          mode: result?.details?.mode ?? globalMode,
        });
      }

      const component = new DiffInlineComponent({
        diffData,
        theme: rendererTheme,
        expanded: options?.expanded ?? true,
        expandable: result?.details?.expandable ?? false,
        mode: result?.details?.mode ?? globalMode,
        label: result?.details?.label,
      });

      activeComponents.add(component);
      return component;
    },
  });

  pi.registerCommand("diff-inline", {
    description: "Compare texts inline (free-form input, LLM interprets)",
    handler: async (args: string) => {
      pi.sendUserMessage(args);
    },
  });
}

function resolveInput(params: DiffInlineParams): { diffData?: DiffData; error?: string } {
  const hasDiffText = typeof params.diffText === "string" && params.diffText.length > 0;
  const hasTextPair = typeof params.oldText === "string" && typeof params.newText === "string";
  const hasDiffs = Array.isArray(params.diffs) && params.diffs.length > 0;

  const modeCount = [hasDiffText, hasTextPair, hasDiffs].filter(Boolean).length;

  if (modeCount > 1) {
    return { error: "Provide only one of: diffText, oldText/newText, or diffs." };
  }

  if (modeCount === 0) {
    return { error: "Provide diffText, oldText/newText, or diffs." };
  }

  if (hasDiffText) {
    if (Buffer.byteLength(params.diffText!, "utf8") > MAX_INPUT_BYTES) {
      return { error: "Input exceeds 10MB limit." };
    }

    return { diffData: parseDiff(params.diffText!) };
  }

  if (hasDiffs) {
    const totalBytes = params.diffs!.reduce(
      (sum, d) => sum + Buffer.byteLength(d.oldText, "utf8") + Buffer.byteLength(d.newText, "utf8"), 0,
    );

    if (totalBytes > MAX_INPUT_BYTES) {
      return { error: "Input exceeds 10MB limit." };
    }

    const diffData = mergeDiffs(params.diffs!, {
      contextLines: params.contextLines ?? 3,
    });

    if (diffData.entries.length === 0) {
      return { error: "No changes detected." };
    }

    return { diffData };
  }

  const oldSize = Buffer.byteLength(params.oldText!, "utf8");
  const newSize = Buffer.byteLength(params.newText!, "utf8");

  if (oldSize + newSize > MAX_INPUT_BYTES) {
    return { error: "Input exceeds 10MB limit." };
  }

  const diffData = buildDiff(params.oldText!, params.newText!, {
    contextLines: params.contextLines ?? 3,
  });

  if (diffData.entries.length === 0) {
    return { error: "No changes detected." };
  }

  return { diffData };
}
