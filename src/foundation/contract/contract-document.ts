import document from './openapi.json' with { type: 'json' };

type SchemaObject = {
  pattern?: string;
  properties?: Record<
    string,
    { maximum?: number; default?: unknown; const?: unknown }
  >;
};

const schemas = document.components.schemas as Record<string, SchemaObject>;

/** The `pattern` of a contract schema, e.g. `InviteCode` (the contract is the one place a format is stated). */
export function contractPattern(schema: string): string {
  const pattern = schemas[schema]?.pattern;
  if (!pattern) throw new Error(`the contract has no pattern for ${schema}`);
  return pattern;
}

/** A number the contract states for one property of a schema, e.g. the `maximum` of `RoomCondition.hearts`. */
export function contractNumber(
  schema: string,
  property: string,
  keyword: 'maximum' | 'default' | 'const',
): number {
  const value = schemas[schema]?.properties?.[property]?.[keyword];
  if (typeof value !== 'number')
    throw new Error(`the contract has no ${keyword} for ${schema}.${property}`);
  return value;
}
