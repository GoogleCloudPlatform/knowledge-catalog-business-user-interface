/**
 * @file DataLineageToolbar.tsx
 * @description Header controls for the Data Lineage tab: graph/list toggle,
 * direction, depth, asset/column level (+ column picker), process toggle,
 * filters (time range, dependency type, projects, locations), node search,
 * reset and fullscreen.
 */
import { useState } from 'react';
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { FilterList, OpenInFull, CloseFullscreen, RestartAlt, Search } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import type { DependencyType, DirectionFilter, LineageFilters, LineageLevel } from '../types';
import type { LineageOptions } from '../hooks/useDataLineageGraph';

export interface SearchOption {
  id: string;
  label: string;
  sub: string;
}

export interface DataLineageToolbarProps {
  viewMode: 'graph' | 'list';
  onViewModeChange: (m: 'graph' | 'list') => void;
  options: LineageOptions;
  setOptions: (o: Partial<LineageOptions>) => void;
  rootColumns: string[];
  showProcesses: boolean;
  onShowProcessesChange: (v: boolean) => void;
  searchOptions: SearchOption[];
  onSearchSelect: (id: string) => void;
  onReset: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  truncated: boolean;
  entryLocation: string;
}

const toggleSx = {
  '& .MuiToggleButton-root': {
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'none',
    '&.Mui-selected': { backgroundColor: '#E7F0FE', color: '#0B57D0', borderColor: '#0B57D0' },
  },
};

const ALL_COLUMNS = '*';

const countActiveFilters = (f: LineageFilters) =>
  (f.startTime || f.endTime ? 1 : 0) + (f.dependencyTypes?.length ? 1 : 0)
  + (f.projects?.length ? 1 : 0) + (f.locations?.length ? 1 : 0);

const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

const FiltersPopover = ({
  anchor,
  onClose,
  filters,
  onApply,
  entryLocation,
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
  filters: LineageFilters;
  onApply: (f: LineageFilters) => void;
  entryLocation: string;
}) => {
  const [timeMode, setTimeMode] = useState<'start' | 'end'>(filters.endTime ? 'end' : 'start');
  const [time, setTime] = useState<Dayjs | null>(
    filters.startTime ? dayjs(filters.startTime) : filters.endTime ? dayjs(filters.endTime) : null,
  );
  const [deps, setDeps] = useState<DependencyType[]>(filters.dependencyTypes || []);
  const [projects, setProjects] = useState((filters.projects || []).map((p) => p.replace(/^projects\//, '')).join(', '));
  const [locations, setLocations] = useState((filters.locations || []).join(', '));

  const toggleDep = (d: DependencyType) =>
    setDeps((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ p: 2, width: 340, display: 'flex', flexDirection: 'column', gap: 1.5 }} data-testid="dl-filters">
          <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>Lineage filters</Typography>

          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E', mb: 0.5 }}>Time range (one bound)</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Select size="small" value={timeMode} onChange={(e) => setTimeMode(e.target.value as 'start' | 'end')} sx={{ fontSize: '0.8rem' }}>
                <MenuItem value="start">After</MenuItem>
                <MenuItem value="end">Before</MenuItem>
              </Select>
              <DateTimePicker
                value={time}
                onChange={(v) => setTime(v)}
                slotProps={{ textField: { size: 'small', inputProps: { 'aria-label': 'Lineage time' } } }}
              />
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: '#5E5E5E' }}>Dependency type (column-level)</Typography>
            <FormControlLabel
              control={<Checkbox size="small" checked={deps.includes('EXACT_COPY')} onChange={() => toggleDep('EXACT_COPY')} />}
              label={<span style={{ fontSize: '0.8rem' }}>Exact copy</span>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={deps.includes('OTHER')} onChange={() => toggleDep('OTHER')} />}
              label={<span style={{ fontSize: '0.8rem' }}>Transformation</span>}
            />
          </Box>

          <TextField
            size="small"
            label="Projects (comma separated)"
            value={projects}
            onChange={(e) => setProjects(e.target.value)}
            placeholder="my-project, other-project"
          />
          <TextField
            size="small"
            label="Additional locations"
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            helperText={`Always includes "${entryLocation}". E.g. us, eu, us-central1`}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              size="small"
              onClick={() => { onApply({}); onClose(); }}
            >
              Clear
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                const iso = time && time.isValid() ? time.toISOString() : undefined;
                onApply({
                  startTime: timeMode === 'start' ? iso : undefined,
                  endTime: timeMode === 'end' ? iso : undefined,
                  dependencyTypes: deps.length ? deps : undefined,
                  projects: splitList(projects).map((p) => (p.startsWith('projects/') ? p : `projects/${p}`)),
                  locations: splitList(locations),
                });
                onClose();
              }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </LocalizationProvider>
    </Popover>
  );
};

