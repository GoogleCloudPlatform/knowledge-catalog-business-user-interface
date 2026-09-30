/**
 * @file aspectScorecard.ts
 * @summary Extracts a Data Quality scorecard from an entry's
 * `dataplex-types.global.data-quality-scorecard` aspect, for use as a
 * fallback when the live Data Quality scan API returns no data.
 *
 * @description
 * The Data Quality tab is normally populated from a Dataplex DATA_QUALITY
 * scan (see `DataQuality.tsx`). Some entries instead (or additionally) carry
 * a `data-quality-scorecard` aspect with a self-contained summary:
 * `{ score, status, dimensions: [{name, score, status}], columns: [{name, score, status}] }`.
 *
 * Aspect field values on `entry.aspects[key].data` can arrive either as
 * plain JSON or as protobuf `Value`/`kind`-tagged objects (the same two
 * shapes handled generically in `PreviewAnnotation.tsx`). `normalizeAspectValue`
 * unwraps the latter into plain JS so both shapes are handled uniformly.
 */

export interface DataQualityScorecardDimension {
  name: string;
  score: number;
  status: string;
}

export interface DataQualityScorecardColumn {
  name: string;
  score: number;
  status: string;
}

export interface DataQualityScorecardData {
  score: number;
  status: string;
  dimensions: DataQualityScorecardDimension[];
  columns: DataQualityScorecardColumn[];
}

/**
 * Recursively unwraps protobuf `Value`/`kind`-tagged objects
 * (`{kind: 'numberValue', numberValue: 0.8}`, `structValue.fields`,
 * `listValue.values`) into plain JS values. Plain JSON values are returned
 * as-is (after recursing into nested objects/arrays), so this is safe to
 * call regardless of which shape the backend returns.
 */
export const normalizeAspectValue = (value: any): any => {
  if (value === null || value === undefined) return value;

  if (typeof value === 'object' && 'kind' in value) {
    switch (value.kind) {
      case 'stringValue':
        return value.stringValue;
      case 'numberValue':
        return value.numberValue;
      case 'boolValue':
        return value.boolValue;
      case 'listValue':
        return (value.listValue?.values || []).map(normalizeAspectValue);
      case 'structValue': {
        const fields = value.structValue?.fields || {};
        return Object.keys(fields).reduce((acc: Record<string, any>, key) => {
          acc[key] = normalizeAspectValue(fields[key]);
          return acc;
        }, {});
      }
      case 'nullValue':
        return null;
      default:
        return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map(normalizeAspectValue);
  }

  if (typeof value === 'object') {
    return Object.keys(value).reduce((acc: Record<string, any>, key) => {
      acc[key] = normalizeAspectValue(value[key]);
      return acc;
    }, {});
  }

  return value;
};

const isScorecardArray = (value: any): boolean =>
  value === undefined || Array.isArray(value);

/**
 * Validates that a normalized object matches the minimal expected
 * scorecard shape: numeric `score`, string `status`, and `dimensions`/
 * `columns` that are arrays when present.
 */
const isValidScorecardShape = (data: any): data is DataQualityScorecardData => {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof data.score === 'number' &&
    typeof data.status === 'string' &&
    isScorecardArray(data.dimensions) &&
    isScorecardArray(data.columns)
  );
};

/**
 * Finds and extracts a Data Quality scorecard from `entry.aspects`, looking
 * for an aspect keyed (or typed) `...data-quality-scorecard`. Returns `null`
 * if no such aspect exists, or its payload doesn't match the expected shape.
 */
export const extractDataQualityScorecard = (entry: any): DataQualityScorecardData | null => {
  const aspects = entry?.aspects;
  if (!aspects || typeof aspects !== 'object') return null;

  const scorecardKey = Object.keys(aspects).find((key) => {
    if (key.endsWith('.data-quality-scorecard')) return true;
    const aspectType = aspects[key]?.aspectType;
    return typeof aspectType === 'string' && aspectType.split('/').pop() === 'data-quality-scorecard';
  });
  if (!scorecardKey) return null;

  const rawData = aspects[scorecardKey]?.data;
  if (!rawData) return null;

  const fieldsToNormalize = rawData.fields || rawData;
  const normalized = normalizeAspectValue(fieldsToNormalize);

  return isValidScorecardShape(normalized) ? normalized : null;
};

/**
 * Adapts a `DataQualityScorecardData` (from the aspect) into the same
 * `{ scan: { dataQualityResult: {...} } }` shape that `DataQualityStatus.tsx`
 * and `CurrentRules.tsx` already consume for a real DATA_QUALITY scan, so the
 * Data Quality tab's fallback UI can reuse those two components as-is
 * instead of a separate, differently-styled view.
 *
 * - `score` values (scorecard, dimensions, columns) are consumed as-is: the
 *   scorecard aspect already stores them on the same 0-100 scale real scan
 *   scores use (`DataQualityStatus.tsx` doesn't multiply). Do NOT multiply
 *   by 100 here — that previously double-scaled values like `93.72` into
 *   `9372`.
 * - `dimensions` matches the `{dimension:{name}, score, passed}` shape read
 *   by `DataQualityStatus.tsx`'s `getDimensionScore`.
 * - `columns` has no equivalent in a real scan result — it's a new field,
 *   consumed by `CurrentRules.tsx`'s `columnScores` mode and by
 *   `DataQualityStatus.tsx`'s passed-count generalization. No `rules` array
 *   is produced, since the scorecard aspect carries no per-rule detail.
 */
export const adaptScorecardToScanShape = (scorecard: DataQualityScorecardData) => ({
  scan: {
    dataQualityResult: {
      score: scorecard.score,
      dimensions: (scorecard.dimensions || []).map((d) => ({
        dimension: { name: d.name?.toUpperCase() },
        score: d.score,
        passed: d.status?.toUpperCase() === 'PASS',
      })),
      columns: (scorecard.columns || []).map((c) => ({
        name: c.name,
        score: c.score,
        status: c.status,
      })),
    },
  },
});
