export type Status = "ready" | "in_progress" | "won" | "lost";

export type EventType = "reveal" | "flag" | "chord";

export type Event = {
  type: EventType;
  x: number;
  y: number;
};

export type Cell = {
  isMine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};

export type Difficulty = {
  id: string;
  label: string;
  width: number;
  height: number;
  mines: number;
};

export const DIFFICULTIES: Record<string, Difficulty> = {
  beginner: { id: "beginner", label: "Beginner", width: 9, height: 9, mines: 10 },
  intermediate: {
    id: "intermediate",
    label: "Intermediate",
    width: 16,
    height: 16,
    mines: 40,
  },
  expert: { id: "expert", label: "Expert", width: 30, height: 16, mines: 99 },
};
