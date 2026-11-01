/** The positions a placed thing can take on the floor, along one axis (D-12). */
export interface FloorGrid {
  /** Whether the coordinate is on the grid. */
  holds(value: number): boolean;

  /** The nearest coordinate on the grid. */
  snap(value: number): number;
}
