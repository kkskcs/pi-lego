export type Direction = "up" | "down" | "left" | "right";

export interface PlatformProvider {
  canSplit(): boolean;
  openFinder(cwd: string): Promise<void>;
  openTerminal(cwd: string): Promise<void>;
  split(direction: Direction, cwd: string): Promise<void>;
}

export type Action = {
  id: string;
  label: string;
  exec: (cwd: string) => Promise<void>;
};
