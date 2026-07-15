import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatInsightDate,
  getDateKey,
  groupQueriesByDate,
  getMostRecentSuccessfulJob,
  filterQueriesBySearchTerm,
  hasRunningJobs,
  getTotalQueryCount,
  type GroupedQueries,
} from './insightsUtils';
import type { InsightJob } from '../mocks/insightsMockData';

// ============================================================================
// Mock Data Factories
// ============================================================================

const createMockInsightJob = (overrides: Partial<InsightJob> = {}): InsightJob => ({
  name: 'projects/test/locations/us-central1/dataScans/scan-id/jobs/job-id',
  uid: 'test-job-uid',
  startTime: '2026-02-05T12:11:36.626112533Z',
  endTime: '2026-02-05T12:12:23.122921884Z',
  state: 'SUCCEEDED',
  type: 'DATA_DOCUMENTATION',
  createTime: '2026-02-05T12:11:36.626050423Z',
  dataDocumentationSpec: { catalogPublishingEnabled: true },
  dataDocumentationResult: {
    tableResult: {
      name: 'test-table',
      overview: 'Test table description',
      schema: { fields: [{ name: 'col1', description: 'Column 1' }] },
      queries: [
        { sql: 'SELECT * FROM table', description: 'Get all records' },
        { sql: 'SELECT COUNT(*) FROM table', description: 'Count records' },
      ],
    },
  },
  ...overrides,
});

// ============================================================================
// formatInsightDate Tests
// ============================================================================

