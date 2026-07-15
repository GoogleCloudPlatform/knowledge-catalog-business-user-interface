import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getAspectL1Icon } from '../../constants/aspectIcons';
import FieldItem from './FieldItem';

/**
 * @file PreviewAnnotation.tsx
 * @summary Renders a multilevel collapsible hierarchy of "aspect" data from an entry.
 *
 * @description
 * This component takes a data `entry` object and iterates over its `aspects`.
 * It filters out a predefined set of "global" aspects (like schema, overview)
 * and renders a Material-UI `Accordion` for each remaining annotation.
 *
 * Each `AccordionSummary` displays the aspect's name with an icon and "Aspect" chip.
 * The `AccordionDetails` renders each field as a collapsible `FieldItem` supporting
 * multilevel expansion for complex field types (structs, lists of structs).
 *
 * Key features:
 * 1.  **Multilevel Hierarchy**: Fields within aspects are rendered as collapsible
 *     sub-items. Complex fields (structValue, listValue with structs) expand to
 *     show nested content recursively up to 3 levels deep.
 * 2.  **Controlled Expansion**: The component uses a `Set` (`expandedItems`) and
 *     a setter function (`setExpandedItems`) passed as props for L1 (aspect-level)
 *     expansion. Sub-field expansion (L2/L3) is managed internally.
 * 3.  **Empty Data Handling**: It checks if an aspect has displayable data.
 *     If not, the aspect is rendered as disabled (grayed out, non-clickable).
 * 4.  **Icon Support**: L1 aspects show annotation icon, L2/L3 fields show
 *     document or schema icons based on field complexity.
 */

/** Maps API aspect type keys to their proper display names. */
const ASPECT_DISPLAY_NAMES: Record<string, string> = {
  'accuracy': 'Accuracy',
  'data_quality_column_level': 'Data Quality Column-Level',
  'network-connectivity-specification': 'Network Connectivity Specification',
  'alloydb-cluster': 'AlloyDB Cluster',
  'alloydb-database': 'AlloyDB Database',
  'alloydb-instance': 'AlloyDB Instance',
  'alloydb-schema': 'AlloyDB Schema',
  'alloydb-table': 'AlloyDB Table',
  'alloydb-view': 'AlloyDB View',
  'analytics-hub': 'Analytics Hub',
  'analyticshub-exchange': 'AnalyticsHub Exchange',
  'analyticshub-listing': 'AnalyticsHub Listing',
  'aspect-type-aspect': 'Aspect Type Aspect',
  'bigquery-connection': 'BigQuery Connection',
  'bigquery-data-policy': 'BigQuery Data Policy',
  'bigquery-dataset': 'BigQuery Dataset',
  'bigquery-model': 'BigQuery Model',
  'bigquery-policy': 'BigQuery Policy',
  'bigquery-routine': 'BigQuery Routine',
  'bigquery-row-level-security-policy': 'BigQuery Row Level Security Policy',
  'bigquery-table': 'BigQuery Table',
  'bigquery-view': 'BigQuery View',
  'cloud-bigtable-instance': 'Cloud Bigtable Instance',
  'cloud-bigtable-table': 'Cloud Bigtable Table',
  'cloud-spanner-database': 'Cloud Spanner Database',
  'cloud-spanner-instance': 'Cloud Spanner Instance',
  'cloud-spanner-table': 'Cloud Spanner Table',
  'cloud-spanner-view': 'Cloud Spanner View',
  'cloud-sql-database': 'Cloud SQL Database',
  'cloud-sql-instance': 'Cloud SQL Instance',
  'cloud-sql-schema': 'Cloud SQL Schema',
  'cloud-sql-table': 'Cloud SQL Table',
  'cloud-sql-view': 'Cloud SQL View',
  'data-domain': 'Data Domain',
  'data-product': 'Data Product',
  'data-profile': 'Data Profile',
  'data-quality-scorecard': 'Data Quality Scorecard',
  'dataform-code-asset': 'Dataform code asset',
  'dataform-folder': 'Dataform folder',
  'dataform-repository': 'Dataform repository',
  'dataform-team-folder': 'Dataform team folder',
  'dataform-workspace': 'Dataform workspace',
  'dataproc-metastore-database': 'Dataproc Metastore Database',
  'dataproc-metastore-service': 'Dataproc Metastore Service',
  'dataproc-metastore-table': 'Dataproc Metastore Table',
  'descriptions': 'Descriptions (Preview)',
  'entry-group-aspect': 'Entry Group Aspect',
  'entry-type-aspect': 'Entry Type Aspect',
  'firestore-collection-group': 'Firestore Collection Group',
  'firestore-database': 'Firestore Database',
  'gemini-data-analytics-data-agent': 'GeminiDataAnalytics DataAgent',
  'generic-entry': 'Generic Entry',
  'graph-profile': 'Graph Profile',
  'looker-dashboard': 'Looker Dashboard',
  'looker-dashboard-element': 'Looker Dashboard Element',
  'looker-explore': 'Looker Explore',
  'looker-instance': 'Looker Instance',
  'looker-look': 'Looker Look',
  'looker-model': 'Looker Model',
  'looker-view': 'Looker View',
  'pubsub-topic': 'Cloud Pub/Sub Topic specific parameters',
  'queries': 'Queries (Preview)',
  'refresh-cadence': 'Refresh Cadence',
  'schema-join': 'Schema Join',
  'sensitive-data-protection-job-result': 'Sensitive Data Protection job result',
  'sensitive-data-protection-profile': 'Sensitive Data Protection profile',
  'sql-access': 'SQL Access',
  'storage': 'Storage',
  'storage-bucket': 'Storage Bucket',
  'storage-folder': 'Storage Folder',
  'vertexai-dataset': 'VertexAI Dataset',
  'vertexai-feature-group': 'VertexAI Feature Group',
  'vertexai-feature-online-store': 'VertexAI Feature Online Store',
  'vertexai-feature-view': 'VertexAI Feature View',
  'vertexai-model-version': 'VertexAI Model Version',
};

