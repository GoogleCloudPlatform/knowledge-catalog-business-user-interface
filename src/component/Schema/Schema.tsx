import React, { useState, useRef, useLayoutEffect } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useSelector } from 'react-redux';
import { useColumnResize } from '../../hooks/useColumnResize';
import ResizeHandle from './ResizeHandle';

/**
 * @file Schema.tsx
 * @description
 * This component renders a detailed view of the schema for a given data entry
 * in a custom flex-based table layout with tag chips for Type and Metadata Type.
 * Columns are resizable by dragging the border between column headers.
 *
 * @param {SchemaProps} props - The props for the component.
 * @param {any} props.entry - The data entry object with `entryType` and `aspects`.
 * @param {any} [props.sx] - Optional styling overrides.
 *
 * @returns {React.ReactElement} A table displaying the schema or a fallback message.
 */

interface SchemaProps {
  entry: any;
  isPreview?: boolean;
  sx?: any;
}

interface SchemaRow {
  id: number;
  name: string;
  type: string;
  metaDataType: string;
  mode: string;
  description: string;
}

const COLUMN_CONFIGS = [
  { key: 'name', initialWidth: 160, minWidth: 80 },
  { key: 'type', initialWidth: 160, minWidth: 80 },
  { key: 'metadataType', initialWidth: 200, minWidth: 100 },
  { key: 'mode', initialWidth: 140, minWidth: 80 },
];

const PREVIEW_COLUMN_CONFIGS = [
  { key: 'name', initialWidth: 160, minWidth: 80 },
  { key: 'type', initialWidth: 160, minWidth: 80 },
  { key: 'metadataType', initialWidth: 200, minWidth: 100 },
];

const PREVIEW_WIDTH_RATIOS = [0.35, 0.3, 0.35];

const headerCellStyle: React.CSSProperties = {
  fontFamily: '"Google Sans", sans-serif',
  fontWeight: 500,
  fontSize: '11px',
  lineHeight: '16px',
  letterSpacing: '0.1px',
  color: '#575757',
  display: 'flex',
  alignItems: 'center',
  padding: '8px 0px',
  position: 'relative',
};

const bodyCellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
};

const tagChipStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '0px 8px',
  height: '20px',
  background: '#E9EEF6',
  borderRadius: '8px',
  fontFamily: '"Google Sans", sans-serif',
  fontWeight: 500,
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '0.1px',
  color: '#575757',
  boxSizing: 'border-box' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
};

