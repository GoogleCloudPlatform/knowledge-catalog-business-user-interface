import { describe, it, expect } from 'vitest';
import { parseFqn, splitSegments, isKnownLineageSystem, formatFieldPath, SYSTEM_REGISTRY } from './fqn';

describe('splitSegments', () => {
  it('splits on dots', () => {
    expect(splitSegments('p.d.t')).toEqual(['p', 'd', 't']);
  });
  it('respects backtick-quoted segments and escaped backticks', () => {
    expect(splitSegments('bucket.`path/with.dots/file.csv`')).toEqual(['bucket', 'path/with.dots/file.csv']);
    expect(splitSegments('a.`we``ird`')).toEqual(['a', 'we`ird']);
  });
});

describe('parseFqn', () => {
  it.each([
    ['bigquery:proj.ds.tbl', 'BigQuery', 'Table', 'tbl', 'proj'],
    ['bigquery:proj.ds', 'BigQuery', 'Dataset', 'ds', 'proj'],
    ['bigquery:sharded:proj.ds.events_', 'BigQuery', 'Sharded table', 'events_', 'proj'],
    ['bigquery:routine:proj.ds.fn', 'BigQuery', 'Routine', 'fn', 'proj'],
    ['bigquery:connection:proj.us.conn', 'BigQuery', 'Connection', 'conn', 'proj'],
    ['gcs:my-bucket', 'Cloud Storage', 'Bucket', 'my-bucket', undefined],
    ['gcs:my-bucket.`raw/2024/data.csv`', 'Cloud Storage', 'Path', 'data.csv', undefined],
    ['pubsub:topic:proj.orders', 'Pub/Sub', 'Topic', 'orders', 'proj'],
    ['pubsub:subscription:proj.orders-sub', 'Pub/Sub', 'Subscription', 'orders-sub', 'proj'],
    ['spanner:proj.regional-us.inst.db.tbl', 'Spanner', 'Table', 'tbl', 'proj'],
    ['cloudsql_mysql:proj.us-central1.inst.schema.tbl', 'Cloud SQL (MySQL)', 'Table', 'tbl', 'proj'],
    ['cloudsql_postgresql:proj.us-central1.inst.db.public.tbl', 'Cloud SQL (PostgreSQL)', 'Table', 'tbl', 'proj'],
    ['bigtable:proj.inst.tbl', 'Bigtable', 'Table', 'tbl', 'proj'],
    ['looker:dashboard:inst.folder.42', 'Looker', 'Dashboard', '42', undefined],
    ['looker:explore:inst.model.orders', 'Looker', 'Explore', 'orders', undefined],
    ['looker:look:inst.folder.7', 'Looker', 'Look', '7', undefined],
    ['vertex_ai:model:proj.us-central1.123.1', 'Vertex AI', 'Model', '1', 'proj'],
    ['vertex_ai:dataset:proj.us-central1.ds1', 'Vertex AI', 'Dataset', 'ds1', 'proj'],
    ['vertex_ai:featureonlinestore:proj.us-central1.store.view', 'Vertex AI', 'Feature view', 'view', 'proj'],
    ['dataproc_metastore:proj.us.svc.db.tbl', 'Dataproc Metastore', 'Table', 'tbl', 'proj'],
    ['dataplex:proj.us.lake.zone.tbl', 'Knowledge Catalog', 'Table', 'tbl', 'proj'],
    ['analytics_hub:proj.us.exch.listing', 'BigQuery sharing', 'Listing', 'listing', 'proj'],
    ['kafka:broker.example.com.orders', 'Apache Kafka', 'Topic', 'orders', undefined],
    ['snowflake:acct.db.schema.tbl', 'Snowflake', 'Table', 'tbl', undefined],
  ])('parses %s', (fqn, label, type, name, project) => {
    const p = parseFqn(fqn);
    expect(p.known).toBe(true);
    expect(p.systemLabel).toBe(label);
    expect(p.assetType).toBe(type);
    expect(p.displayName).toBe(name);
    expect(p.project).toBe(project);
    expect(p.icon).toBeTruthy();
  });

  it('handles legacy domain-scoped BigQuery projects', () => {
    const p = parseFqn('bigquery:example.com:proj.ds.tbl');
    expect(p.project).toBe('example.com:proj');
    expect(p.displayName).toBe('tbl');
    expect(p.assetType).toBe('Table');
  });

  it('falls back for unknown systems', () => {
    const p = parseFqn('mysystem:thing.other');
    expect(p.known).toBe(false);
    expect(p.systemLabel).toBe('Mysystem');
    expect(p.assetType).toBe('Custom asset');
    expect(p.displayName).toBe('other');
  });

  it('falls back for FQNs without a prefix', () => {
    const p = parseFqn('just-a-name');
    expect(p.system).toBe('custom');
    expect(p.systemLabel).toBe('Custom');
  });

  it('every registered system has a label and icon', () => {
    Object.values(SYSTEM_REGISTRY).forEach((d) => {
      expect(d.label).toBeTruthy();
      expect(d.icon).toBeTruthy();
    });
  });
});

describe('helpers', () => {
  it('isKnownLineageSystem', () => {
    expect(isKnownLineageSystem('bigquery:p.d.t')).toBe(true);
    expect(isKnownLineageSystem('gcs:b')).toBe(true);
    expect(isKnownLineageSystem('nope:x')).toBe(false);
    expect(isKnownLineageSystem(undefined)).toBe(false);
  });
  it('formatFieldPath', () => {
    expect(formatFieldPath(['salary', 'net'])).toBe('salary.net');
    expect(formatFieldPath([])).toBe('');
    expect(formatFieldPath(undefined)).toBe('');
  });
});
