/**
 * @file fqn.ts
 * @description Parses Knowledge Catalog / Data Lineage fully qualified names
 * (https://cloud.google.com/dataplex/docs/fully-qualified-names) and maps them
 * to a system label, asset type, display name and icon. This is how the
 * Data Lineage graph renders every asset type BigQuery lineage supports.
 */
import BigQueryIcon from '../../../assets/svg/BigQuery.svg';
import TableIcon from '../../../assets/svg/table_icon.svg';
import DatasetIcon from '../../../assets/svg/dataset_icon.svg';
import FunctionIcon from '../../../assets/svg/function_icon.svg';
import ConnectionIcon from '../../../assets/svg/connection_icon.svg';
import ModelIcon from '../../../assets/svg/model_icon.svg';
import CloudStorageIcon from '../../../assets/svg/CloudStorage.svg';
import BucketIcon from '../../../assets/svg/bucket_icon.svg';
import FilesetIcon from '../../../assets/svg/fileset_icon.svg';
import PubSubIcon from '../../../assets/svg/cloudpub_sub.svg';
import SpannerIcon from '../../../assets/svg/CloudSpanner.svg';
import CloudSqlIcon from '../../../assets/svg/cloud-sql.svg';
import BigtableIcon from '../../../assets/svg/CloudBigTable.svg';
import AlloyDbIcon from '../../../assets/svg/aspect-alloydb-icon.svg';
import LookerIcon from '../../../assets/svg/aspect-looker-icon.svg';
import DashboardIcon from '../../../assets/svg/dashboard_icon.svg';
import ExploreIcon from '../../../assets/svg/explore_icon.svg';
import LookIcon from '../../../assets/svg/look_icon.svg';
import VertexIcon from '../../../assets/svg/vertex.svg';
import FeatureGroupIcon from '../../../assets/svg/feature_group_icon.svg';
import FeatureOnlineStoreIcon from '../../../assets/svg/feature_online_store_icon.svg';
import DataprocIcon from '../../../assets/svg/Dataproc.svg';
import DataplexIcon from '../../../assets/svg/dataplex_icon_new.svg';
import AnalyticsHubIcon from '../../../assets/svg/analytics-hub.svg';
import DataStreamIcon from '../../../assets/svg/data_stream_icon.svg';
import DatabaseIcon from '../../../assets/svg/database_icon.svg';
import GenericIcon from '../../../assets/svg/generic_icon.svg';
import OthersIcon from '../../../assets/svg/others.svg';

export interface ParsedFqn {
  fqn: string;
  /** Raw system prefix, e.g. "bigquery", "gcs", "pubsub". */
  system: string;
  /** Optional typed sub-prefix, e.g. "topic", "sharded", "dashboard". */
  subType?: string;
  systemLabel: string;
  assetType: string;
  displayName: string;
  segments: string[];
  project?: string;
  icon: string;
  /** Whether the system is a known (registered) lineage system. */
  known: boolean;
}

