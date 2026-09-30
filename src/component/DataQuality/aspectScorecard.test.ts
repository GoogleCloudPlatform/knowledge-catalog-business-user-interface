import { describe, it, expect } from 'vitest';
import {
  adaptScorecardToScanShape,
  extractDataQualityScorecard,
  normalizeAspectValue,
  type DataQualityScorecardData,
} from './aspectScorecard';

describe('adaptScorecardToScanShape', () => {
  it('passes real-world 0-100 scores through unchanged (no double-scaling)', () => {
    const scorecard: DataQualityScorecardData = {
      score: 93.72,
      status: 'PASS',
      dimensions: [
        { name: 'validity', score: 99.99, status: 'PASS' },
        { name: 'uniqueness', score: 99.70, status: 'PASS' },
        { name: 'completeness', score: 100, status: 'PASS' },
      ],
      columns: [
        { name: 'capturedate', score: 100, status: 'PASS' },
      ],
    };

    const adapted = adaptScorecardToScanShape(scorecard);

    expect(adapted.scan.dataQualityResult.score).toBe(93.72);
    expect(adapted.scan.dataQualityResult.dimensions).toEqual([
      { dimension: { name: 'VALIDITY' }, score: 99.99, passed: true },
      { dimension: { name: 'UNIQUENESS' }, score: 99.70, passed: true },
      { dimension: { name: 'COMPLETENESS' }, score: 100, passed: true },
    ]);
    expect(adapted.scan.dataQualityResult.columns).toEqual([
      { name: 'capturedate', score: 100, status: 'PASS' },
    ]);
  });

  it('handles empty dimensions/columns', () => {
    const scorecard: DataQualityScorecardData = {
      score: 0,
      status: 'FAIL',
      dimensions: [],
      columns: [],
    };

    const adapted = adaptScorecardToScanShape(scorecard);

    expect(adapted.scan.dataQualityResult.score).toBe(0);
    expect(adapted.scan.dataQualityResult.dimensions).toEqual([]);
    expect(adapted.scan.dataQualityResult.columns).toEqual([]);
  });
});

describe('extractDataQualityScorecard', () => {
  it('extracts a plain-JSON scorecard aspect keyed by suffix', () => {
    const entry = {
      aspects: {
        'projectId.location.data-quality-scorecard': {
          data: {
            score: 93.72,
            status: 'PASS',
            dimensions: [{ name: 'validity', score: 99.99, status: 'PASS' }],
            columns: [{ name: 'capturedate', score: 100, status: 'PASS' }],
          },
        },
      },
    };

    const scorecard = extractDataQualityScorecard(entry);

    expect(scorecard).toEqual({
      score: 93.72,
      status: 'PASS',
      dimensions: [{ name: 'validity', score: 99.99, status: 'PASS' }],
      columns: [{ name: 'capturedate', score: 100, status: 'PASS' }],
    });
  });

  it('returns null when no scorecard aspect exists', () => {
    expect(extractDataQualityScorecard({ aspects: {} })).toBeNull();
    expect(extractDataQualityScorecard({})).toBeNull();
    expect(extractDataQualityScorecard(null)).toBeNull();
  });

  it('returns null when the payload does not match the expected shape', () => {
    const entry = {
      aspects: {
        'x.data-quality-scorecard': { data: { status: 'PASS' } }, // missing numeric score
      },
    };

    expect(extractDataQualityScorecard(entry)).toBeNull();
  });
});

describe('normalizeAspectValue', () => {
  it('unwraps protobuf Value/kind-tagged numbers, structs and lists', () => {
    const raw = {
      kind: 'structValue',
      structValue: {
        fields: {
          score: { kind: 'numberValue', numberValue: 93.72 },
          status: { kind: 'stringValue', stringValue: 'PASS' },
          dimensions: {
            kind: 'listValue',
            listValue: {
              values: [
                {
                  kind: 'structValue',
                  structValue: {
                    fields: {
                      name: { kind: 'stringValue', stringValue: 'validity' },
                      score: { kind: 'numberValue', numberValue: 99.99 },
                      status: { kind: 'stringValue', stringValue: 'PASS' },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    expect(normalizeAspectValue(raw)).toEqual({
      score: 93.72,
      status: 'PASS',
      dimensions: [{ name: 'validity', score: 99.99, status: 'PASS' }],
    });
  });

  it('passes plain JSON through unchanged', () => {
    const plain = { score: 93.72, dimensions: [{ name: 'validity', score: 99.99 }] };
    expect(normalizeAspectValue(plain)).toEqual(plain);
  });
});
