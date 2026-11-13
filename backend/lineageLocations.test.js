const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_LINEAGE_LOCATIONS,
  parseLocationList,
  locationFromResourceName,
  multiRegionFor,
  resolveLineageLocations,
} = require('./lineageLocations');

test('parseLocationList trims, lower-cases and drops invalid values', () => {
  assert.deepEqual(parseLocationList(' us-central1, EU ,,bad/loc, '), ['us-central1', 'eu']);
  assert.deepEqual(parseLocationList(undefined), []);
  assert.deepEqual(parseLocationList(['asia-south1', '']), ['asia-south1']);
});

test('locationFromResourceName extracts the location and skips global', () => {
  assert.equal(
    locationFromResourceName('projects/p/locations/us-central1/entryGroups/@looker/entries/x'),
    'us-central1',
  );
  assert.equal(locationFromResourceName('projects/p/locations/global/entryGroups/g/entries/x'), undefined);
  assert.equal(locationFromResourceName('not-a-name'), undefined);
  assert.equal(locationFromResourceName(undefined), undefined);
});

test('multiRegionFor maps regions to their multi-region', () => {
  assert.equal(multiRegionFor('us-central1'), 'us');
  assert.equal(multiRegionFor('northamerica-northeast1'), 'us');
  assert.equal(multiRegionFor('europe-west1'), 'eu');
  assert.equal(multiRegionFor('us'), undefined);
  assert.equal(multiRegionFor('asia-south1'), undefined);
});

test('BigQuery in "us" picks up the discovered Looker region', () => {
  assert.deepEqual(
    resolveLineageLocations({ parentLocation: 'us', discovered: ['us-central1'] }),
    ['us', 'us-central1'],
  );
});

test('Looker in a region also searches its multi-region for BigQuery lineage', () => {
  assert.deepEqual(resolveLineageLocations({ parentLocation: 'us-central1' }), ['us-central1', 'us']);
});

test('parent first, then requested, configured, discovered; de-duplicated', () => {
  assert.deepEqual(
    resolveLineageLocations({
      parentLocation: 'us',
      requested: ['us', 'europe-west1'],
      configured: ['asia-south1', 'europe-west1'],
      discovered: ['us-central1', 'asia-south1'],
    }),
    ['us', 'europe-west1', 'asia-south1', 'us-central1', 'eu'],
  );
});

test('result is capped', () => {
  const many = Array.from({ length: 40 }, (_, i) => `asia-x${i}`);
  const out = resolveLineageLocations({ parentLocation: 'us', discovered: many });
  assert.equal(out.length, MAX_LINEAGE_LOCATIONS);
  assert.equal(out[0], 'us');
});
