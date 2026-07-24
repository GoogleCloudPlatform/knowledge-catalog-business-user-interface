import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import QueryFilterBar from '../../Common/QueryFilterBar';
import { useColumnResize } from '../../../hooks/useColumnResize';
import ResizeHandle from '../../Schema/ResizeHandle';
import useNavigateToResource from './useNavigateToResource';
import { buildRelationshipRows } from './utils';
import type { SchemaRelationship, RelationshipRow } from './utils';

interface RelationshipsTableProps {
  relationships: SchemaRelationship[];
}

type SortableKey = 'table1' | 'table2';

// Column layout mirrors the Schema table (flexbox rows, flex-grow columns).
const COLUMNS = [
  { key: 'table1', label: 'Table 1', initialWidth: 180, minWidth: 120, link: true, sortable: true },
  { key: 'table2', label: 'Table 2', initialWidth: 180, minWidth: 120, link: true, sortable: true },
  { key: 'relationship', label: 'Relationship', initialWidth: 460, minWidth: 220, link: false, sortable: false },
  { key: 'source', label: 'Source', initialWidth: 140, minWidth: 100, link: false, sortable: false },
] as const;

const headerTextStyle: React.CSSProperties = {
  fontFamily: '"Google Sans", sans-serif',
  fontWeight: 500,
  fontSize: '11px',
  lineHeight: '16px',
  letterSpacing: '0.1px',
  color: '#575757',
};

const linkSx = {
  fontFamily: '"Google Sans", sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  color: '#022FCD',
  cursor: 'pointer',
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  '&:hover': { textDecoration: 'underline', color: '#0842A0' },
};

const cellTextSx = {
  fontFamily: '"Product Sans", sans-serif',
  fontWeight: 400,
  fontSize: '12px',
  lineHeight: '18px',
  letterSpacing: '0.1px',
  color: '#575757',
  wordBreak: 'break-word' as const,
};

const RelationshipsTable: React.FC<RelationshipsTableProps> = ({ relationships }) => {
  const navigateToResource = useNavigateToResource();
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<{ column: SortableKey | null; direction: 'asc' | 'desc' }>({
    column: null,
    direction: 'asc',
  });

  const columnConfigs = useMemo(
    () => COLUMNS.map((c) => ({ key: c.key, initialWidth: c.initialWidth, minWidth: c.minWidth })),
    []
  );
  const { columnWidths, activeIndex, handleMouseDown } = useColumnResize({
    columns: columnConfigs,
    mode: 'flex',
  });

  const rows = useMemo(() => buildRelationshipRows(relationships), [relationships]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.table1.toLowerCase().includes(term) ||
        r.table2.toLowerCase().includes(term) ||
        r.relationship.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sort.column) return filteredRows;
    const col = sort.column;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => a[col].localeCompare(b[col]) * dir);
  }, [filteredRows, sort]);

  // asc -> desc -> unsorted, matching the Schema table.
  const handleSort = (key: SortableKey) => {
    setSort((prev) => {
      if (prev.column !== key) return { column: key, direction: 'asc' };
      if (prev.direction === 'asc') return { column: key, direction: 'desc' };
      return { column: null, direction: 'asc' };
    });
  };

  // Sort arrow identical to the Schema table (circular bg + arrow, hidden until active).
  const sortIcon = (key: SortableKey) => (
    <Box
      component="span"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        opacity: sort.column === key ? 1 : 0,
        transform: sort.column === key && sort.direction === 'desc' ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s ease-in-out, opacity 0.2s ease',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx="12" fill="#C2E7FF" />
        <path
          d="M11.168 15.4818L11.168 5.33594L12.8346 5.33594L12.8346 15.4818L17.5013 10.8151L18.668 12.0026L12.0013 18.6693L5.33464 12.0026L6.5013 10.8151L11.168 15.4818Z"
          fill="#004A77"
        />
      </svg>
    </Box>
  );

  const renderCell = (row: RelationshipRow, col: (typeof COLUMNS)[number]) => {
    if (col.link) {
      const fqn = col.key === 'table1' ? row.leftFqn : row.rightFqn;
      return (
        <Typography sx={linkSx} onClick={() => navigateToResource(fqn)}>
          {row[col.key]}
        </Typography>
      );
    }
    return <Typography sx={cellTextSx}>{row[col.key as keyof RelationshipRow] || '-'}</Typography>;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <QueryFilterBar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        placeholder="Search relationships"
      />

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', padding: '0px 20px' }}>
          {COLUMNS.map((col, i) => (
            <Box
              key={col.key}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                flex: `1 1 ${columnWidths[i]}px`,
                minWidth: 0,
                padding: '8px 0px',
                paddingLeft: i > 0 ? '20px' : '0px',
              }}
            >
              {col.sortable ? (
                <Box
                  role="button"
                  onClick={() => handleSort(col.key as SortableKey)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flex: 1,
                    minWidth: 0,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    padding: '8px',
                    margin: '-8px',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { backgroundColor: '#F8F9FA' },
                  }}
                >
                  <span style={headerTextStyle}>{col.label}</span>
                  {sortIcon(col.key as SortableKey)}
                </Box>
              ) : (
                <span style={headerTextStyle}>{col.label}</span>
              )}
              <ResizeHandle
                onMouseDown={(e) => handleMouseDown(i, e)}
                isActive={activeIndex === i}
                darkMode={false}
              />
            </Box>
          ))}
        </Box>

        {/* Body */}
        <Box sx={{ display: 'flex', flexDirection: 'column', padding: '0px 20px' }}>
          {/* Header separator — matches the row separator width (extends 8px left) */}
          <Box sx={{ borderBottom: '1px solid #DADCE0', marginLeft: '-8px' }} />

          {sortedRows.length === 0 ? (
            <Typography sx={{ ...cellTextSx, padding: '16px 0' }}>
              No relationships match your search.
            </Typography>
          ) : (
            sortedRows.map((row, index) => (
              <Box
                key={`${row.leftFqn}-${row.rightFqn}-${index}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: '41px',
                  position: 'relative',
                  zIndex: 0,
                  '&:hover::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '-8px',
                    right: '0px',
                    backgroundColor: '#F8F9FA',
                    zIndex: -1,
                  },
                  ...(index < sortedRows.length - 1 && {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '-8px',
                      right: '0px',
                      height: '1px',
                      backgroundColor: '#DADCE0',
                    },
                  }),
                }}
              >
                {COLUMNS.map((col, i) => (
                  <Box
                    key={col.key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: `1 1 ${columnWidths[i]}px`,
                      minWidth: 0,
                      padding: i > 0 ? '10px 20px' : '10px 20px 10px 0px',
                    }}
                  >
                    {renderCell(row, col)}
                  </Box>
                ))}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default RelationshipsTable;
