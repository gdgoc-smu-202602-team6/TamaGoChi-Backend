const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' });

/** How many characters a person sees in the text: grapheme clusters, so an emoji is one. */
export function textLength(text: string): number {
  let count = 0;
  for (const _ of segmenter.segment(text)) count += 1;
  return count;
}

/** Trims the text and checks its length in grapheme clusters; throws RangeError naming `label` otherwise. */
export function trimmedWithin(
  text: string,
  min: number,
  max: number,
  label: string,
): string {
  const value = text.trim();
  const length = textLength(value);
  if (length < min || length > max)
    throw new RangeError(`${label} must be ${min} to ${max} characters`);
  return value;
}
