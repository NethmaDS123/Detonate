import { DIFFICULTIES, type Difficulty } from "@detonate/engine";

export const DIFFICULTY_LIST: Difficulty[] = Object.values(DIFFICULTIES);

export function resolveDifficulty(value: string | string[] | undefined): Difficulty {
  const id = Array.isArray(value) ? value[0] : value;
  return (id && DIFFICULTIES[id]) || DIFFICULTIES.beginner;
}
