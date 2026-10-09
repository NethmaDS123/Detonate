/** Portable xorshift32. Must match packages/engine/src/detonate_engine/rng.py exactly. */

export class XorShift32 {
  private state: number;

  constructor(seed: number) {
    const s = seed >>> 0;
    this.state = s === 0 ? 2463534242 : s;
  }

  nextU32(): number {
    let x = this.state;
    x = (x ^ ((x << 13) >>> 0)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ ((x << 5) >>> 0)) >>> 0;
    this.state = x;
    return x;
  }

  randInt(n: number): number {
    if (n <= 0) {
      throw new Error("n must be positive");
    }
    return this.nextU32() % n;
  }
}
