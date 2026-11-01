/** How many liked a room, and whether the viewer did. */
export interface LikeTally {
  readonly count: number;
  readonly likedByViewer: boolean;
}
