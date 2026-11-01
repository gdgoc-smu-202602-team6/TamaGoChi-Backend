import document from './openapi.json' with { type: 'json' };

/** The `pattern` of a contract schema, e.g. `InviteCode` (the contract is the one place a format is stated). */
export function contractPattern(schema: string): string {
  const pattern = (
    document.components.schemas as Record<string, { pattern?: string }>
  )[schema]?.pattern;
  if (!pattern) throw new Error(`the contract has no pattern for ${schema}`);
  return pattern;
}
