import AspectOthersIcon from '../assets/svg/aspect-others-icon.svg';
import AspectAccuracyIcon from '../assets/svg/aspect-accuracy-icon.svg';
import AspectDataQualityColumnLevelIcon from '../assets/svg/aspect-data-quality-column-level-icon.svg';
import AspectNetworkConnectivitySpecificationIcon from '../assets/svg/aspect-network-connectivity-specification-icon.svg';
import AspectAlloyDbIcon from '../assets/svg/aspect-alloydb-icon.svg';
import AspectAnalyticsHubIcon from '../assets/svg/aspect-analytics-hub-icon.svg';
import AspectEntryTypeIcon from '../assets/svg/aspect-entry-type-icon.svg';
import AspectBigQueryIcon from '../assets/svg/aspect-bigquery-icon.svg';
import AspectBigtableIcon from '../assets/svg/aspect-bigtable-icon.svg';
import AspectCloudSpannerIcon from '../assets/svg/aspect-cloud-spanner-icon.svg';
import AspectDataDomainIcon from '../assets/svg/aspect-data-domain-icon.svg';
import AspectDataformIcon from '../assets/svg/aspect-dataform-icon.svg';
import AspectDataprocMetastoreIcon from '../assets/svg/aspect-dataproc-metastore-icon.svg';
import AspectDescriptionsIcon from '../assets/svg/aspect-descriptions-icon.svg';
import AspectFirestoreIcon from '../assets/svg/aspect-firestore-icon.svg';
import AspectGeminiDataAnalyticsIcon from '../assets/svg/aspect-gemini-data-analytics-icon.svg';
import AspectGraphProfileIcon from '../assets/svg/aspect-graph-profile-icon.svg';
import AspectLookerIcon from '../assets/svg/aspect-looker-icon.svg';
import AspectPubSubIcon from '../assets/svg/aspect-pubsub-icon.svg';
import AspectQueriesIcon from '../assets/svg/aspect-queries-icon.svg';
import AspectRefreshCadenceIcon from '../assets/svg/aspect-refresh-cadence-icon.svg';
import AspectStorageIcon from '../assets/svg/aspect-storage-icon.svg';
import AspectDescriptionIcon from '../assets/svg/aspect-description-icon.svg';
import AspectFieldsIcon from '../assets/svg/aspect-fields-icon.svg';
import AspectNumColumnDataPoliciesIcon from '../assets/svg/aspect-num-column-data-policies-icon.svg';
import AspectNumRowAccessPoliciesIcon from '../assets/svg/aspect-num-row-access-policies-icon.svg';
import AspectNumTagsIcon from '../assets/svg/aspect-num-tags-icon.svg';
import AspectTableTypeIcon from '../assets/svg/aspect-table-type-icon.svg';
import AspectL2QueriesIcon from '../assets/svg/aspect-l2-queries-icon.svg';
import AspectResourceNameIcon from '../assets/svg/aspect-resource-name-icon.svg';
import AspectDedupedAllIcon from '../assets/svg/aspect-deduped-all-icon.svg';
import AspectHistogramIcon from '../assets/svg/aspect-histogram-icon.svg';
import AspectJobDetailsIcon from '../assets/svg/aspect-job-details-icon.svg';
import AspectMaxValIcon from '../assets/svg/aspect-max-val-icon.svg';
import AspectMinValIcon from '../assets/svg/aspect-min-val-icon.svg';
import AspectNumNullsIcon from '../assets/svg/aspect-num-nulls-icon.svg';
import AspectPrimaryKeyIcon from '../assets/svg/aspect-primary-key-icon.svg';
import AspectServiceIcon from '../assets/svg/aspect-service-icon.svg';
import AspectSystemIcon from '../assets/svg/aspect-system-icon.svg';
import AspectUserManagedIcon from '../assets/svg/aspect-user-managed-icon.svg';
import AspectTypeIcon from '../assets/svg/aspect-type-icon.svg';
import AspectVertexAiIcon from '../assets/svg/aspect-vertexai-icon.svg';

