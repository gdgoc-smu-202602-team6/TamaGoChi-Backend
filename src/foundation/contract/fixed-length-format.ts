/**
 * A format of a fixed number of characters from one set, as a contract pattern `^[<set>]{<n>}$` states it
 * (`^[A-Z0-9]{8}$`). Knowing the set and the length, code can check a value and make new ones from the same fact.
 */
export class FixedLengthFormat {
  private constructor(
    readonly pattern: RegExp,
    /** Every character the set allows. */
    readonly alphabet: string,
    readonly length: number,
  ) {}

  /** Throws when the pattern is not of that shape. */
  static of(pattern: string): FixedLengthFormat {
    const shape = /^\^\[([^\]]+)\]\{(\d+)\}\$$/.exec(pattern);
    if (!shape) throw new Error(`not a fixed-length pattern: ${pattern}`);
    const [, set = '', count = '0'] = shape;
    let alphabet = '';
    for (let i = 0; i < set.length; i += 1) {
      if (set[i + 1] === '-' && i + 2 < set.length) {
        for (let c = set.charCodeAt(i); c <= set.charCodeAt(i + 2); c += 1)
          alphabet += String.fromCharCode(c);
        i += 2;
      } else alphabet += set[i];
    }
    return new FixedLengthFormat(new RegExp(pattern), alphabet, Number(count));
  }

  matches(value: string): boolean {
    return this.pattern.test(value);
  }
}
