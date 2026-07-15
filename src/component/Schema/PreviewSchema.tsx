import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Box,
} from '@mui/material';
import { type SxProps, type Theme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from './ResizeHandle';

/**
 * @file PreviewSchema.tsx
 * @description
 * This component is responsible for extracting and displaying the schema of a
 * data entry in a tabular format using MUI Table components with resizable columns.
 *
 * It takes a complex `entry` object, finds the schema aspect by parsing the
 * `entry.entryType` (e.g., "table.global.schema"), and transforms the nested
 * schema field data into a flat array of `rows`. It then renders columns
 * (Name, Type, Mode) in a table matching the SearchTableView design.
 *
 * If no schema data is found in the `entry` prop, it displays a
 * "No schema data available" message.
 *
 * @param {PreviewSchemaProps} props - The props for the component.
 * @param {object} props.entry - The data entry object, which must contain
 * `entryType` and the corresponding schema aspect data within `entry.aspects`.
 * @param {SxProps<Theme>} [props.sx] - (Optional) Material-UI SX props
 * to be passed down to the `TableContainer` for custom styling.
 *
 * @returns {React.ReactElement} A React element displaying the schema in a
 * table or a fallback message if no schema data is found.
 */

interface SchemaField {
  structValue: {
    fields: {
      name?: { stringValue?: string };
      dataType?: { stringValue?: string };
      mode?: { stringValue?: string };
    };
  };
}

interface SchemaRow {
  id: number;
  name: string;
  type: string;
  mode: string;
}

interface PreviewSchemaProps {
  entry: {
    entryType?: string;
    aspects?: {
      [key: string]: {
        data?: {
          fields?: {
            fields?: {
              listValue?: {
                values?: SchemaField[];
              };
            };
          };
        };
      };
    };
  };
  sx?: SxProps<Theme>;
}

const OverflowTooltip: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => {
  const [isOverflowed, setIsOverflowed] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    const el = textRef.current;
    if (el) {
      setIsOverflowed(el.scrollWidth > el.clientWidth);
    }
  }, []);

  return (
    <Tooltip title={isOverflowed ? title : ''} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
      <span
        ref={textRef}
        onMouseEnter={handleMouseEnter}
        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {children}
      </span>
    </Tooltip>
  );
};

const COLUMN_CONFIGS = [
  { key: 'name', initialWidth: 200, minWidth: 80 },
  { key: 'type', initialWidth: 150, minWidth: 60 },
  { key: 'mode', initialWidth: 150, minWidth: 60 },
];

const WIDTH_RATIOS = [0.4, 0.3, 0.3];

