import { describe, it, expect } from 'vitest';
import { attributeToString, bigQueryJobConsoleUrl, getBigQueryJobRef, getProcessDisplayName, getProcessTypeInfo } from './processTypes';
import { layoutGraph, nodeSize } from './layout';
import { getEntryLocation, getLineageParent, isDataLineageSupported } from './eligibility';
import type { FlowNodeSpec } from './graphBuilder';

describe('processTypes', () => {
  it('describes processes by origin', () => {
    expect(getProcessTypeInfo({ name: 'n', origin: { sourceType: 'DATAFLOW' } }).label).toBe('Dataflow job');
    expect(getProcessTypeInfo({ name: 'n', origin: { sourceType: 'COMPOSER' } }).label).toContain('Composer');
    expect(getProcessTypeInfo({ name: 'n' }).label).toBe('Process');
    expect(getProcessTypeInfo(undefined).label).toBe('Process');
  });

  it('display names and attribute values', () => {
    expect(getProcessDisplayName({ name: 'projects/p/locations/us/processes/abc' })).toBe('abc');
    expect(getProcessDisplayName({ name: 'x', displayName: 'Nice' })).toBe('Nice');
    expect(attributeToString({ stringValue: 'v' })).toBe('v');
    expect(attributeToString({ numberValue: 3 })).toBe('3');
    expect(attributeToString('plain')).toBe('plain');
    expect(attributeToString(undefined)).toBe('');
  });

  it('finds BigQuery job refs from runs, processes and origins', () => {
    const process = {
      name: 'projects/p/locations/us/processes/1',
      origin: { sourceType: 'BIGQUERY' as const, name: 'projects/billing/locations/US' },
      attributes: { bigquery_job_id: 'job_proc' },
    };
    expect(getBigQueryJobRef(process)).toEqual({ projectId: 'billing', jobId: 'job_proc', location: 'US' });
    expect(getBigQueryJobRef(process, { name: 'r', attributes: { bigquery_job_id: 'job_run' } })?.jobId).toBe('job_run');
    expect(getBigQueryJobRef({ ...process, origin: { sourceType: 'BIGQUERY', name: 'proj:EU' } })).toMatchObject({ projectId: 'proj', location: 'EU' });
    expect(getBigQueryJobRef({ ...process, attributes: { bigquery_job_id: 'other:us.job9' }, origin: { sourceType: 'BIGQUERY' } }))
      .toEqual({ projectId: 'other', location: 'us', jobId: 'job9' });
    expect(getBigQueryJobRef({ name: 'projects/p/locations/us/processes/1', origin: { sourceType: 'DATAFLOW' } })).toBeNull();
    expect(getBigQueryJobRef({ name: 'n', origin: { sourceType: 'BIGQUERY' } })).toBeNull();
    expect(bigQueryJobConsoleUrl({ projectId: 'p', jobId: 'j', location: 'US' })).toContain('j=bq:US:j');
  });
});

describe('layout', () => {
  it('positions nodes left to right without leaking between calls', () => {
    const asset = (id: string, columns: string[] = []): FlowNodeSpec => ({
      id, type: 'dlAsset',
      asset: { kind: 'asset', id, fqn: id, isRoot: false, depth: 0, columns, upstreamExpanded: false, downstreamExpanded: false, hasUpstream: true, hasDownstream: true },
    });
    const pos1 = layoutGraph([asset('a'), asset('b')], [{ id: 'e', source: 'a', target: 'b', processes: [], modelEdgeIds: [] }], false);
    expect(pos1.a.x).toBeLessThan(pos1.b.x);
    const pos2 = layoutGraph([asset('c')], [], false);
    expect(Object.keys(pos2)).toEqual(['c']);
    expect(nodeSize(asset('x', ['a', 'b']), true).height).toBeGreaterThan(nodeSize(asset('x', ['a', 'b']), false).height);
    expect(nodeSize({ id: 'p', type: 'dlProcess' }, false)).toEqual({ width: 44, height: 44 });
  });
});

describe('eligibility', () => {
  const bq = { name: 'projects/p/locations/us/entryGroups/@bigquery/entries/x', fullyQualifiedName: 'bigquery:p.d.t', entryType: 'projects/655216118709/locations/global/entryTypes/bigquery-table' };
  it('supports lineage-capable entries', () => {
    expect(isDataLineageSupported(bq)).toBe(true);
    expect(isDataLineageSupported({ ...bq, fullyQualifiedName: 'gcs:bucket' })).toBe(true);
    expect(isDataLineageSupported({ ...bq, fullyQualifiedName: 'pubsub:topic:p.t' })).toBe(true);
  });
  it('rejects unsupported entries', () => {
    expect(isDataLineageSupported(null)).toBe(false);
    expect(isDataLineageSupported({ ...bq, fullyQualifiedName: undefined })).toBe(false);
    expect(isDataLineageSupported({ ...bq, fullyQualifiedName: 'unknown:x' })).toBe(false);
    expect(isDataLineageSupported({ ...bq, entryType: 'projects/x/locations/global/entryTypes/glossary-term' })).toBe(false);
    expect(isDataLineageSupported({ ...bq, name: 'projects/p/locations/us/entryGroups/@bigquery/entries/bigquery.googleapis.com/projects/p/datasets/d' })).toBe(false);
  });
  it('derives parent and location', () => {
    expect(getLineageParent(bq)).toBe('projects/p/locations/us');
    expect(getEntryLocation(bq)).toBe('us');
    expect(getEntryLocation({})).toBe('global');
  });
});
