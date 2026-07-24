import BucketIcon from '../assets/svg/bucket_icon.svg';
import ClusterIcon from '../assets/svg/cluster_icon.svg';
import CodeAssetIcon from '../assets/svg/code_asset_icon.svg';
import ConnectionIcon from '../assets/svg/connection_icon.svg';
import DashboardIcon from '../assets/svg/dashboard_icon.svg';
import DashboardElementIcon from '../assets/svg/dashboard_element_icon.svg';
import DataExchangeIcon from '../assets/svg/data_exchange_icon.svg';
import DataStreamIcon from '../assets/svg/data_stream_icon.svg';
import DatabaseIcon from '../assets/svg/database_icon.svg';
import DatabaseSchemaIcon from '../assets/svg/database_schema_icon.svg';
import DatasetIcon from '../assets/svg/dataset_icon.svg';
import ExploreIcon from '../assets/svg/explore_icon.svg';
import FeatureGroupIcon from '../assets/svg/feature_group_icon.svg';
import FeatureOnlineStoreIcon from '../assets/svg/feature_online_store_icon.svg';
import ViewIcon from '../assets/svg/view_icon.svg';
import FilesetIcon from '../assets/svg/fileset_icon.svg';
import FolderIcon from '../assets/svg/folder_icon.svg';
import FunctionIcon from '../assets/svg/function_icon.svg';

import ListingIcon from '../assets/svg/listing_icon.svg';
import LookIcon from '../assets/svg/look_icon.svg';
import ModelIcon from '../assets/svg/model_icon.svg';
import RepositoriesIcon from '../assets/svg/repositories_icon.svg';
import GenericIcon from '../assets/svg/generic_icon.svg';
import SchedulerIcon from '../assets/svg/scheduler_icon.svg';
import TableIcon from '../assets/svg/table_icon.svg';
import BigQueryProductIcon from '../assets/svg/BigQuery.svg';


export const getAssetIcon = (assetName: string) => {
  switch (assetName) {
    case 'Bucket':
      return BucketIcon;
    case 'Big Query Product':
        return BigQueryProductIcon;
    case 'Cluster':
      return ClusterIcon;
    case 'Code asset':
      return CodeAssetIcon;
    case 'Connection':
      return ConnectionIcon;
    case 'Dashboard':
      return DashboardIcon;
    case 'Dashboard element':
      return DashboardElementIcon;
    case 'Data exchange':
      return DataExchangeIcon;
    case 'Exchange':
      return DataExchangeIcon;
    case 'Data source connection':
      return ConnectionIcon;
    case 'Data stream':
      return DataStreamIcon;
    case 'Database':
      return DatabaseIcon;
    case 'Database schema':
      return DatabaseSchemaIcon;
    case 'Dataset':
      return DatasetIcon;
    case 'Explore':
      return ExploreIcon;
    case 'Feature group':
      return FeatureGroupIcon;
    case 'Feature online store':
      return FeatureOnlineStoreIcon;
    case 'Feature view':
      return ViewIcon;
    case 'Fileset':
      return FilesetIcon;
    case 'Folder':
      return FolderIcon;
    case 'Function':
      return FunctionIcon;
case 'Listing':
      return ListingIcon;
    case 'Look':
      return LookIcon;
    case 'Model':
      return ModelIcon;
    case 'Repository':
      return RepositoriesIcon;
    case 'View':
      return ViewIcon;
    case 'Resource':
      return GenericIcon;
    case 'Routine':
      return SchedulerIcon;
    case 'Table':
      return TableIcon;
    default:
      return GenericIcon;
  }
};

export const getName = (namePath: string = '', separator: string = '') => {
  const segments: string[] = namePath.split(separator);
  return (segments[segments.length - 1]);
};

export const getEntryType = (namePath: string = '', separator: string = '') => {
  const segments: string[] = namePath.split(separator);
  const eType = segments[segments.length - 2];
  if (!eType) return '';
  return (`${eType[0].toUpperCase()}${eType.slice(1)}`);
};

export const getFormatedDate = (date: any) => {
  if (!date) return '-';
  const myDate = new Date(date * 1000);
  const formatedDate = new Intl.DateTimeFormat('en-US', { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit", 
    hour12: true 
  }).format(myDate);
  return formatedDate;
};

