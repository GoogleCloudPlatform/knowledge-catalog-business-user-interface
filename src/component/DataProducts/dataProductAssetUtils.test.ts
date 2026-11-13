import { describe, it, expect } from 'vitest';
import {
  buildFallbackAssetEntry,
  buildFqnSearchQueries,
  mergeAssetsWithSearchResults,
  resourcePath,
  resourceToFqn,
} from './dataProductAssetUtils';

describe('resourceToFqn', () => {
  it.each([
    ['//bigquery.googleapis.com/projects/p/datasets/d/tables/t', 'bigquery:p.d.t'],
    ['//bigquery.googleapis.com/projects/p/datasets/d', 'bigquery:p.d'],
    ['//bigquery.googleapis.com/projects/p/datasets/d/models/m', 'bigquery:p.d.m'],
    ['//bigquery.googleapis.com/projects/p/datasets/d/routines/r', 'bigquery:routine:p.d.r'],
    ['//storage.googleapis.com/projects/_/buckets/my-bucket', 'gcs:my-bucket'],
    ['//pubsub.googleapis.com/projects/p/topics/orders', 'pubsub:topic:p.orders'],
    ['//pubsub.googleapis.com/projects/p/subscriptions/s', 'pubsub:subscription:p.s'],
    ['//bigtable.googleapis.com/projects/p/instances/i/tables/t', 'bigtable:p.i.t'],
    ['//aiplatform.googleapis.com/projects/p/locations/us-central1/datasets/123', 'vertex_ai:dataset:p.us-central1.123'],
    ['//metastore.googleapis.com/projects/p/locations/us/services/s/databases/db/tables/t', 'dataproc_metastore:p.us.s.db.t'],
    // BigQuery resources may come without the //bigquery.googleapis.com prefix
    ['projects/p/datasets/d/tables/t', 'bigquery:p.d.t'],
    ['projects/p/datasets/d', 'bigquery:p.d'],
  ])('maps %s', (resource, fqn) => {
    expect(resourceToFqn(resource)).toBe(fqn);
  });

  it.each([
    'projects/p/topics/t', // no //service prefix and not a BigQuery path
    '//spanner.googleapis.com/projects/p/instances/i/databases/d', // needs instance config
    '//looker.googleapis.com/whatever',
    '',
  ])('returns null when the FQN cannot be derived (%s)', (resource) => {
    expect(resourceToFqn(resource)).toBeNull();
  });
});

describe('buildFqnSearchQueries', () => {
  it('builds batched, de-duplicated OR queries', () => {
    expect(buildFqnSearchQueries(['a', 'b', 'a'])).toEqual(['fully_qualified_name=(a | b)']);
    const many = Array.from({ length: 120 }, (_, i) => `bigquery:p.d.t${i}`);
    expect(buildFqnSearchQueries(many)).toHaveLength(3);
    expect(buildFqnSearchQueries([])).toEqual([]);
  });
});

describe('buildFallbackAssetEntry', () => {
  it('builds a search-result-shaped row from the API asset', () => {
    const row = buildFallbackAssetEntry({ resource: '//bigquery.googleapis.com/projects/p/datasets/d/tables/customer_hierarchy' });
    expect(row.dataplexEntry).toMatchObject({
      name: '//bigquery.googleapis.com/projects/p/datasets/d/tables/customer_hierarchy',
      fullyQualifiedName: 'bigquery:p.d.customer_hierarchy',
      entryType: 'entryTypes/bigquery-table',
      notInCatalog: true,
      entrySource: {
        displayName: 'customer_hierarchy',
        system: 'BigQuery',
        resource: 'projects/p/datasets/d/tables/customer_hierarchy',
      },
    });
  });

  it('handles unknown services and plain names', () => {
    expect(buildFallbackAssetEntry({ resource: '//spanner.googleapis.com/projects/p/instances/i/databases/sales' }).dataplexEntry)
      .toMatchObject({ entrySource: { displayName: 'sales', system: 'Spanner' }, entryType: 'entryTypes/spanner-database' });
    expect(buildFallbackAssetEntry({ name: 'projects/p/locations/l/dataProducts/dp/dataAssets/a1' }).dataplexEntry)
      .toMatchObject({ entrySource: { displayName: 'a1', location: 'l' } });
  });
});

describe('mergeAssetsWithSearchResults', () => {
  const found = {
    dataplexEntry: {
      name: 'projects/p/locations/us/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/p/datasets/d/tables/t1',
      fullyQualifiedName: 'bigquery:p.d.t1',
      entrySource: { resource: 'projects/p/datasets/d/tables/t1', displayName: 't1' },
    },
  };

  it('uses the catalog entry when found and a fallback row otherwise, keeping API order', () => {
    const rows = mergeAssetsWithSearchResults(
      [
        { resource: '//bigquery.googleapis.com/projects/p/datasets/d/tables/missing' },
        { resource: '//bigquery.googleapis.com/projects/p/datasets/d/tables/t1' },
      ],
      [found],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].dataplexEntry?.notInCatalog).toBe(true);
    expect(rows[1]).toBe(found);
  });

  it('matches by resource path when the FQN differs', () => {
    const rows = mergeAssetsWithSearchResults(
      [{ resource: '//bigquery.googleapis.com/projects/p/datasets/d/tables/t1' }],
      [{ dataplexEntry: { ...found.dataplexEntry, fullyQualifiedName: 'something-else' } }],
    );
    expect(rows[0].dataplexEntry?.notInCatalog).toBeUndefined();
  });

  it('shows every asset even when the search returned nothing (or failed)', () => {
    const rows = mergeAssetsWithSearchResults(
      [{ resource: '//storage.googleapis.com/projects/_/buckets/b' }, { resource: '//spanner.googleapis.com/projects/p/instances/i/databases/x' }],
      [],
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.dataplexEntry?.notInCatalog)).toBe(true);
  });

  it('does not list the same asset twice', () => {
    const asset = { resource: '//bigquery.googleapis.com/projects/p/datasets/d/tables/t1' };
    expect(mergeAssetsWithSearchResults([asset, { ...asset }], [found])).toHaveLength(1);
  });

  it('strips the service prefix for resource paths', () => {
    expect(resourcePath('//bigquery.googleapis.com/projects/p/datasets/d')).toBe('projects/p/datasets/d');
    expect(resourcePath('projects/p')).toBe('projects/p');
  });
});
