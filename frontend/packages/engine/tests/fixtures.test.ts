import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Game } from "../src/game";
import { XorShift32 } from "../src/rng";
import type { Event } from "../src/types";

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function load(name: string) {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), "utf8"));
}

describe("golden fixtures from Python", () => {
  it("matches rng-42", () => {
    const fixture = load("rng-42.json");
    const rng = new XorShift32(fixture.seed);
    const values = Array.from({ length: fixture.values.length }, () => rng.nextU32());
    expect(values).toEqual(fixture.values);
  });

  it.each([
    "beginner-seed-7-open.json",
    "beginner-seed-99-flag-then-clear-attempt.json",
    "beginner-seed-3-full-clear.json",
  ])("replays %s", (name) => {
    const fixture = load(name);
    const game = new Game(fixture.width, fixture.height, fixture.mines, fixture.seed);
    for (const event of fixture.events as Event[]) {
      game.apply(event);
    }
    const snap = game.snapshot();
    expect(snap.status).toBe(fixture.status);
    expect(snap.minePositions).toEqual(fixture.minePositions);
    expect(snap.revealed).toEqual(fixture.revealed);
    expect(snap.flagged).toEqual(fixture.flagged);
    expect(snap.adjacent).toEqual(fixture.adjacent);
    expect(snap.isMine).toEqual(fixture.isMine);
  });
});
