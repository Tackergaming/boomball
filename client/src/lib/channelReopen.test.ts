import { describe, expect, it } from 'vitest';

import { REOPEN_LIMIT, isAuthorisationRefusal, shouldReopen } from './channelReopen.js';

describe('reopening a closed lobby channel (2H.37, m4)', () => {
  it('retries a plain closure, up to the limit', () => {
    for (let attempts = 0; attempts < REOPEN_LIMIT; attempts += 1) {
      expect(shouldReopen(attempts, undefined)).toBe(true);
      expect(shouldReopen(attempts, new Error('socket closed: 1006'))).toBe(true);
    }
    expect(shouldReopen(REOPEN_LIMIT, undefined)).toBe(false);
    expect(shouldReopen(REOPEN_LIMIT + 3, new Error('timeout'))).toBe(false);
  });

  it('never retries a refusal of authorisation, however it is worded', () => {
    const refusals = [
      new Error('Unauthorized: You do not have permissions to read from this Channel topic: lobby:abc'),
      new Error('You do not have permissions to read from this Channel topic'),
      'unauthorised',
      new Error('Forbidden'),
      new Error('join not allowed'),
    ];
    for (const refusal of refusals) {
      expect(isAuthorisationRefusal(refusal)).toBe(true);
      expect(shouldReopen(0, refusal)).toBe(false);
    }
  });

  it('reads anything else as a closure worth retrying', () => {
    expect(isAuthorisationRefusal(undefined)).toBe(false);
    expect(isAuthorisationRefusal(null)).toBe(false);
    expect(isAuthorisationRefusal(new Error('Client presence rate limit exceeded'))).toBe(false);
    expect(isAuthorisationRefusal({ code: 1006 })).toBe(false);
  });
});
