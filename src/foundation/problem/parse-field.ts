import { BadRequest } from './problems/bad-request.js';

/**
 * Runs a value object's parser. A RangeError (the value breaks the type's rule) becomes the 400 that `badRequest`
 * makes from its message, so each boundary answers in its own form.
 */
export function parseOrBadRequest<T>(
  parse: () => T,
  badRequest: (message: string) => Error,
): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof RangeError) throw badRequest(error.message);
    throw error;
  }
}

/** Runs a value object's parser on one request field; a broken rule is a 400 naming the field, e.g. `/body/nickname`. */
export function parseField<T>(field: string, parse: () => T): T {
  return parseOrBadRequest(
    parse,
    (message) => new BadRequest([{ field, message }]),
  );
}
