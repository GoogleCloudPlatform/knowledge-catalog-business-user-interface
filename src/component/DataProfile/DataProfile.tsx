import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  Drawer,
  Divider
} from '@mui/material';
import {
  InfoOutline,
  KeyboardArrowDown,
  ChevronRight,
  AnalyticsOutlined
} from '@mui/icons-material';
import FilterBar, { type ActiveFilter, type PropertyConfig } from '../Common/FilterBar';
import DataProfileConfigurationsPanel from './DataProfileConfigurationsPanel';
import DataProfileSkeleton from './DataProfileSkeleton';
import { useAuth } from '../../auth/AuthProvider';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { fetchDataScan, selectScanData, selectScanStatus, selectIsScanLoading } from '../../features/dataScan/dataScanSlice';
import { useAccessRequest } from '../../contexts/AccessRequestContext';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from '../Schema/ResizeHandle';

interface ProfileData {
  columnName: string;
  type: string;
  nullPercentage: string;
  uniquePercentage: string;
  statistics: {
    [key: string]: string | number | number[];
  };
  topValues: Array<{
    value: string;
    percentage: string;
    rawPercentage: number;
    count: number;
  }>;
}

interface DataProfileProps {
  scanName: string | null;
  allScansStatus: string;
}

const FILTER_PROPERTIES: PropertyConfig[] = [
  { name: 'Column Name', mode: 'text' },
  { name: 'Type', mode: 'dropdown' },
  { name: 'Null % less than', mode: 'text', hint: 'Enter a number, e.g. 5 shows rows where Null % < 5%' },
  { name: 'Unique % more than', mode: 'text', hint: 'Enter a number, e.g. 50 shows rows where Unique % > 50%' },
];

let _measureCtx: CanvasRenderingContext2D | null = null;
const measureLabelWidth = (text: string): number => {
  if (!_measureCtx) {
    const canvas = document.createElement('canvas');
    _measureCtx = canvas.getContext('2d');
  }
  if (!_measureCtx) return text.length * 7;
  _measureCtx.font = '400 12px sans-serif';
  return _measureCtx.measureText(text).width;
};


