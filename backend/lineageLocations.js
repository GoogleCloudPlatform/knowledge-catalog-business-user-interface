/**
 * @file lineageLocations.js
 * @description Pure helpers that decide which locations a Data Lineage
 * searchLineageStreaming call scans. Lineage links are stored in the location
 * (and project) where the lineage events were written, e.g. Looker lineage is
 * written in the Looker instance's region, while BigQuery tables often live in
 * a multi-region. Searching only the entry's own location therefore misses
 * cross-location lineage (BigQuery "us" -> Looker "us-central1").
 */

// Region prefix -> multi-region that contains it.
const MULTI_REGION_BY_PREFIX = [
  [/^(us|northamerica)-/, 'us'],
  [/^europe-/, 'eu'],
];

/** Upper bound on locations sent to the API in a single search. */
const MAX_LINEAGE_LOCATIONS = 20;

const LOCATION_RE = /^[a-z0-9-]+$/;

/** "a, B ,,c" -> ['a', 'b', 'c'] (trimmed, lower-cased, valid ids only). */
function parseLocationList(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : String(value).split(',');
  return items
    .map((s) => String(s || '').trim().toLowerCase())
    .filter((s) => s && LOCATION_RE.test(s));
}

/**
 * Extract the location from a resource name such as
 * projects/p/locations/us-central1/entryGroups/@looker/entries/x.
 * Returns undefined for "global" (lineage is never stored there) or invalid names.
 */
function locationFromResourceName(name) {
  const m = String(name || '').match(/^projects\/[^/]+\/locations\/([^/]+)/);
  const loc = m ? m[1].toLowerCase() : undefined;
  if (!loc || loc === 'global' || !LOCATION_RE.test(loc)) return undefined;
  return loc;
}

/** 'us-central1' -> 'us', 'europe-west1' -> 'eu'; undefined for multi-regions/others. */
function multiRegionFor(location) {
  const loc = String(location || '').toLowerCase();
  const hit = MULTI_REGION_BY_PREFIX.find(([re]) => re.test(loc));
  return hit ? hit[1] : undefined;
}

/**
 * Ordered, de-duplicated list of locations to search:
 *   parent location (always first; the API requires it), requested,
 *   configured, discovered, then the multi-region of any region in the list.
 * Capped at MAX_LINEAGE_LOCATIONS.
 */
function resolveLineageLocations({ parentLocation, requested = [], configured = [], discovered = [] } = {}) {
  const ordered = [];
  const add = (l) => {
    if (l && !ordered.includes(l)) ordered.push(l);
  };
  // Keep the parent location verbatim (it came from a validated parent).
  if (parentLocation) add(String(parentLocation));
  [requested, configured, discovered].forEach((list) => parseLocationList(list).forEach(add));
  [...ordered].forEach((l) => add(multiRegionFor(l)));
  return ordered.slice(0, MAX_LINEAGE_LOCATIONS);
}

module.exports = {
  MAX_LINEAGE_LOCATIONS,
  parseLocationList,
  locationFromResourceName,
  multiRegionFor,
  resolveLineageLocations,
};