const Schema: React.FC<SchemaProps> = ({ entry, isPreview = false, sx }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mode = useSelector((state: any) => state.user.mode) as string;
  const isDark = mode === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<'name' | 'type' | 'metaDataType' | 'mode' | 'mode' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { columnWidths, activeIndex, handleMouseDown, setColumnWidths } = useColumnResize({
    columns: isPreview ? PREVIEW_COLUMN_CONFIGS : COLUMN_CONFIGS,
    mode: isPreview ? 'coupled' : 'flex',
  });

  useLayoutEffect(() => {
    if (isPreview && containerRef.current) {
      const totalWidth = containerRef.current.clientWidth;
      if (totalWidth > 0) {
        setColumnWidths(PREVIEW_WIDTH_RATIOS.map(r => Math.floor(totalWidth * r)));
      }
    }
  }, [isPreview, setColumnWidths]);

  const getColStyle = (index: number): React.CSSProperties => isPreview
    ? { width: `${PREVIEW_WIDTH_RATIOS[index] * 100}%`, flexShrink: 1, minWidth: 0, overflow: 'hidden' }
    : { width: `${columnWidths[index]}px`, flexShrink: 0 };

  const handleToggleSort = (column: 'name' | 'type' | 'metaDataType' | 'mode') => {
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

  const getSortTooltip = (column: 'name' | 'type' | 'metaDataType' | 'mode'): string => {
    if (sortColumn === column && sortOrder === 'asc') return 'Sort Z to A';
    if (sortColumn === column && sortOrder === 'desc') return '';
    return 'Sort A to Z';
  };

  const number = entry.entryType.split('/')[1];
  const schema = entry.aspects[`${number}.global.schema`].data.fields.fields.listValue.values;
  const rows: SchemaRow[] = schema.map((field: any, index: number) => ({
    id: index + 1,
    name: field.structValue.fields.name.stringValue,
    type: field.structValue.fields.dataType.stringValue,
    metaDataType: field.structValue.fields.metadataType.stringValue,
    mode: field.structValue.fields.mode.stringValue,
    description: (field.structValue.fields.description && field.structValue.fields.description != null) ? field.structValue.fields.description.stringValue : '-',
  }));

  const sortedRows = React.useMemo(() => {
    if (!sortColumn) return rows;
    const sorted = [...rows].sort((a, b) =>
      a[sortColumn].localeCompare(b[sortColumn], undefined, { sensitivity: 'base' })
    );
    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }, [rows, sortColumn, sortOrder]);

  const sortIcon = (column: 'name' | 'type' | 'metaDataType' | 'mode') => (
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
        <rect width="24" height="24" rx="12" fill={isDark ? '#004a77' : '#C2E7FF'}/>
        <path d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z" fill={isDark ? '#8ab4f8' : '#004A77'}/>
      </svg>
    </Box>
  );

  return (
    <div ref={containerRef} style={{ width: '100%', overflow: 'hidden', ...sx }}>
      {rows.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* Header Row */}
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', padding: '0px 20px' }}>
            <div style={{ ...headerCellStyle, ...getColStyle(0) }}>
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
                    padding: '8px 8px',
                    margin: '-8px -8px',
                    flex: 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                  }}
                >
                  <span>Name</span>
                  {sortIcon('name')}
                </Box>
              </Tooltip>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(0, e); }}
                isActive={activeIndex === 0}
                darkMode={isDark}
              />
            </div>
            <div style={{ ...headerCellStyle, ...getColStyle(1), paddingLeft: '20px' }}>
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
                    padding: '8px 8px',
                    margin: '-8px -8px',
                    flex: 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                  }}
                >
                  <span>Type</span>
                  {sortIcon('type')}
                </Box>
              </Tooltip>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(1, e); }}
                isActive={activeIndex === 1}
                darkMode={isDark}
              />
            </div>
            <div style={{ ...headerCellStyle, ...getColStyle(2), paddingLeft: '20px' }}>
              <Tooltip title={getSortTooltip('metaDataType')} sx={{ flex: 1 }} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                <Box
                  role="button"
                  onClick={() => handleToggleSort('metaDataType')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    padding: '8px 8px',
                    margin: '-8px -8px',
                    flex: 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                  }}
                >
                  <span>Metadata Type</span>
                  {sortIcon('metaDataType')}
                </Box>
              </Tooltip>
              <ResizeHandle
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(2, e); }}
                isActive={activeIndex === 2}
                darkMode={isDark}
              />
            </div>
            {!isPreview && (
              <div style={{ ...headerCellStyle, width: `${columnWidths[3]}px`, flexShrink: 0, paddingLeft: '20px' }}>
                <Tooltip title={getSortTooltip('mode')} sx={{ flex: 1 }} slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -14] } }] } }}>
                  <Box
                    role="button"
                    onClick={() => handleToggleSort('mode')}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      padding: '8px 8px',
                      margin: '-8px -8px',
                      flex: 1,
                      transition: 'background-color 0.2s ease',
                      '&:hover': { backgroundColor: isDark ? '#3c4043' : '#F8F9FA' },
                    }}
                  >
                    <span>Mode</span>
                    {sortIcon('mode')}
                  </Box>
                </Tooltip>
                <ResizeHandle
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(3, e); }}
                  isActive={activeIndex === 3}
                  darkMode={isDark}
                />
              </div>
            )}
            {!isPreview && (
              <div style={{ ...headerCellStyle, flex: 1, minWidth: 0, paddingLeft: '20px' }}>Description</div>
            )}
          </Box>

          {/* Separator */}
          <Box sx={{ borderBottom: `1px solid ${isDark ? '#3c4043' : '#DADCE0'}`, margin: '0px 20px 0px 12px' }} />

          {/* Body Rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', padding: '0px 20px' }}>
            {sortedRows.map((row, index) => (
              <Box
                key={row.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: '41px',
                  position: 'relative',
                  zIndex: 0,
                  '&:hover::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '-8px',
                    right: '0px',
                    backgroundColor: isDark ? '#3c4043' : '#F8F9FA',
                    zIndex: -1,
                  },
                  ...(index < rows.length - 1 && {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '-8px',
                      right: '0px',
                      height: '1px',
                      backgroundColor: isDark ? '#3c4043' : '#DADCE0',
                    },
                  }),
                }}
              >
                {/* Name */}
                <div style={{ ...bodyCellStyle, ...getColStyle(0), padding: '10px 20px 10px 0px' }}>
                  <Typography sx={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#1F1F1F',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: isPreview ? '100%' : `${columnWidths[0] - 20}px`,
                  }}>
                    {row.name}
                  </Typography>
                </div>

                {/* Type */}
                <div style={{ ...bodyCellStyle, ...getColStyle(1), padding: '10px 20px', minWidth: 0 }}>
                  <span style={tagChipStyle}>{row.type}</span>
                </div>

                {/* Metadata Type */}
                <div style={{ ...bodyCellStyle, ...getColStyle(2), padding: '10px 20px', minWidth: 0 }}>
                  <span style={tagChipStyle}>{row.metaDataType}</span>
                </div>

                {/* Mode */}
                {!isPreview && (
                  <div style={{ ...bodyCellStyle, width: `${columnWidths[3]}px`, flexShrink: 0, padding: '12px 20px', minWidth: 0 }}>
                    <Typography sx={{
                      fontFamily: '"Product Sans", sans-serif',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '16px',
                      letterSpacing: '0.1px',
                      color: '#575757',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                    }}>
                      {row.mode}
                    </Typography>
                  </div>
                )}

                {/* Description */}
                {!isPreview && (
                  <div style={{ ...bodyCellStyle, flex: 1, minWidth: 0, padding: '10px 20px' }}>
                    <Typography sx={{
                      fontFamily: '"Product Sans", sans-serif',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '16px',
                      letterSpacing: '0.1px',
                      color: '#575757',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                    }}>
                      {row.description}
                    </Typography>
                  </div>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <div style={{ padding: "48px", textAlign: "center", fontSize: "14px", fontFamily: 'Google Sans, sans-serif', color: isDark ? '#9aa0a6' : "#0C1226CC" }}>No data matches the applied filters</div>
      )}
    </div>
  );
}

export default Schema;
