import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  InfoOutline,
  ContentCopy,
  ChevronRight,
  RuleOutlined
} from '@mui/icons-material';
import FilterBar, { type ActiveFilter, type PropertyConfig } from '../Common/FilterBar';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from '../Schema/ResizeHandle';
import OverflowTooltip from '../Common/OverflowTooltip';

interface RuleData {
  id: number;
  columnName: string;
  ruleName: string;
  ruleType: string;
  status: boolean;
  statusLabel: string;
  evaluation: string;
  dimensions: string;
  parameters: string;
  failedRows: string;
  threshold: string;
  failingRowsQuery: string;
}

interface CurrentRulesProps {
  dataQualtyScan: any;
}

const RULE_TYPE_DISPLAY_NAMES: Record<string, string> = {
  nonNullExpectation: 'Null check',
  rangeExpectation: 'Range check',
  regexExpectation: 'Regex check',
  setExpectation: 'Set check',
  uniquenessExpectation: 'Uniqueness check',
  statisticRangeExpectation: 'Statistic range check',
  rowConditionExpectation: 'Row condition check',
  tableConditionExpectation: 'Table condition check',
  sqlAssertion: 'SQL assertion',
};

const FILTER_PROPERTY_TO_FIELD: Record<string, keyof RuleData> = {
  'Column Name': 'columnName',
  'Rule Name': 'ruleName',
  'Rule Type': 'ruleType',
  'Status': 'statusLabel',
  'Evaluation': 'evaluation',
  'Dimensions': 'dimensions',
  'Failed Rows less than': 'failedRows',
  'Threshold more than': 'threshold',
};

const FILTER_PROPERTIES: PropertyConfig[] = [
  { name: 'Column Name', mode: 'text' },
  { name: 'Rule Name', mode: 'text' },
  { name: 'Rule Type', mode: 'dropdown' },
  { name: 'Status', mode: 'dropdown' },
  { name: 'Evaluation', mode: 'dropdown' },
  { name: 'Dimensions', mode: 'both' },
  { name: 'Failed Rows less than', mode: 'text' },
  { name: 'Threshold more than', mode: 'text' },
];

type SortableField = 'columnName' | 'ruleName' | 'ruleType' | 'statusLabel' | 'evaluation' | 'dimensions';

interface ColumnDef {
  key: SortableField | 'parameters' | 'failedRows' | 'threshold' | 'failingRowsQuery';
  header: string;
  sortable: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'columnName', header: 'Column Name', sortable: true },
  { key: 'ruleName', header: 'Rule Name', sortable: true },
  { key: 'ruleType', header: 'Rule Type', sortable: true },
  { key: 'statusLabel', header: 'Status', sortable: true },
  { key: 'evaluation', header: 'Evaluation', sortable: true },
  { key: 'dimensions', header: 'Dimensions', sortable: true },
  { key: 'parameters', header: 'Parameters', sortable: false },
  { key: 'failedRows', header: 'Failed Rows', sortable: false },
  { key: 'threshold', header: 'Threshold', sortable: false },
  { key: 'failingRowsQuery', header: 'Query to get failed records', sortable: false },
];

const COLUMN_CONFIGS = [
  { key: 'columnName', initialWidth: 135, minWidth: 80 },
  { key: 'ruleName', initialWidth: 115, minWidth: 70 },
  { key: 'ruleType', initialWidth: 135, minWidth: 80 },
  { key: 'statusLabel', initialWidth: 90, minWidth: 85 },
  { key: 'evaluation', initialWidth: 95, minWidth: 80 },
  { key: 'dimensions', initialWidth: 130, minWidth: 80 },
  { key: 'parameters', initialWidth: 200, minWidth: 100 },
  { key: 'failedRows', initialWidth: 80, minWidth: 60 },
  { key: 'threshold', initialWidth: 80, minWidth: 60 },
];

const headerCellStyle: React.CSSProperties = {
  fontFamily: '"Google Sans", sans-serif',
  fontWeight: 500,
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '0.1px',
  color: '#444746',
  display: 'flex',
  alignItems: 'center',
  padding: '0px',
  position: 'relative',
};

const bodyCellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
};

