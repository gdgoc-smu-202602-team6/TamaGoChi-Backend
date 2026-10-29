import { BadRequest } from './problems/bad-request.js';

/**
 * Runs a value object's parser on one request field. A RangeError (the value breaks the type's rule) becomes a
 * 400 naming the field, e.g. `/body/nickname`.
 */
export function parseField<T>(field: string, parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof RangeError)
      throw new BadRequest([{ field, message: error.message }]);
    throw error;
  }
}
