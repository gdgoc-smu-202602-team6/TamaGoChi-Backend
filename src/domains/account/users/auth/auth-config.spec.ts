import { AuthConfig } from './auth-config.js';

const valid = {
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  PUBLIC_URL: 'http://localhost:3000',
};

describe('AuthConfig.fromEnv', () => {
  it('값이 맞으면 모든 값을 담는다', () => {
    const config = AuthConfig.fromEnv(valid);

    expect({ secret: config.secret, publicUrl: config.publicUrl }).toEqual({
      secret: valid.BETTER_AUTH_SECRET,
      publicUrl: valid.PUBLIC_URL,
    });
  });

  it('BETTER_AUTH_SECRET이 31자이면 실패한다', () => {
    expect(() =>
      AuthConfig.fromEnv({ ...valid, BETTER_AUTH_SECRET: 'x'.repeat(31) }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('PUBLIC_URL이 URL이 아니면 실패한다', () => {
    expect(() =>
      AuthConfig.fromEnv({ ...valid, PUBLIC_URL: 'localhost' }),
    ).toThrow(/PUBLIC_URL/);
  });
});