describe('insightsUtils', () => {
  describe('formatInsightDate', () => {
    it('formats ISO date string to display format', () => {
      const result = formatInsightDate('2026-02-05T12:11:36.626112533Z');
      // The exact format depends on locale, but should contain key parts
      expect(result).toContain('2026');
      expect(result).toContain('February');
      expect(result).toContain('5');
    });

    it('handles different time values correctly', () => {
      const result = formatInsightDate('2026-01-15T08:30:00Z');
      expect(result).toContain('2026');
      expect(result).toContain('January');
      expect(result).toContain('15');
    });

    it('handles midnight timestamps correctly', () => {
      const result = formatInsightDate('2026-03-20T00:00:00Z');
      expect(result).toContain('2026');
      expect(result).toContain('March');
      expect(result).toContain('20');
    });

    it('handles end of day timestamps correctly', () => {
      const result = formatInsightDate('2026-12-31T12:00:00Z');
      expect(result).toContain('December');
      expect(result).toContain('31');
    });
  });

  // ============================================================================
  // getDateKey Tests
  // ============================================================================

  describe('getDateKey', () => {
    it('extracts date key from ISO string', () => {
      const result = getDateKey('2026-02-05T12:11:36.626112533Z');
      expect(result).toBe('2026-02-05');
    });

    it('returns consistent format YYYY-MM-DD', () => {
      const result = getDateKey('2026-01-01T00:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles dates with different timezones', () => {
      const result = getDateKey('2026-06-15T18:30:00+05:30');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles leap year dates', () => {
      const result = getDateKey('2024-02-29T12:00:00Z');
      expect(result).toBe('2024-02-29');
    });
  });

  // ============================================================================
  // groupQueriesByDate Tests
  // ============================================================================

  describe('groupQueriesByDate', () => {
    it('groups queries from multiple jobs by date', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'job-1', startTime: '2026-02-05T10:00:00Z' }),
        createMockInsightJob({ uid: 'job-2', startTime: '2026-02-04T10:00:00Z' }),
      ];

      const result = groupQueriesByDate(jobs);

      expect(result).toHaveLength(2);
      expect(result[0].jobUid).toBe('job-1');
      expect(result[1].jobUid).toBe('job-2');
    });

    it('filters out non-SUCCEEDED jobs', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'job-1', state: 'SUCCEEDED' }),
        createMockInsightJob({ uid: 'job-2', state: 'FAILED' }),
        createMockInsightJob({ uid: 'job-3', state: 'RUNNING' }),
        createMockInsightJob({ uid: 'job-4', state: 'PENDING' }),
      ];

      const result = groupQueriesByDate(jobs);

      expect(result).toHaveLength(1);
      expect(result[0].jobUid).toBe('job-1');
    });

    it('filters out jobs without tableResult queries', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'job-1' }),
        createMockInsightJob({
          uid: 'job-2',
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: undefined as any,
            },
          },
        }),
      ];

      const result = groupQueriesByDate(jobs);

      expect(result).toHaveLength(1);
      expect(result[0].jobUid).toBe('job-1');
    });

    it('sorts groups by date descending (most recent first)', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'oldest', startTime: '2026-01-01T10:00:00Z' }),
        createMockInsightJob({ uid: 'newest', startTime: '2026-03-15T10:00:00Z' }),
        createMockInsightJob({ uid: 'middle', startTime: '2026-02-10T10:00:00Z' }),
      ];

      const result = groupQueriesByDate(jobs);

      expect(result[0].jobUid).toBe('newest');
      expect(result[1].jobUid).toBe('middle');
      expect(result[2].jobUid).toBe('oldest');
    });

    it('returns empty array for empty input', () => {
      const result = groupQueriesByDate([]);
      expect(result).toEqual([]);
    });

    it('returns empty array when no successful jobs', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'FAILED' }),
        createMockInsightJob({ state: 'RUNNING' }),
      ];

      const result = groupQueriesByDate(jobs);
      expect(result).toEqual([]);
    });

    it('includes correct jobUid in each group', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'unique-uid-123' }),
      ];

      const result = groupQueriesByDate(jobs);

      expect(result[0].jobUid).toBe('unique-uid-123');
    });

    it('preserves all queries from each job', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: [
                { sql: 'SELECT 1', description: 'Query 1' },
                { sql: 'SELECT 2', description: 'Query 2' },
                { sql: 'SELECT 3', description: 'Query 3' },
              ],
            },
          },
        }),
      ];

      const result = groupQueriesByDate(jobs);

      expect(result[0].queries).toHaveLength(3);
    });

    it('includes formatted date in each group', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ startTime: '2026-02-05T12:11:36Z' }),
      ];

      const result = groupQueriesByDate(jobs);

      expect(result[0].date).toBe('2026-02-05');
      expect(result[0].formattedDate).toContain('February');
      expect(result[0].formattedDate).toContain('2026');
    });
  });

  // ============================================================================
  // getMostRecentSuccessfulJob Tests
  // ============================================================================

  describe('getMostRecentSuccessfulJob', () => {
    it('returns most recent SUCCEEDED job', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'oldest', startTime: '2026-01-01T10:00:00Z' }),
        createMockInsightJob({ uid: 'newest', startTime: '2026-03-15T10:00:00Z' }),
        createMockInsightJob({ uid: 'middle', startTime: '2026-02-10T10:00:00Z' }),
      ];

      const result = getMostRecentSuccessfulJob(jobs);

      expect(result?.uid).toBe('newest');
    });

    it('returns null for empty array', () => {
      const result = getMostRecentSuccessfulJob([]);
      expect(result).toBeNull();
    });

    it('returns null when no successful jobs', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'FAILED' }),
        createMockInsightJob({ state: 'RUNNING' }),
      ];

      const result = getMostRecentSuccessfulJob(jobs);
      expect(result).toBeNull();
    });

    it('ignores jobs without tableResult', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({
          uid: 'without-result',
          startTime: '2026-03-15T10:00:00Z',
          dataDocumentationResult: undefined,
        }),
        createMockInsightJob({
          uid: 'with-result',
          startTime: '2026-02-01T10:00:00Z',
        }),
      ];

      const result = getMostRecentSuccessfulJob(jobs);

      expect(result?.uid).toBe('with-result');
    });

    it('correctly compares dates and returns latest', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'a', startTime: '2026-02-05T23:59:59Z' }),
        createMockInsightJob({ uid: 'b', startTime: '2026-02-06T00:00:01Z' }),
      ];

      const result = getMostRecentSuccessfulJob(jobs);

      expect(result?.uid).toBe('b');
    });

    it('returns single job when only one exists', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ uid: 'only-job' }),
      ];

      const result = getMostRecentSuccessfulJob(jobs);

      expect(result?.uid).toBe('only-job');
    });
  });

  // ============================================================================
  // filterQueriesBySearchTerm Tests
  // ============================================================================

  describe('filterQueriesBySearchTerm', () => {
    let groupedQueries: GroupedQueries[];

    beforeEach(() => {
      groupedQueries = [
        {
          date: '2026-02-05',
          formattedDate: 'February 5, 2026',
          jobUid: 'job-1',
          queries: [
            { sql: 'SELECT * FROM users', description: 'Get all users from the database' },
            { sql: 'SELECT * FROM orders', description: 'Get all orders' },
          ],
        },
        {
          date: '2026-02-04',
          formattedDate: 'February 4, 2026',
          jobUid: 'job-2',
          queries: [
            { sql: 'SELECT * FROM products', description: 'Get product inventory' },
          ],
        },
      ];
    });

    it('returns all queries when search term is empty', () => {
      const result = filterQueriesBySearchTerm(groupedQueries, '');

      expect(result).toHaveLength(2);
      expect(result[0].queries).toHaveLength(2);
      expect(result[1].queries).toHaveLength(1);
    });

    it('returns all queries when search term is whitespace', () => {
      const result = filterQueriesBySearchTerm(groupedQueries, '   ');

      expect(result).toHaveLength(2);
    });

    it('filters queries by description (case insensitive)', () => {
      const result = filterQueriesBySearchTerm(groupedQueries, 'USERS');

      expect(result).toHaveLength(1);
      expect(result[0].queries).toHaveLength(1);
      expect(result[0].queries[0].description).toContain('users');
    });

    it('removes groups with no matching queries', () => {
      const result = filterQueriesBySearchTerm(groupedQueries, 'inventory');

      expect(result).toHaveLength(1);
      expect(result[0].jobUid).toBe('job-2');
    });

    it('preserves group metadata after filtering', () => {
      const result = filterQueriesBySearchTerm(groupedQueries, 'users');

      expect(result[0].date).toBe('2026-02-05');
      expect(result[0].formattedDate).toBe('February 5, 2026');
      expect(result[0].jobUid).toBe('job-1');
    });

    it('handles special characters in search term', () => {
      const queriesWithSpecialChars: GroupedQueries[] = [
        {
          date: '2026-02-05',
          formattedDate: 'February 5, 2026',
          jobUid: 'job-1',
          queries: [
            { sql: 'SELECT * FROM table', description: 'Query with (parentheses)' },
          ],
        },
      ];

      const result = filterQueriesBySearchTerm(queriesWithSpecialChars, '(parentheses)');

      expect(result).toHaveLength(1);
    });

    it('returns empty array when no matches found', () => {
      const result = filterQueriesBySearchTerm(groupedQueries, 'nonexistent');

      expect(result).toEqual([]);
    });

    it('matches partial words in description', () => {
      const result = filterQueriesBySearchTerm(groupedQueries, 'data');

      expect(result).toHaveLength(1);
      expect(result[0].queries[0].description).toContain('database');
    });
  });

  // ============================================================================
  // hasRunningJobs Tests
  // ============================================================================

  describe('hasRunningJobs', () => {
    it('returns true when RUNNING job exists', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'SUCCEEDED' }),
        createMockInsightJob({ state: 'RUNNING' }),
      ];

      expect(hasRunningJobs(jobs)).toBe(true);
    });

    it('returns true when PENDING job exists', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'SUCCEEDED' }),
        createMockInsightJob({ state: 'PENDING' }),
      ];

      expect(hasRunningJobs(jobs)).toBe(true);
    });

    it('returns false for only SUCCEEDED jobs', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'SUCCEEDED' }),
        createMockInsightJob({ state: 'SUCCEEDED' }),
      ];

      expect(hasRunningJobs(jobs)).toBe(false);
    });

    it('returns false for only FAILED jobs', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'FAILED' }),
        createMockInsightJob({ state: 'FAILED' }),
      ];

      expect(hasRunningJobs(jobs)).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(hasRunningJobs([])).toBe(false);
    });

    it('returns true when both RUNNING and PENDING exist', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'RUNNING' }),
        createMockInsightJob({ state: 'PENDING' }),
      ];

      expect(hasRunningJobs(jobs)).toBe(true);
    });
  });

  // ============================================================================
  // getTotalQueryCount Tests
  // ============================================================================

  describe('getTotalQueryCount', () => {
    it('counts queries across all successful jobs', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: [
                { sql: 'SELECT 1', description: 'Query 1' },
                { sql: 'SELECT 2', description: 'Query 2' },
              ],
            },
          },
        }),
        createMockInsightJob({
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: [
                { sql: 'SELECT 3', description: 'Query 3' },
              ],
            },
          },
        }),
      ];

      expect(getTotalQueryCount(jobs)).toBe(3);
    });

    it('ignores failed jobs', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({
          state: 'SUCCEEDED',
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: [{ sql: 'SELECT 1', description: 'Query 1' }],
            },
          },
        }),
        createMockInsightJob({
          state: 'FAILED',
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: [
                { sql: 'SELECT 2', description: 'Query 2' },
                { sql: 'SELECT 3', description: 'Query 3' },
              ],
            },
          },
        }),
      ];

      expect(getTotalQueryCount(jobs)).toBe(1);
    });

    it('ignores jobs without queries', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: [{ sql: 'SELECT 1', description: 'Query 1' }],
            },
          },
        }),
        createMockInsightJob({
          dataDocumentationResult: undefined,
        }),
      ];

      expect(getTotalQueryCount(jobs)).toBe(1);
    });

    it('returns 0 for empty array', () => {
      expect(getTotalQueryCount([])).toBe(0);
    });

    it('returns 0 when all jobs are failed', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({ state: 'FAILED' }),
        createMockInsightJob({ state: 'FAILED' }),
      ];

      expect(getTotalQueryCount(jobs)).toBe(0);
    });

    it('handles jobs with empty queries array', () => {
      const jobs: InsightJob[] = [
        createMockInsightJob({
          dataDocumentationResult: {
            tableResult: {
              name: 'test',
              overview: 'test',
              schema: { fields: [] },
              queries: [],
            },
          },
        }),
      ];

      expect(getTotalQueryCount(jobs)).toBe(0);
    });
  });
});