const COLUMN_CONFIGS = [
  { key: 'columnName',       initialWidth: 175, minWidth: 100 },
  { key: 'type',             initialWidth: 145,  minWidth: 70  },
  { key: 'nullPercentage',   initialWidth: 155,  minWidth: 60  },
  { key: 'uniquePercentage', initialWidth: 155,  minWidth: 60  },
  { key: 'statistics',       initialWidth: 250, minWidth: 120 },
  { key: 'topValues',        initialWidth: 390, minWidth: 200 },
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

const DataProfile: React.FC<DataProfileProps> = ({ scanName, allScansStatus }) => {
  const isParentLoading = allScansStatus !== 'succeeded';

  const { user } = useAuth();
  const id_token = user?.token || '';
  const dispatch = useDispatch<AppDispatch>();
  const { setAccessPanelOpen } = useAccessRequest();
  const [loading, setLoading] = useState<boolean>(true);
  const [dataProfileAvailable, setDataProfileAvailable] = useState<boolean>(false);

  const dataProfileScan = useSelector(selectScanData(scanName || ''));
  const dataProfileScanStatus = useSelector(selectScanStatus(scanName || ''));
  const isScanLoading = useSelector(selectIsScanLoading(scanName || ''));

  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'flex',
  });

  const getStatsColumnKey = (type: string) => {
    switch (type) {
      case 'STRING': return 'stringProfile';
      case 'INTEGER': return 'integerProfile';
      case 'FLOAT': return 'doubleProfile';
      case 'DOUBLE': return 'doubleProfile';
      case 'NUMERIC': return 'numericProfile';
      case 'BOOLEAN': return 'booleanProfile';
      case 'TIMESTAMP':
      case 'DATE': return 'dateProfile';
      default: return 'otherProfile';
    }
  };

  useEffect(() => {
    if (scanName && id_token && !dataProfileScan && !isScanLoading) {
      dispatch(fetchDataScan({ name: scanName, id_token: id_token }));
    } else if (scanName && dataProfileScan) {
      setDataProfileAvailable(true);
      setLoading(false);
    } else if (!scanName) {
      setDataProfileAvailable(false);
      setLoading(false);
    }
  }, [scanName, id_token, dataProfileScan, isScanLoading, dispatch]);

  useEffect(() => {
    if (dataProfileScanStatus === 'succeeded' && dataProfileScan) {
      setDataProfileAvailable(true);
      setLoading(false);
    } else if (dataProfileScanStatus === 'failed') {
      setDataProfileAvailable(false);
      setLoading(false);
    } else if (dataProfileScanStatus === 'idle' && !scanName) {
      setLoading(false);
    }
  }, [dataProfileScanStatus, dataProfileScan, scanName]);

  const [isConfigurationsOpen, setIsConfigurationsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [hoveredBars, setHoveredBars] = useState<Record<number, number | null>>({});

  useEffect(() => {
    setAccessPanelOpen(isConfigurationsOpen);
  }, [isConfigurationsOpen, setAccessPanelOpen]);

  const profileData: ProfileData[] = useMemo(() => {
    const result: ProfileData[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataProfileScan?.scan?.dataProfileResult?.profile?.fields.forEach((profile: any) => {
      result.push({
        columnName: profile.name,
        type: profile.type,
        nullPercentage: profile.profile.nullRatio ? `${(profile.profile.nullRatio * 100).toFixed(2)}%` : '0%',
        uniquePercentage: profile.profile.distinctRatio ? `${(profile.profile.distinctRatio * 100).toFixed(2)}%` : '0%',
        statistics: Object.fromEntries(
          Object.entries(profile.profile[getStatsColumnKey(profile.type)] || {}).map(([key, value]) => [key, value as string])
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        topValues: (profile.profile.topNValues || []).map((item: any) => ({
          value: item.value,
          rawPercentage: item.ratio ? item.ratio * 100 : 0,
          percentage: item.ratio ? `${(item.ratio * 100).toFixed(2)}%` : '0%',
          count: item.count ?? 0,
        }))
      });
    });
    return result;
  }, [dataProfileScan]);

  const getPropertyValues = (property: string): string[] => {
    const values = new Set<string>();
    profileData.forEach(row => {
      if (property === 'Type') values.add(row.type);
    });
    return Array.from(values).sort();
  };

  const filteredData = useMemo(() => {
    let data = profileData;

    if (filterText) {
      const lower = filterText.toLowerCase();
      data = data.filter(row =>
        row.columnName.toLowerCase().includes(lower) ||
        row.type.toLowerCase().includes(lower) ||
        row.nullPercentage.toLowerCase().includes(lower) ||
        row.uniquePercentage.toLowerCase().includes(lower) ||
        Object.values(row.statistics).some(s => String(s).toLowerCase().includes(lower)) ||
        row.topValues.some(t => t.value.toLowerCase().includes(lower) || t.percentage.toLowerCase().includes(lower))
      );
    }

    if (activeFilters.length > 0) {
      data = data.filter(row =>
        activeFilters.every(filter => {
          const { property, values } = filter;
          if (values.length === 0) return true;
          switch (property) {
            case '': return values.some(v => {
              const lower = v.toLowerCase();
              return row.columnName.toLowerCase().includes(lower) ||
                row.type.toLowerCase().includes(lower) ||
                row.nullPercentage.toLowerCase().includes(lower) ||
                row.uniquePercentage.toLowerCase().includes(lower) ||
                Object.values(row.statistics).some(s => String(s).toLowerCase().includes(lower)) ||
                row.topValues.some(t => t.value.toLowerCase().includes(lower) || t.percentage.toLowerCase().includes(lower));
            });
            case 'Column Name': return values.some(v => row.columnName.toLowerCase().includes(v.toLowerCase()));
            case 'Type': return values.includes(row.type);
            case 'Null % less than': return values.some(v => { const threshold = parseFloat(v); return !isNaN(threshold) && parseFloat(row.nullPercentage) < threshold; });
            case 'Unique % more than': return values.some(v => { const threshold = parseFloat(v); return !isNaN(threshold) && parseFloat(row.uniquePercentage) > threshold; });
            default: return true;
          }
        })
      );
    }

    if (sortColumn) {
      data = [...data].sort((a, b) => {
        let aVal: string | number, bVal: string | number;
        switch (sortColumn) {
          case 'columnName': aVal = a.columnName.toLowerCase(); bVal = b.columnName.toLowerCase(); break;
          case 'type': aVal = a.type.toLowerCase(); bVal = b.type.toLowerCase(); break;
          case 'nullPercentage': aVal = parseFloat(a.nullPercentage); bVal = parseFloat(b.nullPercentage); break;
          case 'uniquePercentage': aVal = parseFloat(a.uniquePercentage); bVal = parseFloat(b.uniquePercentage); break;
          default: return 0;
        }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return data;
  }, [profileData, activeFilters, filterText, sortColumn, sortOrder]);

  const totalTableWidth = columnWidths.reduce((sum, w) => sum + w, 0) + 28 + 24; // 28px expand icon + 24px row padding

  const toggleRowExpand = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const getSortTooltip = (column: string): string => {
    const isNumeric = column === 'nullPercentage' || column === 'uniquePercentage';
    if (sortColumn === column && sortOrder === 'asc') return isNumeric ? 'Sort high to low' : 'Sort Z to A';
    if (sortColumn === column && sortOrder === 'desc') return '';
    return isNumeric ? 'Sort low to high' : 'Sort A to Z';
  };

  const handleToggleSort = (column: string) => {
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

  const sortIcon = (column: string) => (
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

  const formatStatKey = (key: string) =>
    key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());

  const formatStatValue = (value: string | number) =>
    typeof value === 'number' ? (Math.floor(value * 100) / 100).toString() : value;

  const renderStatisticsCell = (row: ProfileData, isExpanded: boolean) => {
    const entries = Object.entries(row.statistics);
    if (entries.length === 0) return <Typography sx={{ fontSize: '20px', color: '#9E9E9E' }}>-</Typography>;

    const fmt = (n: number) => String(Math.floor(n * 100) / 100);

    const collapsedEntries: [string, string][] = entries.map(([k, v]) =>
      k === 'quartiles' && Array.isArray(v)
        ? ['Quartiles', v.map(fmt).join(', ')]
        : [formatStatKey(k), String(formatStatValue(v as string | number))]
    );

    const expandedEntries: [string, string][] = entries.flatMap(([k, v]) => {
      if (k === 'quartiles' && Array.isArray(v)) {
        return [
          ['Lower Quartile', fmt(v[0])],
          ['Median Quartile', fmt(v[1])],
          ['Upper Quartile', fmt(v[2])],
        ] as [string, string][];
      }
      return [[formatStatKey(k), String(formatStatValue(v as string | number))]] as [string, string][];
    });

    if (isExpanded) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {expandedEntries.map(([key, value]) => (
            <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', maxWidth: '160px' }}>
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

    const tooltipContent = (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
        {collapsedEntries.map(([key, value]) => (
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
      <Tooltip title={tooltipContent} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -8] } }] } }}>
        <Box sx={{ display: 'flex', overflow: 'hidden', width: '100%' }}>
          <Typography component="span" sx={{ fontSize: '12px', color: '#1F1F1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
            {collapsedEntries.map(([key, value], idx) => (
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
  };

  const renderBarChart = (row: ProfileData, rowIndex: number) => {
    if (row.topValues.length === 0) return null;

    const maxPct = Math.max(...row.topValues.map(t => t.rawPercentage), 0);
    if (maxPct === 0) return null;

    const labelWidth = Math.min(
      Math.ceil(Math.max(...row.topValues.map(item => measureLabelWidth(item.value)))) + 8,
      Math.ceil(measureLabelWidth('MMMMM')) + 8
    );
    const pctWidth = Math.ceil(
      Math.max(...row.topValues.map(item => measureLabelWidth(`${item.percentage} (${item.count})`)))
    ) + 4;
    const maxBarWidth = Math.max(columnWidths[5] - 20 - 4 - labelWidth - 24 - pctWidth, 80);

    return (
      <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', flexDirection: 'column' }}>
        {row.topValues.map((item, vi) => {
          const pct = item.rawPercentage;
          const barWidth = maxPct < 0.01 ? (pct / 100) * maxBarWidth : (pct / maxPct) * maxBarWidth;
          const isHovered = hoveredBars[rowIndex] === vi;

          return (
            <Box
              key={vi}
              sx={{ display: 'flex', alignItems: 'center', marginBottom: '11px', cursor: 'default' }}
              onMouseEnter={() => setHoveredBars(prev => ({ ...prev, [rowIndex]: vi }))}
              onMouseLeave={() => setHoveredBars(prev => ({ ...prev, [rowIndex]: null }))}
            >
              {/* Label: left-aligned */}
              <Tooltip title={measureLabelWidth(item.value) > labelWidth - 8 ? item.value : ''} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Typography sx={{
                  width: `${labelWidth}px`,
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#444746',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}>
                  {item.value}
                </Typography>
              </Tooltip>

              {/* Gap: 16px */}
              <Box sx={{ width: '16px', flexShrink: 0 }} />

              {/* Bar container: fixed width — prevents % column from ever overlapping */}
              <Box sx={{ width: `${maxBarWidth}px`, flexShrink: 0 }}>
                <Box sx={{
                  width: `${barWidth}px`,
                  height: '22px',
                  backgroundColor: isHovered ? '#1558B0' : '#1A73E8',
                  borderRadius: '2px',
                  transition: 'background-color 0.15s ease',
                  minWidth: barWidth > 0 ? '2px' : '0px',
                }} />
              </Box>

              {/* Gap: 8px */}
              <Box sx={{ width: '8px', flexShrink: 0 }} />

              {/* Percentage: right-aligned; count on hover shifts % left naturally */}
              <Box sx={{ width: `${pctWidth}px`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <Typography sx={{ fontSize: '12px', color: '#444746', whiteSpace: 'nowrap' }}>
                  {item.rawPercentage < 0.01 ? '(<0.01%)' : item.percentage}
                  {isHovered && item.count > 0 && (
                    <Typography component="span" sx={{ fontSize: '12px', color: '#9E9E9E', marginLeft: '4px' }}>
                      ({item.count})
                    </Typography>
                  )}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {/* X-axis: aligned under bar area only */}
        <Box sx={{ display: 'flex', marginLeft: `${labelWidth + 16}px`, width: `${maxBarWidth}px`, justifyContent: 'space-between', marginTop: '4px' }}>
          <Typography sx={{ fontSize: '11px', color: '#9E9E9E' }}>0%</Typography>
          <Typography sx={{ fontSize: '11px', color: '#9E9E9E' }}>{maxPct < 0.01 ? '50%' : `${(maxPct / 2).toFixed(1)}%`}</Typography>
          <Typography sx={{ fontSize: '11px', color: '#9E9E9E' }}>{maxPct < 0.01 ? '100%' : `${maxPct.toFixed(1)}%`}</Typography>
        </Box>
      </Box>
    );
  };

  if (loading || isScanLoading || isParentLoading) {
    return <DataProfileSkeleton />;
  }

  if (!dataProfileAvailable || profileData.length === 0) {
    return (
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Box sx={{
          display: "flex",
          justifyContent: 'center',
          alignItems: 'center',
          border: "1px solid #ECEEF4",
          borderRadius: "12px",
          backgroundColor: "#FFFFFF",
          minHeight: '500px',
          width: "100%"
        }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 400, color: '#0C1226CC' }}>
            No published Data Profile available for this entry
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, position: 'relative' }}>
      <Box sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "0px",
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
        {/* Card Header */}
        <Box 
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "24px 24px 16px 24px",
            width: "100%",
            boxSizing: "border-box",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Box sx={{ width: "32px", height: "32px", background: "#EAEEFA", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AnalyticsOutlined sx={{ fontSize: "20px", color: "#022FCD" }} />
            </Box>
            <Typography sx={{
              fontFamily: '"Google Sans", sans-serif',
              fontWeight: 600,
              fontSize: "18px",
              color: "#3D4151",
            }}>
              Profile Results
            </Typography>
            <Tooltip title="Profile results provide an analysis of the data's characteristics, such as null percentages, unique value counts, and statistical properties like averages and distributions for columns" slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
              <InfoOutline sx={{ width: '18px', height: '18px', opacity: 0.9, color: "#7D7D7D" }} />
            </Tooltip>
          </Box>
          <Button
            onClick={() => setIsConfigurationsOpen(true)}
            sx={{
              color: '#0B57D0',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 500,
              padding: '6px 0',
              minWidth: 'auto',
              '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
            }}
          >
            Configurations
            <KeyboardArrowDown sx={{ fontSize: '20px', width: '20px', height: '20px', marginLeft: '2px', transform: 'rotate(-90deg)' }} />
          </Button>
        </Box>

        <Divider sx={{ width: "calc(100% - 48px)", borderColor: "#E8EBEF", margin: "0px 24px" }} />

        {/* Content */}
        <>
          <Box sx={{ padding: '0 20px' }}>
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
            <Box sx={{ overflow: 'hidden' }}>
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
                  minWidth: `${totalTableWidth}px`,
                }}>
                  {/* Expand icon placeholder */}
                  <div style={{ ...headerCellStyle, width: '28px', flexShrink: 0 }} />

                  {/* Column Name (col 0 — no extra paddingLeft on div) */}
                  <div style={{ ...headerCellStyle, width: `${columnWidths[0]}px`, flexShrink: 0 }}>
                    <Tooltip title={getSortTooltip('columnName')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                      <Box
                        role="button"
                        onClick={() => handleToggleSort('columnName')}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                          borderRadius: '8px 8px 0 0', padding: '6px 8px',
                          flex: 1, alignSelf: 'stretch',
                          transition: 'background-color 0.2s ease',
                          '&:hover': { backgroundColor: '#F8F9FA' },
                        }}
                      >
                        <span>Column Name</span>
                        {sortIcon('columnName')}
                      </Box>
                    </Tooltip>
                    <ResizeHandle
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(0, e); }}
                      isActive={activeIndex === 0}
                      darkMode={false}
                    />
                  </div>

                  {/* Type (col 1 — paddingLeft: '12px' on div) */}
                  <div style={{ ...headerCellStyle, width: `${columnWidths[1]}px`, flexShrink: 0, paddingLeft: '12px' }}>
                    <Tooltip title={getSortTooltip('type')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                      <Box
                        role="button"
                        onClick={() => handleToggleSort('type')}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                          borderRadius: '8px 8px 0 0', padding: '6px 8px',
                          flex: 1, alignSelf: 'stretch',
                          transition: 'background-color 0.2s ease',
                          '&:hover': { backgroundColor: '#F8F9FA' },
                        }}
                      >
                        <span>Type</span>
                        {sortIcon('type')}
                      </Box>
                    </Tooltip>
                    <ResizeHandle
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                      isActive={activeIndex === 1}
                      darkMode={false}
                    />
                  </div>

                  {/* Null % (col 2) */}
                  <div style={{ ...headerCellStyle, width: `${columnWidths[2]}px`, flexShrink: 0, paddingLeft: '12px' }}>
                    <Tooltip title={getSortTooltip('nullPercentage')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                      <Box
                        role="button"
                        onClick={() => handleToggleSort('nullPercentage')}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                          borderRadius: '8px 8px 0 0', padding: '6px 8px',
                          flex: 1, alignSelf: 'stretch',
                          transition: 'background-color 0.2s ease',
                          '&:hover': { backgroundColor: '#F8F9FA' },
                        }}
                      >
                        <span>Null %</span>
                        {sortIcon('nullPercentage')}
                      </Box>
                    </Tooltip>
                    <ResizeHandle
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(2, e); }}
                      isActive={activeIndex === 2}
                      darkMode={false}
                    />
                  </div>

                  {/* Unique % (col 3) */}
                  <div style={{ ...headerCellStyle, width: `${columnWidths[3]}px`, flexShrink: 0, paddingLeft: '12px' }}>
                    <Tooltip title={getSortTooltip('uniquePercentage')} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                      <Box
                        role="button"
                        onClick={() => handleToggleSort('uniquePercentage')}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                          borderRadius: '8px 8px 0 0', padding: '6px 8px',
                          flex: 1, alignSelf: 'stretch',
                          transition: 'background-color 0.2s ease',
                          '&:hover': { backgroundColor: '#F8F9FA' },
                        }}
                      >
                        <span>Unique %</span>
                        {sortIcon('uniquePercentage')}
                      </Box>
                    </Tooltip>
                    <ResizeHandle
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(3, e); }}
                      isActive={activeIndex === 3}
                      darkMode={false}
                    />
                  </div>

                  {/* Statistics (col 4 — not sortable) */}
                  <div style={{ ...headerCellStyle, width: `${columnWidths[4]}px`, flexShrink: 0, paddingLeft: '12px' }}>
                    <span style={{ padding: '6px 8px', display: 'block' }}>Statistics</span>
                    <ResizeHandle
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(4, e); }}
                      isActive={activeIndex === 4}
                      darkMode={false}
                    />
                  </div>

                  {/* Top 10 values (col 5 — not sortable, last — no ResizeHandle) */}
                  <div style={{ ...headerCellStyle, width: `${columnWidths[5]}px`, flexShrink: 0, paddingLeft: '12px' }}>
                    <span style={{ padding: '6px 8px', display: 'block' }}>Top 10 values</span>
                  </div>
                </Box>

                {/* Body Rows */}
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: `${totalTableWidth}px` }}>
                  {filteredData.length > 0 ? (
                    filteredData.map((row, index) => {
                      const isExpanded = expandedRows.has(index);
                      const isNotLast = index < filteredData.length - 1;

                      return (
                        <Box
                          key={`${row.columnName}-${index}`}
                          onClick={() => toggleRowExpand(index)}
                          sx={{
                            position: 'relative',
                            zIndex: 0,
                            cursor: 'pointer',
                            '&:hover::before': {
                              content: '""',
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: '#F8F9FA',
                              zIndex: -1,
                            },
                            ...(isNotLast && {
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
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: isExpanded ? 'flex-start' : 'center',
                              minHeight: '52px',
                              padding: isExpanded ? '18px 12px 20px 12px' : '0px 12px',
                              position: 'relative',
                              zIndex: 0,
                            }}
                          >
                            {/* Expand icon */}
                            <div style={{ ...bodyCellStyle, width: '28px', flexShrink: 0, justifyContent: 'center' }}>
                              <ChevronRight
                                sx={{
                                  fontSize: '20px',
                                  color: '#575757',
                                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                            </div>

                            {/* Column Name (col 0) */}
                            <div style={{ ...bodyCellStyle, width: `${columnWidths[0]}px`, flexShrink: 0, paddingLeft: '8px', paddingRight: '4px' }}>
                              <Tooltip title={measureLabelWidth(row.columnName) > columnWidths[0] - 12 ? row.columnName : ''} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                                <Typography sx={{
                                  fontSize: '12px',
                                  fontWeight: 400,
                                  color: '#1F1F1F',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  width: '100%',
                                }}>
                                  {row.columnName}
                                </Typography>
                              </Tooltip>
                            </div>

                            {/* Type (col 1) */}
                            <div style={{ ...bodyCellStyle, width: `${columnWidths[1]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px' }}>
                              <Box sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 8px',
                                backgroundColor: '#E9EEF6',
                                borderRadius: '8px',
                                height: '20px',
                              }}>
                                <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#575757', whiteSpace: 'nowrap' }}>
                                  {row.type}
                                </Typography>
                              </Box>
                            </div>

                            {/* Null % (col 2) */}
                            <div style={{ ...bodyCellStyle, width: `${columnWidths[2]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px' }}>
                              <Typography sx={{ fontSize: '12px', color: '#1F1F1F' }}>
                                {row.nullPercentage}
                              </Typography>
                            </div>

                            {/* Unique % (col 3) */}
                            <div style={{ ...bodyCellStyle, width: `${columnWidths[3]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px' }}>
                              <Typography sx={{ fontSize: '12px', color: '#1F1F1F' }}>
                                {row.uniquePercentage}
                              </Typography>
                            </div>

                            {/* Statistics (col 4) */}
                            <div style={{ ...bodyCellStyle, width: `${columnWidths[4]}px`, flexShrink: 0, paddingLeft: '20px', paddingRight: '4px', alignItems: 'flex-start' }}>
                              {renderStatisticsCell(row, isExpanded)}
                            </div>

                            {/* Top 10 values (col 5) */}
                            <div style={{ ...bodyCellStyle, width: `${columnWidths[5]}px`, flexShrink: 0, paddingLeft: isExpanded ? '20px' : '20px', paddingRight: '4px', alignItems: 'flex-start' }}>
                              {isExpanded
                                ? renderBarChart(row, index)
                                : (
                                  <Typography
                                    sx={{ fontSize: '12px', color: '#0B57D0', cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); toggleRowExpand(index); }}
                                  >
                                    Click to expand distribution
                                  </Typography>
                                )
                              }
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
        </>

        {/* Configurations Drawer */}
        <Drawer
          anchor="right"
          open={isConfigurationsOpen}
          onClose={() => setIsConfigurationsOpen(false)}
          PaperProps={{
            sx: {
              width: '612px',
              backgroundColor: '#ffffff',
              boxShadow: '-4px 0px 8px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <DataProfileConfigurationsPanel
            onClose={() => setIsConfigurationsOpen(false)}
            dataProfileScan={dataProfileScan}
          />
        </Drawer>
      </Box>
    </Box>
  );
};

export default DataProfile;