const DataLineageToolbar = ({
  viewMode,
  onViewModeChange,
  options,
  setOptions,
  rootColumns,
  showProcesses,
  onShowProcessesChange,
  searchOptions,
  onSearchSelect,
  onReset,
  onToggleFullscreen,
  isFullscreen,
  truncated,
  entryLocation,
}: DataLineageToolbarProps) => {
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const activeFilters = countActiveFilters(options.filters);
  const columnOptions = [ALL_COLUMNS, ...rootColumns];

  return (
    <Box
      data-testid="dl-toolbar"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 12px',
        border: '1px solid #E0E0E0',
        borderBottom: 'none',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        background: '#fff',
      }}
    >
      <ToggleButtonGroup
        size="small"
        exclusive
        value={viewMode}
        onChange={(_, v) => v && onViewModeChange(v)}
        sx={toggleSx}
        aria-label="View mode"
      >
        <ToggleButton value="graph">Graph</ToggleButton>
        <ToggleButton value="list">List</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={options.direction}
        onChange={(_, v: DirectionFilter | null) => v && setOptions({ direction: v })}
        sx={toggleSx}
        aria-label="Direction"
      >
        <ToggleButton value="UPSTREAM">Upstream</ToggleButton>
        <ToggleButton value="BOTH">Both</ToggleButton>
        <ToggleButton value="DOWNSTREAM">Downstream</ToggleButton>
      </ToggleButtonGroup>

      <FormControl size="small">
        <Select
          value={options.depth}
          onChange={(e) => setOptions({ depth: Number(e.target.value) })}
          sx={{ fontSize: '0.75rem', height: 28 }}
          inputProps={{ 'aria-label': 'Depth' }}
          renderValue={(v) => `Depth: ${v}`}
        >
          {[1, 2, 3, 5, 10].map((d) => <MenuItem key={d} value={d} sx={{ fontSize: '0.8rem' }}>{d} {d === 1 ? 'hop' : 'hops'}</MenuItem>)}
        </Select>
      </FormControl>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={options.level}
        onChange={(_, v: LineageLevel | null) => v && setOptions({ level: v, columns: v === 'COLUMN' ? options.columns : [] })}
        sx={toggleSx}
        aria-label="Lineage level"
      >
        <ToggleButton value="ASSET">Asset</ToggleButton>
        <ToggleButton value="COLUMN">Column</ToggleButton>
      </ToggleButtonGroup>

      {options.level === 'COLUMN' && (
        <Autocomplete
          multiple
          size="small"
          limitTags={2}
          options={columnOptions}
          value={options.columns}
          getOptionLabel={(o) => (o === ALL_COLUMNS ? 'All columns' : o)}
          onChange={(_, v) => {
            // "All columns" is exclusive with explicit columns.
            const addedAll = v.includes(ALL_COLUMNS) && !options.columns.includes(ALL_COLUMNS);
            const next = addedAll ? [ALL_COLUMNS] : v.filter((c) => c !== ALL_COLUMNS);
            setOptions({ columns: next.slice(0, 20) });
          }}
          renderTags={(value, getTagProps) => value.map((o, i) => {
            const { key, ...rest } = getTagProps({ index: i });
            return <Chip key={key} {...rest} size="small" label={o === ALL_COLUMNS ? 'All columns' : o} />;
          })}
          renderInput={(params) => <TextField {...params} placeholder={options.columns.length ? '' : 'Select columns'} inputProps={{ ...params.inputProps, 'aria-label': 'Columns' }} />}
          sx={{ minWidth: 220, maxWidth: 360, '& .MuiInputBase-root': { minHeight: 28, py: '0 !important', fontSize: '0.75rem' } }}
        />
      )}

      {options.level === 'ASSET' && viewMode === 'graph' && (
        <FormControlLabel
          sx={{ m: 0 }}
          control={<Switch size="small" checked={showProcesses} onChange={(e) => onShowProcessesChange(e.target.checked)} />}
          label={<span style={{ fontSize: '0.75rem' }}>Show processes</span>}
        />
      )}

      <Tooltip title="Filters">
        <IconButton size="small" aria-label="Filters" onClick={(e) => setFilterAnchor(e.currentTarget)}>
          <Badge badgeContent={activeFilters} color="primary">
            <FilterList fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      {filterAnchor && (
        <FiltersPopover
          anchor={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          filters={options.filters}
          onApply={(f) => setOptions({ filters: f })}
          entryLocation={entryLocation}
        />
      )}

      {truncated && <Chip size="small" color="warning" variant="outlined" label="Results truncated" />}

      <Box sx={{ flex: 1 }} />

      {viewMode === 'graph' && (
        <Autocomplete
          size="small"
          options={searchOptions}
          getOptionLabel={(o) => o.label}
          onChange={(_, v) => v && onSearchSelect(v.id)}
          renderOption={(props, o) => {
            const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
            return (
              <li key={key} {...rest}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem' }}>{o.label}</Typography>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#5E5E5E' }}>{o.sub}</Typography>
                </Box>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Find in graph"
              InputProps={{ ...params.InputProps, startAdornment: <Search fontSize="small" sx={{ color: '#5E5E5E' }} /> }}
              inputProps={{ ...params.inputProps, 'aria-label': 'Find in graph' }}
            />
          )}
          sx={{ width: 220, '& .MuiInputBase-root': { height: 30, fontSize: '0.75rem' } }}
        />
      )}

      <Tooltip title="Reset">
        <IconButton size="small" aria-label="Reset" onClick={onReset}><RestartAlt fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}>
        <IconButton size="small" aria-label="Toggle fullscreen" onClick={onToggleFullscreen}>
          {isFullscreen ? <CloseFullscreen fontSize="small" /> : <OpenInFull fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default DataLineageToolbar;