interface PreviewAnnotationProps {
  entry: any;
  css: React.CSSProperties;
  isTopComponent?: boolean; // kept for API compatibility with parent components
  expandedItems: Set<string>;
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  isGlossary?: boolean;
  isDataProduct?: boolean;
}

const isValidField = (item: any): boolean => {
  if (item && typeof item === 'object' && 'kind' in item) {
    return (item.kind === 'stringValue' && !!item.stringValue) ||
           (item.kind === 'numberValue' && item.numberValue !== undefined) ||
           (item.kind === 'boolValue') ||
           (item.kind === 'listValue' && item.listValue?.values?.length > 0) ||
           (item.kind === 'structValue' && item.structValue?.fields &&
            Object.keys(item.structValue.fields).length > 0);
  }
  if (Array.isArray(item)) return item.length > 0;
  if (item && typeof item === 'object') return Object.keys(item).length > 0;
  return item !== null && item !== undefined && typeof item !== 'object';
};

const PreviewAnnotation: React.FC<PreviewAnnotationProps> = ({
  entry,
  css,
  expandedItems = new Set(),
  setExpandedItems,
  isGlossary = false,
  isDataProduct = false,
}) => {

  const number = entry?.entryType?.split('/').length > 0 ? entry?.entryType.split('/')[1] : '0';

  const globalAspectsToExclude = [
    `${number}.global.refresh-cadence`
  ];

  const aspects = { ...entry?.aspects };

  // Remove global aspects that should be excluded
  globalAspectsToExclude.forEach(key => {
    delete aspects?.[key];
  });

  if (isDataProduct) {
    Object.keys(aspects).forEach(key => {
      if (key.endsWith('.data-product') || key.endsWith('.queries')) {
        delete aspects[key];
      }
    });
  }

  const keys = Object.keys(aspects ?? {});

  // Filter out global aspects to check if there are any displayable aspects
  const displayableKeys = keys.filter((key) => {
    const isSchema = key === `${number}.global.schema`;
    const isOverview = key.endsWith('.global.overview');
    const isContacts = key === `${number}.global.contacts`;
    const isUsage = key === `${number}.global.usage`;
    const isGlossaryTermAspect = key.endsWith('.global.glossary-term-aspect');
    return !(isSchema || isOverview || isContacts || isUsage || isGlossaryTermAspect);
  });


  const contentKeys = displayableKeys.filter((key) => {
  const rawData = aspects[key]?.data;
  if (!rawData) return false;
  const fieldsToCheck = rawData.fields || rawData;
  return Object.keys(fieldsToCheck).some((fieldKey) => isValidField(fieldsToCheck[fieldKey]));
});

  // State to track sub-field expansion (L2/L3)
  const [expandedFieldPaths, setExpandedFieldPaths] = useState<Set<string>>(new Set());

  // When all aspects are expanded (expand all), also expand all nested fields
  // When all aspects are collapsed, reset sub-field expansion
  useEffect(() => {
    if (expandedItems.size === 0) {
      setExpandedFieldPaths(new Set());
    } else if (contentKeys.length > 0 && contentKeys.every(key => expandedItems.has(key))) {
      // Recursively collect all expandable field paths from aspect data.
      // Handles both kind-tagged (structValue/listValue) and plain-JSON shapes.
      const collectPaths = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields: Record<string, any>,
        basePath: string,
        depth: number,
        paths: Set<string>
      ) => {
        if (!fields || depth > 2) return;
        for (const key of Object.keys(fields)) {
          const value = fields[key];
          const fp = `${basePath}.${key}`;
          // Record every field path, including scalar leaves, so their value rows auto-expand
          paths.add(fp);
          // Scalars have no children to recurse into
          if (!value || typeof value !== 'object') continue;

          // Kind-tagged list
          if (value.kind === 'listValue') {
            const vals = value.listValue?.values;
            if (Array.isArray(vals)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              vals.forEach((item: any, index: number) => {
                const ip = `${fp}.${index}`;
                if (item?.kind === 'structValue' && item.structValue?.fields) {
                  paths.add(ip);
                  collectPaths(item.structValue.fields, ip, depth + 1, paths);
                }
              });
            }
          // Kind-tagged struct
          } else if (value.kind === 'structValue' && value.structValue?.fields) {
            collectPaths(value.structValue.fields, fp, depth + 1, paths);
          // Plain JSON array
          } else if (Array.isArray(value)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            value.forEach((item: any, index: number) => {
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                const ip = `${fp}.${index}`;
                paths.add(ip);
                collectPaths(item, ip, depth + 1, paths);
              }
            });
          // Plain JSON nested object (no kind wrapper)
          } else if (!('kind' in value)) {
            collectPaths(value, fp, depth + 1, paths);
          }
        }
      };

      const allPaths = new Set<string>();
      for (const aspectKey of displayableKeys) {
        // Plain-JSON data products keep data on .data; kind-tagged entries use .data.fields
        const aspectData = aspects[aspectKey]?.data?.fields ?? aspects[aspectKey]?.data;
        if (aspectData) {
          collectPaths(aspectData, aspectKey, 0, allPaths);
        }
      }
      setExpandedFieldPaths(allPaths);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedItems]);

  // Handle L1 accordion expansion change
  const handleAccordionChange = (key: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    const newExpanded = new Set(expandedItems);
    if (isExpanded) {
      newExpanded.add(key);
    } else {
      newExpanded.delete(key);
      // Also collapse all sub-fields under this aspect
      setExpandedFieldPaths(prev => {
        const next = new Set(prev);
        for (const p of next) {
          if (p.startsWith(key + '.')) next.delete(p);
        }
        return next;
      });
    }
    setExpandedItems(newExpanded);
  };

  // Toggle handler for sub-field expansion (L2/L3)
  const handleToggleField = (path: string) => {
    setExpandedFieldPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        // Also collapse all children
        for (const p of next) {
          if (p.startsWith(path + '.')) next.delete(p);
        }
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  /**
   * Checks if a field value has displayable content.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /**
   * Renders the multilevel field hierarchy for an aspect's data.
   */
  const renderAnnotation = (fields: any, aspectKey: string) => {
    if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
      return (
        <div style={{ padding: '0.5rem', color: '#0C1226CC', fontStyle: 'italic', fontSize: '0.75rem' }}>
          No data available
        </div>
      );
    }

    const fieldKeys = Object.keys(fields);
    const validFields = fieldKeys.filter(key => isValidField(fields[key]));

    if (validFields.length === 0) {
      return null;
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}>
        {validFields.map((key, index) => (
          <FieldItem
            key={`${aspectKey}.${key}`}
            fieldName={key}
            fieldValue={fields[key]}
            depth={0}
            expandedFieldPaths={expandedFieldPaths}
            onToggleField={handleToggleField}
            fieldPath={`${aspectKey}.${key}`}
            isLast={index === validFields.length - 1}
            isDataProduct={isDataProduct || isGlossary}
          />
        ))}
      </div>
    );
  };

  // Show empty state if no displayable aspects
  if (displayableKeys.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '200px',
        color: '#0C1226CC',
        fontSize: '1rem',
        fontFamily: 'Google Sans, sans-serif',
        ...css
      }}>
        No aspects available for this resource
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: "0.75rem", display: "flex", flexDirection: "column", flex: "1 1 auto", overflow: "hidden", borderRadius: '12px', ...css }}>
        {keys.map((key) => {
          const isSchema = key === `${number}.global.schema`;
          const isOverview = key.endsWith('.global.overview');
          const isContacts = key === `${number}.global.contacts`;
          const isUsage = key === `${number}.global.usage`;
          const isGlossaryTermAspect = key.endsWith('.global.glossary-term-aspect');

          if (isSchema || isOverview || isContacts || isUsage || isGlossaryTermAspect) {
            return null;
          }

          const isFirstAspect = key === displayableKeys[0];
          const isLastAspect = key === displayableKeys[displayableKeys.length - 1];
          const isSingleItem = displayableKeys.length === 1;

          const rawData = aspects[key].data;

          let hasContent = false;
          const hasFields = rawData && rawData.fields && Object.keys(rawData.fields).length > 0;

          if (rawData) {
            const fieldsToCheck = rawData.fields || rawData;
            const validFieldKeys = Object.keys(fieldsToCheck).filter(fieldKey =>
              isValidField(fieldsToCheck[fieldKey])
            );
            hasContent = validFieldKeys.length > 0;
          }

          const rawAspectName = aspects[key].aspectType.split('/').pop();
          const aspectName = ASPECT_DISPLAY_NAMES[rawAspectName] ?? rawAspectName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          const aspectIcon = getAspectL1Icon(rawAspectName);

          const headerContent = (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: '1 1 auto',
              minWidth: 0,
              overflow: 'hidden',
            }}>
              <img
                src={aspectIcon}
                alt=""
                style={{ width: '20px', height: '20px', flexShrink: 0 }}
              />
              <Typography component="span" sx={{
                fontFamily: 'Google Sans, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '20px',
                color: "#575757",
                wordBreak: 'break-word',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                flex: '1 1 0',
                minWidth: 0,
              }}>
                {aspectName}
              </Typography>
            </div>
          );

          if (hasContent) {
            return (
              <Accordion
                key={key + "accordion"}
                expanded={expandedItems.has(key)}
                onChange={handleAccordionChange(key)}
                disableGutters
                sx={{
                  background: "none",
                  boxShadow: "none",
                  '&:before': { display: 'none' },
                  borderBottom: '1px solid #DADCE0',
                  ...(isFirstAspect && {
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                  }),
                  ...(isLastAspect && {
                    borderBottomLeftRadius: '16px',
                    borderBottomRightRadius: '16px',
                    overflow: 'hidden',
                    borderBottom: 'none',
                    boxShadow: (isSingleItem || expandedItems.has(key)) ? 'none' : 'inset 0 -1px 0 0 #DADCE0',
                    '&:hover': { boxShadow: 'none' },
                  }),
                }}
              >
                <AccordionSummary
                  aria-controls={key + "-content"}
                  id={key + "-header"}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '48px',
                    padding: '12px 8px',
                    backgroundColor: (isDataProduct || isGlossary) ? '#FFFFFF' : (expandedItems.has(key) ? '#F0F4F8' : 'transparent'),
                    flexDirection: 'row',
                    '&:hover': { backgroundColor: (isDataProduct || isGlossary) ? (expandedItems.has(key) ? '#FFFFFF' : 'transparent') : '#F0F4F8' },
                    '& .MuiAccordionSummary-content': { margin: 0, overflow: 'hidden', minWidth: 0 },
                    '& .MuiAccordionSummary-expandIconWrapper': { display: 'none' },
                    ...(isFirstAspect && {
                      borderTopLeftRadius: '12px',
                      borderTopRightRadius: '12px',
                    }),
                    ...(isLastAspect && !expandedItems.has(key) && {
                      borderBottomLeftRadius: '12px',
                      borderBottomRightRadius: '12px',
                    }),
                  }}
                >
                  <ExpandMoreIcon sx={{
                    fontSize: '24px',
                    color: '#575757',
                    transform: expandedItems.has(key) ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                    marginRight: '4px',
                  }} />
                  {headerContent}
                </AccordionSummary>
                <AccordionDetails sx={{
                  padding: 0,
                  backgroundColor: (isDataProduct || isGlossary) ? '#FFFFFF' : (expandedItems.has(key) ? '#F0F4F8' : 'transparent'),
                  ...(isLastAspect && {
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px',
                    overflow: 'hidden',
                  }),
                }}>
                  {renderAnnotation(hasFields ? rawData.fields : rawData, key)}
                </AccordionDetails>
              </Accordion>
            );
          } else {
            return (
              <div
                key={key + "static"}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '48px',
                  padding: '12px 8px',
                  backgroundColor: (isDataProduct || isGlossary) ? '#FFFFFF' : 'transparent',
                  borderBottom: isLastAspect ? 'none' : '1px solid #DADCE0',
                  cursor: 'default',
                  ...(isFirstAspect && {
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                  }),
                  ...(isLastAspect && {
                    borderBottomLeftRadius: '16px',
                    borderBottomRightRadius: '16px',
                    overflow: 'hidden',
                  }),
                }}
              >
                <ExpandMoreIcon sx={{
                  fontSize: '24px',
                  color: '#DADCE0',
                  transform: 'rotate(-90deg)',
                  flexShrink: 0,
                  marginRight: '4px',
                }} />
                {headerContent}
              </div>
            );
          }
        })}
      </div>
    </>
  );
}

export default PreviewAnnotation;
