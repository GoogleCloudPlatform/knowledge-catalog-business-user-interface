/**
 * @file aspectValueUtils.ts
 * @summary Reads a single aspect field's value out of an entry's `aspects`
 * map, keyed by aspect type id rather than the full
 * `{projectNumber}.{location}.{aspectTypeId}` key (which varies per entry's
 * owning project). Used to populate the "Aspect Value" column on the Browse
 * by Annotations Linked Assets table.
 */

import { normalizeAspectValue } from '../component/DataQuality/aspectScorecard';

interface AspectMapEntry {
  aspectType?: string;
  // `data` arrives either as plain JSON (fields directly on `data`) or as a
  // protobuf Struct (`data.fields` holding Value/`kind`-tagged entries).
  data?: { fields?: Record<string, unknown> } | Record<string, unknown>;
}

/**
 * Finds the aspect (if any) on `aspects` whose type matches `aspectTypeId`
 * (by key suffix or by its own `aspectType` resource name), then returns
 * `fieldName`'s value normalized to plain JS. Returns `undefined` if the
 * entry doesn't carry this aspect, or the field isn't set.
 */
export const extractAspectFieldValue = (
  aspects: Record<string, AspectMapEntry> | null | undefined,
  aspectTypeId: string,
  fieldName: string
): unknown => {
  if (!aspects || typeof aspects !== 'object' || !aspectTypeId || !fieldName) return undefined;

  const key = Object.keys(aspects).find((k) => {
    if (k.endsWith(`.${aspectTypeId}`)) return true;
    const aspectType = aspects[k]?.aspectType;
    return typeof aspectType === 'string' && aspectType.split('/').pop() === aspectTypeId;
  });
  if (!key) return undefined;

  const rawData = aspects[key]?.data;
  if (!rawData) return undefined;

  // Aspect field values arrive either as plain JSON (`data` itself holding
  // the fields) or as a protobuf Struct (`data.fields` holding Value/`kind`
  // -tagged entries) - same ambiguity `extractDataQualityScorecard` handles,
  // so normalize whichever shape is present before picking the field out.
  const fieldsToNormalize = rawData.fields || rawData;
  const normalized = normalizeAspectValue(fieldsToNormalize);

  if (!normalized || typeof normalized !== 'object' || !(fieldName in normalized)) return undefined;
  return normalized[fieldName];
};

/**
 * Formats an extracted aspect value for display - shared between the
 * "Aspect Value" table column (SearchTableView) and card chip
 * (SearchEntriesCard) so both render identically.
 */
export const formatAspectValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);

  // Some aspect fields hold rich text (HTML, e.g. a description field) - a
  // table cell / chip is a single-line plain-text display, so strip markup
  // rather than showing raw tags like "<p>...".
  const stripped = String(value).replace(/<[^>]*>/g, '').trim();
  return stripped || '—';
};

/**
 * Normalizes a Dataplex aspect-type field's raw `enumValues` into a plain
 * string list. Dataplex returns enum values as `{name, index, deprecated}`
 * objects (same tolerant parsing already used in `FilterDropDown.tsx`'s
 * sub-annotations panel, extracted here as a shared, independent utility -
 * that file is left untouched by this extraction), but older/mocked data may
 * hand back bare strings, so both shapes are handled.
 */
export const normalizeEnumValues = (rawEnumValues: unknown): string[] | undefined => {
  if (!Array.isArray(rawEnumValues) || rawEnumValues.length === 0) return undefined;

  return rawEnumValues.map((val: unknown) => {
    if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, unknown>;
      return (obj.name || obj.value || obj.label || JSON.stringify(obj)) as string;
    }
    return String(val);
  });
};
