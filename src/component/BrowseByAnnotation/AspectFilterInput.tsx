import React, { useState, useCallback, useRef } from "react";
import { Box, InputBase, ClickAwayListener, MenuList, MenuItem, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  type AspectFilterChip as AspectFilterChipType,
  type AspectFilterFieldType,
  ASPECT_FILTER_FIELD_LABELS,
  ASPECT_VALID_FILTER_FIELDS,
  isDateField,
  createAspectFilterChip,
  createOrConnectorChip,
  isOrConnector,
} from "./AspectFilterTypes";
import AspectFilterChip from "./AspectFilterChip";

interface AspectFilterInputProps {
  filters: AspectFilterChipType[];
  onFiltersChange: (filters: AspectFilterChipType[]) => void;
  placeholder?: string;
}

const AspectFilterInput: React.FC<AspectFilterInputProps> = ({
  filters,
  onFiltersChange,
  placeholder = "Filter Aspects",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedField, setSelectedField] = useState<AspectFilterFieldType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  const [dateError, setDateError] = useState("");

  const hasFilters = filters.length > 0;

  const isValidDate = (value: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (dateError) setDateError("");
    if (e.target.value) {
      setShowDropdown(false);
    }
  };

  const handleFieldSelect = (e: React.MouseEvent, field: AspectFilterFieldType) => {
    e.stopPropagation();
    justSelectedRef.current = true;
    setSelectedField(field);
    setShowDropdown(false);
    setDateError("");
    inputRef.current?.focus();
  };

  const handleOrSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    justSelectedRef.current = true;
    const orChip = createOrConnectorChip();
    onFiltersChange([...filters, orChip]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleClickAway = () => {
    setShowDropdown(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!inputValue && !selectedField) {
      setShowDropdown(true);
    }
  };

  const handleInputClick = () => {
    if (isFocused && !inputValue && !selectedField) {
      setShowDropdown((prev) => !prev);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const value = inputValue.trim();

      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        if (!value) return;

        // Check if user typed "OR"
        if (value.toUpperCase() === "OR") {
          if (filters.length > 0 && !isOrConnector(filters[filters.length - 1])) {
            const orChip = createOrConnectorChip();
            onFiltersChange([...filters, orChip]);
          }
          setInputValue("");
          setSelectedField(null);
          return;
        }

        if (selectedField) {
          if (isDateField(selectedField) && !isValidDate(value)) {
            setDateError("Invalid date. Please use YYYY-MM-DD format.");
            return;
          }
          const chip = createAspectFilterChip(selectedField, value);
          onFiltersChange([...filters, chip]);
          setInputValue("");
          setSelectedField(null);
          setDateError("");
        } else {
          // Default to name_contains
          const chip = createAspectFilterChip("name_contains", value);
          chip.showFieldLabel = false;
          onFiltersChange([...filters, chip]);
          setInputValue("");
        }
      } else if (e.key === "Backspace" && !inputValue) {
        if (selectedField) {
          setSelectedField(null);
          setShowDropdown(true);
          setDateError("");
        } else if (filters.length > 0) {
          const newFilters = filters.slice(0, -1);
          onFiltersChange(newFilters);
          setShowDropdown(true);
        }
      } else if (e.key === "Escape") {
        setSelectedField(null);
        setShowDropdown(false);
        setDateError("");
      }
    },
    [inputValue, filters, onFiltersChange, selectedField]
  );

  const handleRemoveChip = useCallback(
    (chipId: string) => {
      const newFilters = filters.filter((f) => f.id !== chipId);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const getPlaceholder = () => {
    if (selectedField) {
      return `Enter ${ASPECT_FILTER_FIELD_LABELS[selectedField]} value...`;
    }
    if (hasFilters) {
      return "Add filter...";
    }
    return placeholder;
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "0px 20px",
          width: "100%",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Search Input */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "8px 12px",
            gap: "8px",
            border: isFocused || hasFilters || selectedField ? "1px solid #022FCD" : "1px solid #DADCE0",
            borderRadius: "54px",
            backgroundColor: "#FFFFFF",
            height: "32px",
            boxSizing: "border-box",
            cursor: "text",
            transition: "border-color 0.2s ease",
            "&:hover": { borderColor: "#022FCD" },
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <SearchIcon sx={{ fontSize: 20, color: "#575757" }} />
          {/* Show selected field as a tag */}
          {selectedField && (
            <Box
              component="span"
              sx={{
                fontFamily: "'Google Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "16px",
                color: "#1F1F1F",
                whiteSpace: "nowrap",
              }}
            >
              {ASPECT_FILTER_FIELD_LABELS[selectedField]}:
            </Box>
          )}
          <Tooltip
            title={selectedField && isDateField(selectedField) ? "Format: YYYY-MM-DD" : ""}
            open={!!(selectedField && isDateField(selectedField) && isFocused)}
            placement="bottom"
            arrow
          >
            <InputBase
              inputRef={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onClick={handleInputClick}
              placeholder={getPlaceholder()}
              sx={{
                flex: 1,
                fontFamily: "'Google Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "16px",
                letterSpacing: "0.1px",
                color: "#1F1F1F",
                "& input::placeholder": {
                  color: "#5E5E5E",
                  opacity: 1,
                },
              }}
            />
          </Tooltip>
        </Box>

        {/* Date validation error */}
        {dateError && (
          <Typography
            sx={{
              fontFamily: "'Google Sans', sans-serif",
              fontSize: "11px",
              color: "#D93025",
              paddingLeft: "12px",
              marginTop: "-4px",
            }}
          >
            {dateError}
          </Typography>
        )}

        {/* Filter Field Dropdown */}
        {showDropdown && (
          <Box
            sx={{
              position: "absolute",
              top: "35px",
              left: "20px",
              right: "20px",
              backgroundColor: "#FFFFFF",
              boxShadow: "0px 4px 8px 3px rgba(60, 64, 67, 0.15), 0px 1px 3px rgba(60, 64, 67, 0.3)",
              borderRadius: "8px",
              zIndex: 1000,
            }}
          >
            <MenuList dense sx={{ py: 1 }}>
              {/* OR option */}
              {filters.length > 0 && !isOrConnector(filters[filters.length - 1]) && (
                <MenuItem
                  onClick={(e) => handleOrSelect(e)}
                  sx={{
                    fontFamily: "'Product Sans', sans-serif",
                    fontSize: "12px",
                    color: "#1F1F1F",
                    py: 0.5,
                    px: 1.5,
                  }}
                >
                  OR
                </MenuItem>
              )}
              {ASPECT_VALID_FILTER_FIELDS.map((field) => (
                <MenuItem
                  key={field}
                  onClick={(e) => handleFieldSelect(e, field)}
                  sx={{
                    fontFamily: "'Product Sans', sans-serif",
                    fontSize: "12px",
                    color: "#1F1F1F",
                    py: 0.5,
                    px: 1.5,
                  }}
                >
                  {ASPECT_FILTER_FIELD_LABELS[field]}
                </MenuItem>
              ))}
            </MenuList>
          </Box>
        )}

        {/* Filter Chips */}
        {hasFilters && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              alignContent: "flex-start",
              gap: "8px",
            }}
          >
            {filters.map((chip) => (
              <AspectFilterChip key={chip.id} chip={chip} onRemove={handleRemoveChip} />
            ))}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default AspectFilterInput;
