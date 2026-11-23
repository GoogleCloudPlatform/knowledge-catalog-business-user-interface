import { describe, it, expect } from 'vitest';
import { extractAspectFieldValue, normalizeEnumValues } from './aspectValueUtils';

describe('extractAspectFieldValue', () => {
  it('returns undefined for missing/empty aspects', () => {
    expect(extractAspectFieldValue(undefined, 'sensitivity', 'level')).toBeUndefined();
    expect(extractAspectFieldValue(null, 'sensitivity', 'level')).toBeUndefined();
    expect(extractAspectFieldValue({}, 'sensitivity', 'level')).toBeUndefined();
  });

  it('reads a field when data is plain JSON (no .fields wrapper)', () => {
    const aspects = {
      '123456.global.sensitivity': {
        data: { level: 'HIGH' },
      },
    };
    expect(extractAspectFieldValue(aspects, 'sensitivity', 'level')).toBe('HIGH');
  });

  it('reads a field when data is a protobuf Struct (.fields of kind-tagged Values)', () => {
    const aspects = {
      '123456.global.sensitivity': {
        data: {
          fields: {
            level: { kind: 'stringValue', stringValue: 'HIGH' },
          },
        },
      },
    };
    expect(extractAspectFieldValue(aspects, 'sensitivity', 'level')).toBe('HIGH');
  });

  it('matches the aspect by key suffix across different project prefixes', () => {
    const aspects = {
      '999999.us.sensitivity': {
        data: { level: 'LOW' },
      },
    };
    expect(extractAspectFieldValue(aspects, 'sensitivity', 'level')).toBe('LOW');
  });

  it('matches the aspect by its own aspectType resource name when the key does not end in the id', () => {
    const aspects = {
      'some-odd-key': {
        aspectType: 'projects/123/locations/global/aspectTypes/sensitivity',
        data: { level: 'MEDIUM' },
      },
    };
    expect(extractAspectFieldValue(aspects, 'sensitivity', 'level')).toBe('MEDIUM');
  });

  it('returns undefined when the entry does not carry the requested aspect', () => {
    const aspects = {
      '123456.global.other-aspect': { data: { foo: 'bar' } },
    };
    expect(extractAspectFieldValue(aspects, 'sensitivity', 'level')).toBeUndefined();
  });

  it('returns undefined when the aspect is present but the field is not', () => {
    const aspects = {
      '123456.global.sensitivity': { data: { otherField: 'x' } },
    };
    expect(extractAspectFieldValue(aspects, 'sensitivity', 'level')).toBeUndefined();
  });
});

describe('normalizeEnumValues', () => {
  it('returns undefined for non-arrays and empty arrays', () => {
    expect(normalizeEnumValues(undefined)).toBeUndefined();
    expect(normalizeEnumValues(null)).toBeUndefined();
    expect(normalizeEnumValues('not-an-array')).toBeUndefined();
    expect(normalizeEnumValues([])).toBeUndefined();
  });

  it('passes bare strings through unchanged', () => {
    expect(normalizeEnumValues(['HIGH', 'MEDIUM', 'LOW'])).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });

  it('extracts .name from Dataplex-shaped enum value objects', () => {
    expect(normalizeEnumValues([
      { name: 'HIGH', index: 0, deprecated: false },
      { name: 'LOW', index: 1, deprecated: false },
    ])).toEqual(['HIGH', 'LOW']);
  });

  it('handles a mix of bare strings and objects', () => {
    expect(normalizeEnumValues(['active', 'inactive', { name: 'pending' }])).toEqual([
      'active', 'inactive', 'pending',
    ]);
  });

  it('falls back to .value or .label when .name is absent', () => {
    expect(normalizeEnumValues([{ value: 'HIGH' }])).toEqual(['HIGH']);
    expect(normalizeEnumValues([{ label: 'HIGH' }])).toEqual(['HIGH']);
  });
});