const CurrentRules: React.FC<CurrentRulesProps> = ({ dataQualtyScan }) => {
  const [filterText, setFilterText] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<SortableField | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpand = (rowId: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'flex',
  });

  // Build rules data by merging spec rules with result rules
  const rulesData: RuleData[] = useMemo(() => {
    const specRules = dataQualtyScan.scan?.dataQualitySpec?.rules || [];
    const resultRules = dataQualtyScan.scan?.dataQualityResult?.rules || dataQualtyScan.jobs?.[0]?.dataQualityResult?.rules || [];

    return specRules.map((rule: any, index: number) => {
      const resultRule = resultRules.find((rr: any) =>
        rr.rule?.column === rule.column && rr.rule?.ruleType === rule.ruleType
      );

      const passRatio = resultRule?.passRatio ?? 1;
      const failedPercent = (1 - passRatio) * 100;
      const passed = resultRule?.passed ?? true;

      return {
        id: index + 1,
        columnName: rule.column,
        ruleName: rule.name || '-',
        ruleType: RULE_TYPE_DISPLAY_NAMES[rule.ruleType] || rule.ruleType,
        status: passed,
        statusLabel: passed ? 'Passed' : 'Failed',
        evaluation: rule.evaluation || 'Per row',
        dimensions: rule.dimension ? rule.dimension.charAt(0) + rule.dimension.slice(1).toLowerCase() : '',
        parameters: rule[rule.ruleType] && Object.keys(rule[rule.ruleType]).length > 0 ? JSON.stringify(rule[rule.ruleType]) : '-',
        failedRows: `${Math.round(failedPercent)}%`,
        threshold: rule.threshold != null ? `${Math.floor(rule.threshold * 10000) / 100}%` : 'N/A',
        failingRowsQuery: resultRule?.failingRowsQuery || '',
      };
    });
  }, [dataQualtyScan]);

  // Get unique values for a filter property
  const getPropertyValues = useCallback((property: string): string[] => {
    const field = FILTER_PROPERTY_TO_FIELD[property];
    if (!field) return [];

    const values = new Set<string>();
    rulesData.forEach(row => {
      const val = String(row[field] || '');
      if (val.trim() && val !== '-') values.add(val);
    });
    return Array.from(values).sort();
  }, [rulesData]);

  // Filter data based on text search and active filters
  const filteredData = useMemo(() => {
    let data = rulesData;

    if (filterText) {
      const search = filterText.toLowerCase();
      data = data.filter(rule =>
        rule.columnName.toLowerCase().includes(search) ||
        rule.ruleName.toLowerCase().includes(search) ||
        rule.dimensions.toLowerCase().includes(search)
      );
    }

    if (activeFilters.length > 0) {
      data = data.filter(row => {
        return activeFilters.every(filter => {
          const field = FILTER_PROPERTY_TO_FIELD[filter.property];
          if (!field) return true;

          if (filter.property === 'Failed Rows less than') {
            const rowVal = parseFloat(String(row[field]));
            return filter.values.some(v => {
              const threshold = parseFloat(v);
              return !isNaN(rowVal) && !isNaN(threshold) && rowVal < threshold;
            });
          }

          if (filter.property === 'Threshold more than') {
            const rowVal = parseFloat(String(row[field]));
            return filter.values.some(v => {
              const threshold = parseFloat(v);
              return !isNaN(rowVal) && !isNaN(threshold) && rowVal > threshold;
            });
          }

          return filter.values.some(value => String(row[field]) === value);
        });
      });
    }

    return data;
  }, [rulesData, activeFilters, filterText]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    const sorted = [...filteredData].sort((a, b) =>
      String(a[sortColumn]).localeCompare(String(b[sortColumn]), undefined, { sensitivity: 'base' })
    );
    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [filteredData, sortColumn, sortOrder]);

  const handleToggleSort = (column: SortableField) => {
    if (sortColumn === column) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortColumn(null);
        setSortOrder('asc');
      }
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const getSortTooltip = (column: SortableField): string => {
    if (sortColumn === column && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === column && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  const handleCopyQuery = (query: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(query);
  };

  const sortIcon = (column: SortableField) => (
    <Box
      component="span"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        opacity: sortColumn === column ? 1 : 0,
        transform: (sortColumn === column && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="12" fill="#C2E7FF"/>
        <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill="#004A77"/>
      </svg>
    </Box>
  );

  const renderStatusCell = (row: RuleData) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {row.status ? (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="14" height="14" rx="7" fill="#128937"/>
            <path d="M5.76783 10C5.69499 10 5.62418 9.98543 5.55539 9.9563C5.4866 9.92716 5.42387 9.88346 5.36722 9.82519L3.16995 7.56512C3.05665 7.44858 3 7.30706 3 7.14057C3 6.97409 3.05665 6.83257 3.16995 6.71603C3.28326 6.59949 3.41882 6.54122 3.57663 6.54122C3.73445 6.54122 3.87405 6.59949 3.99545 6.71603L5.76783 8.53907L10.0167 4.18126C10.13 4.06472 10.2656 4.00436 10.4234 4.0002C10.5812 3.99604 10.7167 4.05639 10.83 4.18126C10.9433 4.2978 11 4.43931 11 4.6058C11 4.77229 10.9433 4.9138 10.83 5.03034L6.16844 9.82519C6.11179 9.88346 6.04906 9.92716 5.98027 9.9563C5.91148 9.98543 5.84067 10 5.76783 10Z" fill="white"/>
          </svg>
          <Typography sx={{ fontSize: '12px', color: '#128937', fontWeight: 500 }}>Passed</Typography>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="14" height="14" rx="7" fill="#C5221F"/>
            <path d="M4.5 10L4 9.5L6.5 7L4 4.5L4.5 4L7 6.5L9.5 4L10 4.5L7.5 7L10 9.5L9.5 10L7 7.5L4.5 10Z" fill="white"/>
          </svg>
          <Typography sx={{ fontSize: '12px', color: '#C5221F', fontWeight: 500 }}>Failed</Typography>
        </>
      )}
    </Box>
  );

  const parseParameters = (params: string): Record<string, string> | null => {
    if (!params || params === '-') return null;
    try {
      const parsed = JSON.parse(params);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          result[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return Object.keys(result).length > 0 ? result : null;
      }
    } catch {
      // not valid JSON
    }
    return null;
  };

  const renderCellContent = (col: ColumnDef, row: RuleData, isRowExpanded: boolean) => {
    if (col.key === 'statusLabel') return renderStatusCell(row);

    const textStyle = {
      fontFamily: '"Google Sans", sans-serif',
      fontWeight: 400,
      fontSize: '12px',
      lineHeight: '16px',
      letterSpacing: '0.1px',
      color: '#1F1F1F',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      maxWidth: '100%',
    };

    // Query column: truncated when collapsed, full text when expanded
    if (col.key === 'failingRowsQuery') {
      if (!row.failingRowsQuery) return null;
      if (isRowExpanded) {
        return (
          <Typography sx={{ ...textStyle, overflow: 'visible', whiteSpace: 'normal', wordBreak: 'break-all' }}>
            {row.failingRowsQuery}
          </Typography>
        );
      }
      return (
        <OverflowTooltip text={row.failingRowsQuery}>
          <Typography sx={{ ...textStyle, width: '100%', minWidth: 0 }}>
            {row.failingRowsQuery}
          </Typography>
        </OverflowTooltip>
      );
    }

    // Parameters column: horizontal key [value] when collapsed, vertical key-value list when expanded
    if (col.key === 'parameters') {
      const val = String(row[col.key] || '');
      const params = parseParameters(row.parameters);

      if (isRowExpanded && params) {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {Object.entries(params).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', maxWidth: '240px' }}>
                <Typography sx={{ fontSize: '13px', color: '#444746', fontWeight: 400, whiteSpace: 'nowrap' }}>
                  {key}
                </Typography>
                <Typography sx={{ fontSize: '13px', color: '#1F1F1F', fontWeight: 400, whiteSpace: 'nowrap' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        );
      }

      if (params) {
        const paramEntries = Object.entries(params);
        const tooltipContent = (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
            {paramEntries.map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', gap: '8px' }}>
                <Typography sx={{ fontSize: '12px', color: '#E0E0E0', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {key}:
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#fff', wordBreak: 'break-all' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        );

        return (
          <Tooltip
            title={tooltipContent}
            slotProps={{
              popper: { modifiers: [{ name: 'offset', options: { offset: [0, -8] } }] },
            }}
          >
            <Box sx={{
              display: 'flex',
              gap: '8px',
              overflow: 'hidden',
              width: '100%',
            }}>
              <Typography component="span" sx={{ fontSize: '12px', color: '#1F1F1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {paramEntries.map(([key, value], idx) => (
                  <React.Fragment key={key}>
                    {idx > 0 && '    '}
                    {key}{' '}
                    <Typography component="span" sx={{ fontSize: '12px', fontWeight: 700, color: '#1F1F1F' }}>
                      [{value}]
                    </Typography>
                  </React.Fragment>
                ))}
              </Typography>
            </Box>
          </Tooltip>
        );
      }

      if (isRowExpanded) {
        return (
          <Typography sx={{ ...textStyle, overflow: 'visible', whiteSpace: 'normal', wordBreak: 'break-all' }}>
            {val}
          </Typography>
        );
      }

      return (
        <Typography sx={textStyle}>{val}</Typography>
      );
    }

    return (
      <OverflowTooltip text={String(row[col.key] || '')}>
        <Typography sx={{ ...textStyle, width: '100%', minWidth: 0 }}>
          {String(row[col.key] || '')}
        </Typography>
      </OverflowTooltip>
    );
  };

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      padding: "0px",
      flex: "none",
      alignSelf: "stretch",
      flexGrow: 0,
      border: "1px solid #ECEEF4",
      borderRadius: "12px",
      overflow: "hidden",
      backgroundColor: "#FFFFFF",
      width: "100%",
      minWidth: 0,
      marginBottom: "10px",
    }}>
      {/* Header */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        padding: "24px 24px 16px 24px",
        width: "100%",
        boxSizing: "border-box",
        justifyContent: "space-between",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Box sx={{ width: "32px", height: "32px", background: "#EAEEFA", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RuleOutlined sx={{ fontSize: "20px", color: "#0B57D0" }} />
          </Box>
          <Typography sx={{
            fontFamily: '"Google Sans", sans-serif',
            fontWeight: 600,
            fontSize: "18px",
            color: "#3D4151",
          }}>
            Current Rules
          </Typography>
          <Tooltip title="Current rules signifies the rules applied to define and run data quality checks on the asset" slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
            <InfoOutline sx={{ width: '18px', height: '18px', opacity: 0.9, color: "#7D7D7D" }} />
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ width: "calc(100% - 48px)", borderColor: "#E8EBEF", margin: "0px 24px" }} />

      {/* Filter Bar + Table */}
      <Box sx={{ padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
            <FilterBar
              filterText={filterText}
              onFilterTextChange={setFilterText}
              propertyNames={FILTER_PROPERTIES}
              getPropertyValues={getPropertyValues}
              activeFilters={activeFilters}
              onActiveFiltersChange={setActiveFilters}
              placeholder="Enter property name or value"
              marginLeft="0px"
              sx={{ padding: '0.5rem 0.5rem 0.5rem 0' }}
            />
            <Box sx={{
              overflow: 'hidden',
              marginTop: '0px',
            }}>
              <Box sx={{
                width: '100%',
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 420px)',
                '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                '&::-webkit-scrollbar-track': { backgroundColor: 'transparent', borderRadius: '10px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#a1a1a1ff', borderRadius: '10px' },
                '&::-webkit-scrollbar-thumb:hover': { background: '#7c7c7d' },
              }}>
                {/* Header Row */}
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  padding: '0px 12px',
                  borderBottom: '1px solid #DADCE0',
                }}>
                  {/* Empty header for expand icon column */}
                  <div style={{ ...headerCellStyle, width: '28px', flexShrink: 0 }} />
                  {COLUMNS.map((col, colIdx) => {
                    const isLastCol = col.key === 'failingRowsQuery';
                    const colStyle: React.CSSProperties = isLastCol
                      ? { flex: 1, minWidth: 0, overflow: 'hidden' }
                      : { width: `${columnWidths[colIdx]}px`, flexShrink: 0 };

                    return (
                      <div key={col.key} style={{ ...headerCellStyle, ...colStyle, paddingLeft: colIdx > 0 ? '12px' : '0px' }}>
                        {col.sortable ? (
                          <Tooltip title={getSortTooltip(col.key as SortableField)} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                            <Box
                              role="button"
                              onClick={() => handleToggleSort(col.key as SortableField)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                borderRadius: '8px 8px 0 0',
                                padding: '6px 8px',
                                flex: 1,
                                alignSelf: 'stretch',
                                transition: 'background-color 0.2s ease',
                                '&:hover': { backgroundColor: '#F8F9FA' },
                              }}
                            >
                              <span>{col.header}</span>
                              {sortIcon(col.key as SortableField)}
                            </Box>
                          </Tooltip>
                        ) : (
                          <span style={{ padding: '6px 8px', display: 'block' }}>{col.header}</span>
                        )}
                        {!isLastCol && (
                          <ResizeHandle
                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(colIdx, e); }}
                            isActive={activeIndex === colIdx}
                            darkMode={false}
                          />
                        )}
                      </div>
                    );
                  })}
                  {/* Empty header for copy icon column */}
                  <div style={{ ...headerCellStyle, width: '36px', flexShrink: 0 }} />
                </Box>

                {/* Body Rows */}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {sortedData.length > 0 ? (
                    sortedData.map((row, rowIdx) => {
                      const isRowExpanded = expandedRows.has(row.id);
                      const hasExpandableContent = !!row.failingRowsQuery || (row.parameters !== '-' && row.parameters !== '');
                      return (
                        <Box
                          key={row.id}
                          sx={{
                            position: 'relative',
                            zIndex: 0,
                            ...(rowIdx < sortedData.length - 1 && {
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '1px',
                                backgroundColor: '#DADCE0',
                              },
                            }),
                          }}
                        >
                          {/* Main row */}
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: isRowExpanded ? 'flex-start' : 'center',
                              minHeight: '52px',
                              padding: isRowExpanded ? '18px 12px 20px 12px' : '0px 12px',
                              position: 'relative',
                              zIndex: 0,
                              cursor: hasExpandableContent ? 'pointer' : 'default',
                              '&:hover::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: '#F8F9FA',
                                zIndex: -1,
                              },
                            }}
                            onClick={() => hasExpandableContent && toggleRowExpand(row.id)}
                          >
                            {/* Expand icon column */}
                            <div style={{ ...bodyCellStyle, width: '28px', flexShrink: 0, justifyContent: 'center' }}>
                              {hasExpandableContent && (
                                <ChevronRight
                                  sx={{
                                    fontSize: '20px',
                                    color: '#575757',
                                    transform: isRowExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                  }}
                                />
                              )}
                            </div>
                            {COLUMNS.map((col, colIdx) => {
                              const isLastCol = col.key === 'failingRowsQuery';
                              const colStyle: React.CSSProperties = isLastCol
                                ? { flex: 1, minWidth: 0, overflow: 'hidden' }
                                : { width: `${columnWidths[colIdx]}px`, flexShrink: 0 };

                              return (
                                <div
                                  key={col.key}
                                  style={{
                                    ...bodyCellStyle,
                                    ...colStyle,
                                    paddingLeft: colIdx > 0 ? '20px' : '8px',
                                    paddingRight: '4px',
                                  }}
                                >
                                  {renderCellContent(col, row, isRowExpanded)}
                                </div>
                              );
                            })}
                            {/* Copy icon column */}
                            <div style={{ ...bodyCellStyle, width: '36px', flexShrink: 0, justifyContent: 'center' }}>
                              {row.failingRowsQuery && (
                                <Tooltip title="Copy query" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleCopyQuery(row.failingRowsQuery, e)}
                                    sx={{
                                      padding: '6px',
                                      backgroundColor: '#F1F3F4',
                                      '&:hover': { backgroundColor: '#E0E0E0' },
                                      width: '32px',
                                      height: '32px',
                                    }}
                                  >
                                    <ContentCopy sx={{ fontSize: '14px', color: '#5F6368' }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </div>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Box sx={{ padding: '48px', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '14px', color: '#0C1226CC' }}>
                        No data matches the applied filters
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
          </Box>
      </Box>
    </Box>
  );
};

export default CurrentRules;