/** Split on "." outside of backtick-quoted segments. "``" escapes a backtick. */
export const splitSegments = (body: string): string[] => {
  const segments: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '`') {
      if (quoted && body[i + 1] === '`') {
        current += '`';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === '.' && !quoted) {
      segments.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  segments.push(current);
  return segments.filter((s, idx) => s !== '' || idx < segments.length - 1);
};

/** Extract colon-delimited prefixes that appear before the first "." or "`". */
const splitPrefixes = (fqn: string): { prefixes: string[]; body: string } => {
  const prefixes: string[] = [];
  let rest = fqn;
  // At most two prefixes (system + typed sub-prefix) per the FQN spec.
  while (prefixes.length < 2) {
    const colon = rest.indexOf(':');
    if (colon <= 0) break;
    const dot = rest.indexOf('.');
    const tick = rest.indexOf('`');
    const firstDelimiter = Math.min(dot === -1 ? Infinity : dot, tick === -1 ? Infinity : tick);
    if (colon > firstDelimiter) break;
    const candidate = rest.slice(0, colon);
    // Typed sub-prefixes are simple lowercase words.
    if (prefixes.length === 1 && !/^[a-z_]+$/.test(candidate)) break;
    prefixes.push(candidate);
    rest = rest.slice(colon + 1);
  }
  return { prefixes, body: rest };
};

interface SystemDef {
  label: string;
  icon: string;
  /** Asset type by number of segments (1-based index into array). */
  typesBySegments?: string[];
  /** Overrides for typed sub-prefixes. */
  subTypes?: Record<string, { type: string | string[]; icon?: string }>;
  /** Index of the project segment (if any). */
  projectIndex?: number;
  /** Icon override per asset type. */
  typeIcons?: Record<string, string>;
}

const DB_TYPES = ['Instance', 'Database', 'Schema', 'Table'];

export const SYSTEM_REGISTRY: Record<string, SystemDef> = {
  bigquery: {
    label: 'BigQuery',
    icon: BigQueryIcon,
    typesBySegments: ['Project', 'Dataset', 'Table'],
    projectIndex: 0,
    typeIcons: { Dataset: DatasetIcon, Table: TableIcon },
    subTypes: {
      sharded: { type: 'Sharded table', icon: TableIcon },
      routine: { type: 'Routine', icon: FunctionIcon },
      connection: { type: 'Connection', icon: ConnectionIcon },
      model: { type: 'Model', icon: ModelIcon },
    },
  },
  gcs: {
    label: 'Cloud Storage',
    icon: CloudStorageIcon,
    typesBySegments: ['Bucket', 'Path'],
    typeIcons: { Bucket: BucketIcon, Path: FilesetIcon },
  },
  pubsub: {
    label: 'Pub/Sub',
    icon: PubSubIcon,
    projectIndex: 0,
    subTypes: { topic: { type: 'Topic' }, subscription: { type: 'Subscription' } },
    typesBySegments: ['Project', 'Topic'],
  },
  spanner: {
    label: 'Spanner',
    icon: SpannerIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Instance config', 'Instance', 'Database', 'Table'],
  },
  cloudsql_mysql: {
    label: 'Cloud SQL (MySQL)',
    icon: CloudSqlIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Instance', 'Schema', 'Table'],
  },
  cloudsql_postgresql: {
    label: 'Cloud SQL (PostgreSQL)',
    icon: CloudSqlIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Instance', 'Database', 'Schema', 'Table'],
  },
  cloudsql_sqlserver: {
    label: 'Cloud SQL (SQL Server)',
    icon: CloudSqlIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Instance', 'Database', 'Schema', 'Table'],
  },
  bigtable: {
    label: 'Bigtable',
    icon: BigtableIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Instance', 'Table'],
  },
  alloydb: {
    label: 'AlloyDB',
    icon: AlloyDbIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Cluster', 'Instance', 'Database', 'Schema', 'Table'],
  },
  looker: {
    label: 'Looker',
    icon: LookerIcon,
    typesBySegments: ['Instance'],
    subTypes: {
      dashboard: { type: 'Dashboard', icon: DashboardIcon },
      explore: { type: 'Explore', icon: ExploreIcon },
      look: { type: 'Look', icon: LookIcon },
      view: { type: 'View', icon: LookerIcon },
      model: { type: 'Model', icon: ModelIcon },
    },
  },
  looker_studio: {
    label: 'Looker Studio',
    icon: DashboardIcon,
    typesBySegments: ['Report', 'Data source'],
    subTypes: {
      report: { type: 'Report' },
      datasource: { type: 'Data source' },
    },
  },
  vertex_ai: {
    label: 'Vertex AI',
    icon: VertexIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Resource'],
    subTypes: {
      model: { type: 'Model', icon: ModelIcon },
      dataset: { type: 'Dataset', icon: DatasetIcon },
      featuregroup: { type: 'Feature group', icon: FeatureGroupIcon },
      featureonlinestore: {
        type: ['Project', 'Location', 'Feature online store', 'Feature view'],
        icon: FeatureOnlineStoreIcon,
      },
      featurestore: { type: 'Feature store', icon: FeatureOnlineStoreIcon },
    },
  },
  dataproc_metastore: {
    label: 'Dataproc Metastore',
    icon: DataprocIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Service', 'Database', 'Table'],
  },
  hive_metastore: { label: 'Apache Hive', icon: DataprocIcon, typesBySegments: ['Instance', 'Database', 'Table'] },
  dataplex: {
    label: 'Knowledge Catalog',
    icon: DataplexIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Lake', 'Zone', 'Table'],
  },
  analytics_hub: {
    label: 'BigQuery sharing',
    icon: AnalyticsHubIcon,
    projectIndex: 0,
    typesBySegments: ['Project', 'Location', 'Exchange', 'Listing'],
  },
  kafka: { label: 'Apache Kafka', icon: DataStreamIcon, typesBySegments: ['Cluster', 'Topic'] },
  cassandra: { label: 'Apache Cassandra', icon: DatabaseIcon, typesBySegments: ['Cluster', 'Keyspace', 'Table'] },
  s3: { label: 'Amazon S3', icon: BucketIcon, typesBySegments: ['Bucket', 'Path'] },
  abs: { label: 'Azure Blob Storage', icon: BucketIcon, typesBySegments: ['Account', 'Container', 'Path'] },
  athena: { label: 'AWS Athena', icon: DatabaseIcon, typesBySegments: ['Catalog', 'Region', 'Database', 'Table'] },
  redshift: {
    label: 'AWS Redshift',
    icon: DatabaseIcon,
    typesBySegments: ['Cluster', 'Region', 'Instance', 'Database', 'Schema', 'Table'],
  },
  aws_glue: { label: 'AWS Glue', icon: DatabaseIcon, subTypes: { table: { type: 'Table' } } },
  'cosmos-db': { label: 'Azure Cosmos DB', icon: DatabaseIcon, typesBySegments: ['Account', 'Database', 'Container'] },
  kusto: { label: 'Azure Data Explorer', icon: DatabaseIcon, typesBySegments: ['Cluster', 'Region', 'Database', 'Table'] },
  databricks: {
    label: 'Databricks',
    icon: DatabaseIcon,
    typesBySegments: ['Metastore', 'Catalog', 'Schema'],
    subTypes: {
      table: { type: 'Table' },
      view: { type: 'View' },
      routine: { type: 'Routine', icon: FunctionIcon },
      volume: { type: 'Volume' },
      model: { type: 'Model', icon: ModelIcon },
    },
  },
  dbfs: { label: 'Databricks File System', icon: FilesetIcon, typesBySegments: ['Workspace', 'Path'] },
  filesystem: { label: 'File system', icon: FilesetIcon, typesBySegments: ['Instance', 'Path'] },
  hdfs: { label: 'HDFS', icon: FilesetIcon, typesBySegments: ['Instance', 'Path'] },
  db2: { label: 'IBM Db2', icon: DatabaseIcon, typesBySegments: DB_TYPES },
  informix: { label: 'IBM Informix', icon: DatabaseIcon, typesBySegments: DB_TYPES },
  sqlserver: { label: 'SQL Server', icon: DatabaseIcon, typesBySegments: DB_TYPES },
  mysql: { label: 'MySQL', icon: DatabaseIcon, typesBySegments: ['Instance', 'Schema', 'Table'] },
  oracle: { label: 'Oracle', icon: DatabaseIcon, typesBySegments: DB_TYPES },
  postgresql: { label: 'PostgreSQL', icon: DatabaseIcon, typesBySegments: DB_TYPES },
  salesforce: { label: 'Salesforce', icon: GenericIcon, typesBySegments: ['Environment', 'Org', 'SObject'] },
  snowflake: { label: 'Snowflake', icon: DatabaseIcon, typesBySegments: ['Account', 'Database', 'Schema', 'Table'] },
};

const titleCase = (s: string) =>
  s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const parseFqn = (fqn: string = ''): ParsedFqn => {
  const { prefixes, body } = splitPrefixes(fqn);
  const system = (prefixes[0] || '').toLowerCase();
  const subType = prefixes[1];
  let segments = body ? splitSegments(body) : [];
  const def = SYSTEM_REGISTRY[system];

  // Legacy domain-scoped BigQuery projects: "bigquery:example.com:proj.ds.tbl"
  if (system === 'bigquery' && !subType && segments.length > 3 && segments[1].includes(':')) {
    segments = [`${segments[0]}.${segments[1]}`, ...segments.slice(2)];
  }

  const lastSegment = segments[segments.length - 1] || fqn;
  let displayName = lastSegment;
  // Paths (gcs/s3/hdfs/...) - show the last path component.
  if (displayName.includes('/')) {
    const parts = displayName.split('/').filter(Boolean);
    displayName = parts[parts.length - 1] || displayName;
  }

  if (!def) {
    return {
      fqn,
      system: system || 'custom',
      subType,
      systemLabel: system ? titleCase(system) : 'Custom',
      assetType: subType ? titleCase(subType) : 'Custom asset',
      displayName,
      segments,
      icon: system ? GenericIcon : OthersIcon,
      known: false,
    };
  }

  let assetType = 'Asset';
  let icon = def.icon;
  const sub = subType ? def.subTypes?.[subType] : undefined;
  if (sub) {
    if (Array.isArray(sub.type)) {
      assetType = sub.type[Math.min(segments.length, sub.type.length) - 1] || sub.type[sub.type.length - 1];
    } else {
      assetType = sub.type;
    }
    if (sub.icon) icon = sub.icon;
  } else if (subType) {
    assetType = titleCase(subType);
  } else if (def.typesBySegments?.length) {
    const types = def.typesBySegments;
    assetType = types[Math.min(segments.length, types.length) - 1] || types[types.length - 1];
  }
  if (!sub?.icon && def.typeIcons?.[assetType]) icon = def.typeIcons[assetType];

  return {
    fqn,
    system,
    subType,
    systemLabel: def.label,
    assetType,
    displayName,
    segments,
    project: def.projectIndex !== undefined ? segments[def.projectIndex] : undefined,
    icon,
    known: true,
  };
};

/** True when the FQN prefix is a recognised lineage system. */
export const isKnownLineageSystem = (fqn?: string): boolean =>
  Boolean(fqn) && Boolean(SYSTEM_REGISTRY[splitPrefixes(fqn as string).prefixes[0]?.toLowerCase() || '']);

/** Format a field path array for display ("salary.net"). */
export const formatFieldPath = (field?: string[]): string => (field && field.length ? field.join('.') : '');
