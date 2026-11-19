import { describe, expect, it } from 'vitest';
import { SlidingWindowRateLimiter } from '../../../src/adapters/in/http/rate-limiter.js';

describe('SlidingWindowRateLimiter', () => {
  it('bloqueia acima do limite e libera quando a janela desliza', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter(2, 60_000, () => now);
    expect(limiter.hit('ip')).toBe(0);
    now = 30_000;
    expect(limiter.hit('ip')).toBe(0);
    expect(limiter.hit('ip')).toBe(30);
    expect(limiter.hit('outro-ip')).toBe(0);
    now = 60_001;
    expect(limiter.hit('ip')).toBe(0);
  });

  it('limita a quantidade de IPs guardados', () => {
    const limiter = new SlidingWindowRateLimiter(1, 60_000, () => 0, 2);
    limiter.hit('a');
    limiter.hit('b');
    limiter.hit('c');
    expect(limiter.hit('a')).toBe(0);
  });
});