const PreviewSchema: React.FC<PreviewSchemaProps> = ({ entry, sx }) => {
  const mode = useSelector((state: any) => state.user.mode) as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const { columnWidths, activeIndex, handleMouseDown, setColumnWidths } = useColumnResize({
    columns: COLUMN_CONFIGS,
    mode: 'coupled',
  });

  const [sortColumn, setSortColumn] = useState<'name' | 'type' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useLayoutEffect(() => {
    if (containerRef.current) {
      const totalWidth = containerRef.current.clientWidth;
      if (totalWidth > 0) {
        setColumnWidths(WIDTH_RATIOS.map(r => Math.floor(totalWidth * r)));
      }
    }
  }, [setColumnWidths]);

  const handleToggleSort = (column: 'name' | 'type') => {
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

  const getSortTooltip = (column: 'name' | 'type'): string => {
    if (sortColumn === column && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === column && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  const splitType = entry?.entryType?.split('/');
  const number = splitType && splitType.length > 1 ? splitType[1] : 'table';
  const schemaData = entry?.aspects?.[`${number}.global.schema`]?.data?.fields?.fields?.listValue?.values;

  const rows: SchemaRow[] = (schemaData ?? []).map((field: SchemaField, index: number) => ({
    id: index + 1,
    name: field.structValue?.fields?.name?.stringValue ?? '',
    type: field.structValue?.fields?.dataType?.stringValue ?? '',
    mode: field.structValue?.fields?.mode?.stringValue ?? '',
  }));

  const sortedRows = React.useMemo(() => {
    if (!sortColumn) return rows;
    const sorted = [...rows].sort((a, b) =>
      a[sortColumn].localeCompare(b[sortColumn], undefined, { sensitivity: 'base' })
    );
    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [rows, sortColumn, sortOrder]);

  const headerSx = {
    fontFamily: '"Google Sans", sans-serif',
    fontSize: '12px',
    fontWeight: 500,
    color: mode === 'dark' ? '#dedfe0' : '#444746',
    position: 'relative' as const,
  };

  const bodySx = {
    fontFamily: '"Google Sans", sans-serif',
    fontSize: '12px',
    fontWeight: 400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const isDark = mode === 'dark';

  if (!entry?.entryType || !schemaData) {
    return <div>No schema data available</div>;
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', fontSize: '14px', fontFamily: 'Google Sans, sans-serif', color: isDark ? '#9aa0a6' : '#0C1226CC' }}>
        No data matches the applied filters
      </div>
    );
  }

  return (
    <TableContainer
      ref={containerRef}
      component={Paper}
      sx={{
        backgroundColor: isDark ? '#131314' : '#FFFFFF',
        boxShadow: 'none',
        borderRadius: 0,
        overflowX: 'hidden',
        width: '100%',
        ...sx as any,
      }}
    >
      <Table sx={{ width: '100%', tableLayout: 'fixed' }} aria-label="schema table">
        <colgroup>
          {columnWidths.map((w, i) => {
            const total = columnWidths.reduce((sum, cw) => sum + cw, 0);
            const pct = total > 0 ? (w / total) * 100 : WIDTH_RATIOS[i] * 100;
            return <col key={i} style={{ width: `${pct}%` }} />;
          })}
        </colgroup>
        <TableHead>
          <TableRow
            sx={{
              position: 'relative',
              '& .MuiTableCell-root': {
                borderBottom: 'none',
                padding: '12px 8px 4px',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                left: '0px',
                right: '0px',
                height: '1px',
                backgroundColor: isDark ? '#3c4043' : '#DADCE0',
              },
            }}
          >
            <TableCell sx={headerSx}>
              <Tooltip title={getSortTooltip('name')} sx={{ flex: 1 }} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={() => handleToggleSort('name')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    margin: '-4px -8px',
                    flex: 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                  }}
                >
                  <span>Name</span>
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      opacity: sortColumn === 'name' ? 1 : 0,
                      transform: (sortColumn === 'name' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="12" fill={isDark ? '#004a77' : '#C2E7FF'}/>
                      <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill={isDark ? '#8ab4f8' : '#004A77'}/>
                    </svg>
                  </Box>
                </Box>
              </Tooltip>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(0, e); }}
                isActive={activeIndex === 0}
                darkMode={isDark}
              />
            </TableCell>
            <TableCell sx={headerSx}>
              <Tooltip title={getSortTooltip('type')} sx={{ flex: 1 }} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={() => handleToggleSort('type')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    margin: '-4px -8px',
                    flex: 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                  }}
                >
                  <span>Type</span>
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      opacity: sortColumn === 'type' ? 1 : 0,
                      transform: (sortColumn === 'type' && sortOrder === 'desc') ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="12" fill={isDark ? '#004a77' : '#C2E7FF'}/>
                      <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill={isDark ? '#8ab4f8' : '#004A77'}/>
                    </svg>
                  </Box>
                </Box>
              </Tooltip>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                isActive={activeIndex === 1}
                darkMode={isDark}
              />
            </TableCell>
            <TableCell sx={headerSx}>Mode</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow
              key={row.id}
              sx={{
                position: 'relative',
                height: '40px',
                '& .MuiTableCell-root': {
                  borderBottom: 'none',
                  padding: '10px 8px',
                },
                '&:hover .MuiTableCell-root': {
                  backgroundColor: isDark ? '#3c4043' : '#F8F9FA',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '0px',
                  right: '0px',
                  height: '1px',
                  backgroundColor: isDark ? '#3c4043' : '#DADCE0',
                },
              }}
            >
              <TableCell sx={{ ...bodySx, color: isDark ? '#dedfe0' : '#1F1F1F' }}>
                <OverflowTooltip title={row.name}>{row.name}</OverflowTooltip>
              </TableCell>
              <TableCell sx={{ ...bodySx, color: isDark ? '#dedfe0' : '#575757' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0px 8px',
                    height: '20px',
                    maxWidth: '100%',
                    background: isDark ? '#394457' : '#E9EEF6',
                    borderRadius: '8px',
                    fontFamily: '"Google Sans", sans-serif',
                    fontWeight: 500,
                    fontSize: '12px',
                    lineHeight: '16px',
                    letterSpacing: '0.1px',
                    color: isDark ? '#dedfe0' : '#575757',
                    boxSizing: 'border-box' as const,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.type}
                </span>
              </TableCell>
              <TableCell sx={{ ...bodySx, color: isDark ? '#dedfe0' : '#575757' }}>
                <OverflowTooltip title={row.mode}>{row.mode}</OverflowTooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PreviewSchema;
