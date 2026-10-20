import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '../lib/auth/redirect';

describe('safeRedirectPath', () => {
  it('rejects every off-origin form', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/');
    expect(safeRedirectPath('/\t/evil.com')).toBe('/');
    expect(safeRedirectPath('/\n/evil.com')).toBe('/');
    expect(safeRedirectPath('//evil.com')).toBe('/');
    expect(safeRedirectPath('https://evil.com')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
    expect(safeRedirectPath(null)).toBe('/');
  });

  it('keeps a local path with its query and hash', () => {
    expect(safeRedirectPath('/ok/path?x=1#h')).toBe('/ok/path?x=1#h');
    expect(safeRedirectPath('/')).toBe('/');
  });
});
