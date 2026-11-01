/** The `userIds` query of a batchGet (comma separated, or repeated), as a list; each may still be `me`. */
export function userIdsOf(query: string | string[] | undefined): string[] {
  return [query ?? []]
    .flat()
    .flatMap((one) => one.split(','))
    .filter((one) => one !== '');
}
