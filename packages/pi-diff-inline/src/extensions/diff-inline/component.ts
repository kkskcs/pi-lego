import type { DiffData } from "./types.js";
import { visibleWidth, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { renderDiff, type DiffRenderMode, type RendererTheme } from "./renderer.js";

export interface DiffInlineComponentOptions {
  diffData: DiffData;
  theme: RendererTheme;
  expanded: boolean;
  expandable?: boolean;
  mode: DiffRenderMode;
  label?: string;
}

export class DiffInlineComponent {

  private options: DiffInlineComponentOptions;
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(options: DiffInlineComponentOptions) {
    this.options = options;
  }

  update(options: DiffInlineComponentOptions): void {
    this.options = options;
    this.invalidate();
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;


    const lines: string[] = [];

    if (this.options.label) {
      const labelText = this.options.theme.fg("toolTitle", this.options.label);
      const vis = visibleWidth(labelText);

      if (vis <= width) {
        lines.push(labelText + " ".repeat(width - vis));
      } else {
        const wrapped = wrapTextWithAnsi(this.options.label, width);
        for (const line of wrapped) {
          lines.push(pad(this.options.theme.fg("toolTitle", line), width));
        }
      }
    }

    if (this.options.expandable && !this.options.expanded) {
      lines.push(this.renderSummary(width));
      this.cachedWidth = width;
      this.cachedLines = lines;
      return lines;
    }

    const result = renderDiff({
      diffData: this.options.diffData,
      width,
      mode: this.options.mode,
      theme: this.options.theme,
    });

    lines.push(...result.lines);

    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  private renderSummary(width: number): string {
    const { stats } = this.options.diffData;
    const summary = `↳ diff +${stats.added} -${stats.removed}`;
    return pad(this.options.theme.fg("dim", summary), width);
  }
}

function pad(text: string, width: number): string {
  const vis = visibleWidth(text);
  if (vis >= width) return truncateToWidth(text, width);
  return text + " ".repeat(width - vis);
}
