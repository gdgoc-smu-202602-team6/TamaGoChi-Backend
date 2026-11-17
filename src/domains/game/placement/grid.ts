/** The positions a placed thing can take along one axis (D-12~D-14): every `step` cells, or anywhere with none. */
export class Grid {
  constructor(
    /** The cells it moves by; null moves freely. */
    readonly step: number | null,
  ) {}

  /** Whether the coordinate is on the grid. */
  holds(value: number): boolean {
    return this.step === null || Number.isInteger(value / this.step);
  }

  /** The largest coordinate on the grid that is not above `value`. */
  largestUpTo(value: number): number {
    return this.step === null
      ? value
      : Math.floor(value / this.step) * this.step;
  }

  /** The nearest coordinate on the grid. */
  snap(value: number): number {
    return this.step === null
      ? value
      : Math.round(value / this.step) * this.step;
  }
}