export const getFormattedDateTimeParts = (timestamp: any) => {
  if (!timestamp) {
    return { date: '-', time: '' };
  }
  
  const myDate = new Date(timestamp * 1000);

  const date = new Intl.DateTimeFormat('en-US', { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
  }).format(myDate);

  const time = new Intl.DateTimeFormat('en-US', {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(myDate);

  return { date, time }; 
};

export const getFormattedDateTimePartsByDateTime = (dateTime: any) => {
  if (!dateTime) {
    return { date: '-', time: '' };
  }

  let timeValue = dateTime;
  if (typeof dateTime === 'object' && dateTime !== null && 'seconds' in dateTime) {
    timeValue = Number(dateTime.seconds) * 1000;
  }

  const myDate = new Date(timeValue);

  if (isNaN(myDate.getTime())) {
    return { date: '-', time: '' };
  }

  const date = new Intl.DateTimeFormat('en-US', {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(myDate);

  const time = new Intl.DateTimeFormat('en-US', {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(myDate);

  return { date, time }; 
};


export const generateBigQueryLink = (entry:any) => {
  if (!entry?.name || !entry?.fullyQualifiedName) return '';

  const type = getEntryType(entry.name, '/');
  const fqnParts = entry.fullyQualifiedName.split(':').pop().split('.');
  
  if (fqnParts.length < 2) return '';

  const project = fqnParts[0];
  const dataset = fqnParts[1];
  const table = fqnParts.length > 2 ? `&t=${fqnParts[2]}` : '';
  const pageType = type.slice(0, -1).toLowerCase();

  return `https://console.cloud.google.com/bigquery?page=${pageType}&p=${project}&d=${dataset}${table}&project=${project}`;
}

export const generateLookerStudioLink = (entry: any) => {
  if (!entry?.fullyQualifiedName) return '';
  const fqnParts = entry.fullyQualifiedName.split(':').pop().split('.');
  if (fqnParts.length < 3) return '';

  const project = fqnParts[0];
  const dataset = fqnParts[1];
  const table = fqnParts[2];
  const baseUrl = 'https://lookerstudio.google.com/u/0/reporting/create';
  const queryParams = new URLSearchParams({
    'c.mode': 'edit',
    'c.source': 'BQ_UI',
    'ds.type': 'TABLE',
    'ds.connector': 'BIG_QUERY',
    'ds.billingProjectId': project,
    'ds.projectId': project,
    'ds.datasetId': dataset,
    'ds.tableId': table,
    'ds.sqlType': 'STANDARD_SQL',
  });

  return `${baseUrl}?${queryParams.toString()}`;
};

export const hasValidAnnotationData = (aspectData: any): boolean => {
  if (!aspectData || !aspectData.data) return false;

  const rawData = aspectData.data;
  
  const fields = (rawData.fields && typeof rawData.fields === 'object') 
    ? rawData.fields 
    : rawData;

  const fieldKeys = Object.keys(fields);

  if (fieldKeys.length === 0) return false;

  const validFields = fieldKeys.filter(key => {
    const item = fields[key];

    if (item && typeof item === 'object' && 'kind' in item) {
       return (item.kind === 'stringValue' && item.stringValue) ||
              (item.kind === 'numberValue' && item.numberValue !== undefined) ||
              (item.kind === 'boolValue') ||
              (item.kind === "listValue" && item.listValue?.values?.length > 0) ||
              (item.kind === 'structValue' && item.structValue?.fields &&
               Object.keys(item.structValue.fields).length > 0);
    }

    return item !== null && item !== undefined && typeof item !== 'object';
  });

  return validFields.length > 0;
};

export const typeAliases = [
  "Bucket","Cluster","Code asset","Connection","Dashboard",
  "Dashboard element","element","Data Exchange","Exchange","Data source connection","Data source",
  "Data stream","stream","Database","Database schema","schema","Dataset","Explore",
  "Feature group","group","Feature online store","store","Feature view","Fileset",
  "Folder","Function","Glossary","Glossary Category","Glossary Term",
  "Listing","Look","Model","Repository","Resource","Routine","Service",
  "Table","View","Other"
];

const signatures:any = {
      R0lGODdh: 'image/gif',
      R0lGODlh: 'image/gif',
      iVBORw0KGgo: 'image/png',
      '/9j/': 'image/jpg',
  };

export const getMimeType = (base64:string)=>{
    for(const sign in signatures)if(base64.startsWith(sign))  return signatures[sign];
};

export const normalizeSystemName = (system: string | undefined | null): string => {
  if (!system) return '-';
  const lower = system.toLowerCase();
  if (lower === 'dataplex universal catalog' || lower === 'dataplex') return 'Knowledge Catalog';
  if (lower === 'bigquery') return 'BigQuery';
  return system;
};

export const extractProjectNumberFromEntryName = (entryName: string | undefined): string => {
  if (!entryName) return '';
  const segments = entryName.split('/');
  if (segments.length >= 2 && segments[0] === 'projects') {
    return segments[1];
  }
  return '';
};

export const resolveProjectDisplayName = (
  projectNumber: string,
  projectsList: Array<{ projectId: string; name: string; displayName?: string }>
): string => {
  if (!projectNumber || !projectsList?.length) return '';
  const match = projectsList.find((p: any) => p.name === `projects/${projectNumber}`);
  if (!match) return '';
  return match.projectId || match.displayName || '';
};
