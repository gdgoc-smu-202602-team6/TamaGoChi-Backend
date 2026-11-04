/** A rectangle of cells on a surface: its corner nearest the surface's origin and its size. */
export class Rectangle {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly width: number,
    readonly height: number,
  ) {}

  /** Whether it lies wholly inside `outer`; sharing an edge is inside. */
  within(outer: Rectangle): boolean {
    return (
      this.x >= outer.x &&
      this.y >= outer.y &&
      this.x + this.width <= outer.x + outer.width &&
      this.y + this.height <= outer.y + outer.height
    );
  }

  /** Whether the two share some cells; only touching at an edge or a corner is not overlapping. */
  overlaps(other: Rectangle): boolean {
    return (
      this.x < other.x + other.width &&
      other.x < this.x + this.width &&
      this.y < other.y + other.height &&
      other.y < this.y + this.height
    );
  }
}
