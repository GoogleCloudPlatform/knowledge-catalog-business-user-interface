/**
 * @file schema.ts
 * @description Extracts column paths from a catalog entry's schema aspect.
 */
import type { CatalogEntryLike } from '../types';

interface SchemaFieldValue {
  structValue?: {
    fields?: {
      name?: { stringValue?: string };
      fields?: { listValue?: { values?: SchemaFieldValue[] } };
    };
  };
}

/** Top-level (and nested RECORD) column paths from the entry's schema aspect. */
export const getSchemaColumns = (entry: CatalogEntryLike | null | undefined): string[] => {
  const number = entry?.entryType?.split('/')[1];
  const aspect = entry?.aspects?.[`${number}.global.schema`] as
    | { data?: { fields?: { fields?: { listValue?: { values?: SchemaFieldValue[] } } } } }
    | undefined;
  const fields = aspect?.data?.fields?.fields?.listValue?.values || [];
  const out: string[] = [];
  const walk = (values: SchemaFieldValue[], prefix: string) => {
    values.forEach((f) => {
      const name = f?.structValue?.fields?.name?.stringValue;
      if (!name) return;
      const path = prefix ? `${prefix}.${name}` : name;
      out.push(path);
      const nested = f?.structValue?.fields?.fields?.listValue?.values;
      if (Array.isArray(nested) && nested.length) walk(nested, path);
    });
  };
  walk(fields, '');
  return out;
};
