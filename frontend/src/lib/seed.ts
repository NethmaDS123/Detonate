const MAX_SEED = 0xffff_ffff;

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
}

export function parseSeedParam(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SEED) {
    return undefined;
  }
  return parsed;
}
