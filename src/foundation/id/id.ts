declare const kind: unique symbol;

/**
 * The identifier of one `K`, named as the contract's schema names the resource (`Id<'Club'>`, `Id<'Member'>`). A
 * string at run time; an id of another kind does not pass for it, so a member's id cannot go where a user's goes.
 */
export type Id<K extends string> = string & { readonly [kind]: K };

/**
 * `value` as the id of a `K`, where something already vouches for it: a row read back, or the contract's validation.
 * A null (a reference that is gone) or an undefined (a field not sent) stays as it is.
 */
export function asId<K extends string>(value: string): Id<K>;
export function asId<K extends string>(value: string | null): Id<K> | null;
export function asId<K extends string>(
  value: string | undefined,
): Id<K> | undefined;
export function asId<K extends string>(
  value: string | null | undefined,
): Id<K> | null | undefined;
export function asId<K extends string>(
  value: string | null | undefined,
): Id<K> | null | undefined {
  return value as Id<K> | null | undefined;
}
