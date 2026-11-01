/** Fails at startup with every problem a config found in the environment variables it reads. */
export function assertEnvironment(problems: readonly string[]): void {
  if (problems.length > 0) {
    throw new Error(`Invalid environment: ${problems.join('; ')}`);
  }
}
