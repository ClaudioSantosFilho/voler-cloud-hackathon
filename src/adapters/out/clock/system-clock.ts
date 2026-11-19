import type { Clock } from '../../../application/ports/out/clock.js';

export const systemClock: Clock = { now: () => new Date() };
