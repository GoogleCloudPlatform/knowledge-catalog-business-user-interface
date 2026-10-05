import { describe, it, expect } from 'vitest';
import { resolveProjectDisplayNameOrFallback } from './resourceUtils';

describe('resolveProjectDisplayNameOrFallback', () => {
  const projectsList = [
    { projectId: 'my-project-id', name: 'projects/123456789' },
  ];

  it('returns the resolved project id when a match is found', () => {
    expect(resolveProjectDisplayNameOrFallback('123456789', projectsList, false)).toBe('my-project-id');
    expect(resolveProjectDisplayNameOrFallback('123456789', projectsList, true)).toBe('my-project-id');
  });

  it('returns an empty string (not the raw number) while projects are still loading and unresolved', () => {
    expect(resolveProjectDisplayNameOrFallback('999999999', projectsList, false)).toBe('');
    expect(resolveProjectDisplayNameOrFallback('999999999', [], false)).toBe('');
  });

  it('falls back to the raw project number once projects have loaded and there is genuinely no match', () => {
    expect(resolveProjectDisplayNameOrFallback('999999999', projectsList, true)).toBe('999999999');
    expect(resolveProjectDisplayNameOrFallback('999999999', [], true)).toBe('999999999');
  });

  it('returns an empty string when there is no project number', () => {
    expect(resolveProjectDisplayNameOrFallback('', projectsList, true)).toBe('');
  });
});
