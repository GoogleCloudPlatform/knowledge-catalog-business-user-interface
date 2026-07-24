/**
 * Utility functions for Insights tab
 */

import type { InsightJob, QueryItem } from '../mocks/insightsMockData';

export interface GroupedQueries {
  date: string;
  formattedDate: string;
  queries: QueryItem[];
  jobUid: string;
}

/**
 * Format ISO date string to display format
 * Example: "February 5, 2026 at 5:49:40 PM UTC+5:30"
 */
export const formatInsightDate = (isoString: string): string => {
  const date = new Date(isoString);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'shortOffset'
  };

  return date.toLocaleString('en-US', options);
};

/**
 * Format ISO date string to short date format for grouping
 * Example: "2026-02-05"
 */
export const getDateKey = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toISOString().split('T')[0];
};

/**
 * Group queries by date from multiple jobs
 * Returns jobs sorted by date (most recent first)
 */
export const groupQueriesByDate = (jobs: InsightJob[]): GroupedQueries[] => {
  // Filter only successful jobs with results
  const successfulJobs = jobs.filter(
    job => job.state === 'SUCCEEDED' && job.dataDocumentationResult?.tableResult?.queries
  );

  // Sort by startTime descending (most recent first)
  const sortedJobs = [...successfulJobs].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Create grouped queries for each job
  return sortedJobs.map(job => ({
    date: getDateKey(job.startTime),
    formattedDate: formatInsightDate(job.startTime),
    queries: job.dataDocumentationResult?.tableResult?.queries || [],
    jobUid: job.uid
  }));
};

/**
 * Get the most recent successful job
 */
export const getMostRecentSuccessfulJob = (jobs: InsightJob[]): InsightJob | null => {
  const successfulJobs = jobs.filter(
    job => job.state === 'SUCCEEDED' && job.dataDocumentationResult?.tableResult
  );

  if (successfulJobs.length === 0) return null;

  // Sort by startTime descending and return the first one
  return successfulJobs.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )[0];
};

/**
 * Get the most recent successful job that contains a datasetResult.
 * Dataset scans return `datasetResult` (overview / queries / schemaRelationships)
 * instead of the `tableResult` used by table scans.
 */
export const getMostRecentSuccessfulDatasetJob = (jobs: InsightJob[]): InsightJob | null => {
  const successfulJobs = jobs.filter(
    job => job.state === 'SUCCEEDED' && job.dataDocumentationResult?.datasetResult
  );

  if (successfulJobs.length === 0) return null;

  return successfulJobs.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )[0];
};

/**
 * Filter queries by search term (matches description)
 */
export const filterQueriesBySearchTerm = (
  groupedQueries: GroupedQueries[],
  searchTerm: string
): GroupedQueries[] => {
  if (!searchTerm.trim()) return groupedQueries;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return groupedQueries
    .map(group => ({
      ...group,
      queries: group.queries.filter(query =>
        query.description.toLowerCase().includes(lowerSearchTerm)
      )
    }))
    .filter(group => group.queries.length > 0);
};

/**
 * Check if there are any running/pending jobs
 */
export const hasRunningJobs = (jobs: InsightJob[]): boolean => {
  return jobs.some(job => job.state === 'RUNNING' || job.state === 'PENDING');
};

/**
 * Get total query count across all jobs
 */
export const getTotalQueryCount = (jobs: InsightJob[]): number => {
  return jobs.reduce((total, job) => {
    if (job.state === 'SUCCEEDED' && job.dataDocumentationResult?.tableResult?.queries) {
      return total + job.dataDocumentationResult.tableResult.queries.length;
    }
    return total;
  }, 0);
};