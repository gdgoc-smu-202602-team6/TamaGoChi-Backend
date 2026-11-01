import { AppConfig } from './app-config.js';

const valid = {};

describe('AppConfig.fromEnv', () => {
  it('값이 맞으면 모든 값을 담는다', () => {
    const config = AppConfig.fromEnv({
      ...valid,
      PORT: '4000',
      NODE_ENV: 'production',
    });

    expect({ port: config.port, production: config.production }).toEqual({
      port: 4000,
      production: true,
    });
  });

  it('PORT가 없으면 3000을 쓴다', () => {
    expect(AppConfig.fromEnv(valid).port).toBe(3000);
  });

  it('PORT가 65536이면 실패한다', () => {
    expect(() => AppConfig.fromEnv({ ...valid, PORT: '65536' })).toThrow(
      /PORT/,
    );
  });
});
