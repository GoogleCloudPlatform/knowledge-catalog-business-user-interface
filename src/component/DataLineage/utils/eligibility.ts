/**
 * @file eligibility.ts
 * @description Decides whether an entry should show the "Data Lineage" tab.
 */
import { getEntryType } from '../../../utils/resourceUtils';
import { isKnownLineageSystem } from './fqn';
import type { CatalogEntryLike } from '../types';

type MaybeEntry = CatalogEntryLike | null | undefined;

const isGlossaryEntry = (entry: MaybeEntry): boolean => {
  const entryType: string = entry?.entryType || '';
  return /glossary|glossary-term|glossary-category/i.test(entryType)
    || /\/glossaries\//.test(entry?.name || '');
};

/**
 * An entry supports Data Lineage when it has a fully qualified name whose
 * system prefix is registered (BigQuery, GCS, Pub/Sub, Spanner, Cloud SQL,
 * Looker, Vertex AI, ...), and it is not a glossary item or BigQuery dataset.
 */
export const isDataLineageSupported = (entry: MaybeEntry): boolean => {
  if (!entry?.fullyQualifiedName || !entry?.name) return false;
  if (isGlossaryEntry(entry)) return false;
  if (getEntryType(entry.name, '/') === 'Datasets') return false;
  return isKnownLineageSystem(entry.fullyQualifiedName);
};

/** projects/{p}/locations/{l} for the entry (used as the API parent). */
export const getLineageParent = (entry: MaybeEntry): string =>
  (entry?.name || '').split('/').slice(0, 4).join('/');

export const getEntryLocation = (entry: MaybeEntry): string => (entry?.name || '').split('/')[3] || 'global';