// L1 aspect type key → icon path mapping
// Key = last segment of aspectType path (e.g., 'bigquery-table-schema')
const ASPECT_L1_ICONS: Record<string, string> = {
  'accuracy': AspectAccuracyIcon,
  'data_quality_column_level': AspectDataQualityColumnLevelIcon,
  'network-connectivity-specification': AspectNetworkConnectivitySpecificationIcon,
  'alloydb-cluster': AspectAlloyDbIcon,
  'alloydb-database': AspectAlloyDbIcon,
  'alloydb-instance': AspectAlloyDbIcon,
  'alloydb-schema': AspectAlloyDbIcon,
  'alloydb-table': AspectAlloyDbIcon,
  'alloydb-view': AspectAlloyDbIcon,
  'analytics-hub': AspectAnalyticsHubIcon,
  'analyticshub-exchange': AspectAnalyticsHubIcon,
  'analyticshub-listing': AspectAnalyticsHubIcon,
  'entry-group-aspect': AspectEntryTypeIcon,
  'entry-type-aspect': AspectEntryTypeIcon,
  'aspect-type-aspect': AspectEntryTypeIcon,
  'bigquery-connection': AspectBigQueryIcon,
  'bigquery-data-policy': AspectBigQueryIcon,
  'bigquery-dataset': AspectBigQueryIcon,
  'bigquery-model': AspectBigQueryIcon,
  'bigquery-policy': AspectBigQueryIcon,
  'bigquery-routine': AspectBigQueryIcon,
  'bigquery-row-level-security-policy': AspectBigQueryIcon,
  'bigquery-table': AspectBigQueryIcon,
  'bigquery-view': AspectBigQueryIcon,
  'cloud-bigtable-instance': AspectBigtableIcon,
  'cloud-bigtable-table': AspectBigtableIcon,
  'cloud-spanner-database': AspectCloudSpannerIcon,
  'cloud-spanner-instance': AspectCloudSpannerIcon,
  'cloud-spanner-table': AspectCloudSpannerIcon,
  'cloud-spanner-view': AspectCloudSpannerIcon,
  'data-domain': AspectDataDomainIcon,
  'data-product': AspectDataDomainIcon,
  'data-profile': AspectDataDomainIcon,
  'data-quality-scorecard': AspectDataDomainIcon,
  'dataform-code-asset': AspectDataformIcon,
  'dataform-folder': AspectDataformIcon,
  'dataform-repository': AspectDataformIcon,
  'dataform-team-folder': AspectDataformIcon,
  'dataform-workspace': AspectDataformIcon,
  'dataproc-metastore-database': AspectDataprocMetastoreIcon,
  'dataproc-metastore-service': AspectDataprocMetastoreIcon,
  'dataproc-metastore-table': AspectDataprocMetastoreIcon,
  'descriptions': AspectDescriptionsIcon,
  'firestore-collection-group': AspectFirestoreIcon,
  'firestore-database': AspectFirestoreIcon,
  'gemini-data-analytics-data-agent': AspectGeminiDataAnalyticsIcon,
  'graph-profile': AspectGraphProfileIcon,
  'looker-dashboard': AspectLookerIcon,
  'looker-dashboard-element': AspectLookerIcon,
  'looker-explore': AspectLookerIcon,
  'looker-instance': AspectLookerIcon,
  'looker-look': AspectLookerIcon,
  'looker-model': AspectLookerIcon,
  'looker-view': AspectLookerIcon,
  'cloud-pub-sub-topic-specific-parameters': AspectPubSubIcon,
  'queries': AspectQueriesIcon,
  'refresh-cadence': AspectRefreshCadenceIcon,
  'schema-join': AspectQueriesIcon,
  'sql-access': AspectQueriesIcon,
  'vertexai-dataset': AspectVertexAiIcon,
  'vertexai-feature-group': AspectVertexAiIcon,
  'vertexai-feature-online-store': AspectVertexAiIcon,
  'vertexai-feature-view': AspectVertexAiIcon,
  'vertexai-model-version': AspectVertexAiIcon,
  'storage': AspectStorageIcon,
  'storage-bucket': AspectStorageIcon,
  'storage-folder': AspectStorageIcon,
};

// L2 field name → icon path mapping
const ASPECT_L2_ICONS: Record<string, string> = {
  'description': AspectDescriptionIcon,
  'accessGroups': AspectNumRowAccessPoliciesIcon,
  'fields': AspectFieldsIcon,
  'numColumnDataPolicies': AspectNumColumnDataPoliciesIcon,
  'numRowAccessPolicies': AspectNumRowAccessPoliciesIcon,
  'numTags': AspectNumTagsIcon,
  'tableType': AspectTableTypeIcon,
  'type': AspectTypeIcon,
  'queries': AspectL2QueriesIcon,
  'resourceName': AspectResourceNameIcon,
  'service': AspectServiceIcon,
  'userManaged': AspectUserManagedIcon,
  'system': AspectSystemIcon,
  'primary_key': AspectPrimaryKeyIcon,
  'max_val': AspectMaxValIcon,
  'min_val': AspectMinValIcon,
  'num_nulls': AspectNumNullsIcon,
  'job': AspectJobDetailsIcon,
  'jobDetails': AspectJobDetailsIcon,
  'histogram': AspectHistogramIcon,
  'deduped_all': AspectDedupedAllIcon,
  'cardinality': AspectDedupedAllIcon,
  'approx_count_distinct': AspectNumRowAccessPoliciesIcon,
  'col_quality_issues': AspectNumRowAccessPoliciesIcon,
};

const DEFAULT_L1_ICON = AspectOthersIcon;

/**
 * Returns the icon for an L1 aspect type.
 * @param aspectTypeKey - The last segment of the aspectType path
 */
export const getAspectL1Icon = (aspectTypeKey: string): string => {
  return ASPECT_L1_ICONS[aspectTypeKey] ?? DEFAULT_L1_ICON;
};

/**
 * Returns the icon for an L2 field (future use).
 * @param fieldName - The field key name
 */
export const getAspectL2Icon = (fieldName: string): string | null => {
  return ASPECT_L2_ICONS[fieldName] ?? null;
};

export { ASPECT_L1_ICONS, ASPECT_L2_ICONS };
