import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, InputBase, CircularProgress, ClickAwayListener, MenuList, MenuItem } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  type FilterChip,
  type FilterFieldType,
  FILTER_FIELD_LABELS,
  VALID_FILTER_FIELDS,
} from "./GlossaryDataType";
import GlossaryFilterChip from "./GlossaryFilterChip";
import {
  parseFilterInput,
  createOrConnectorChip,
  isOrConnector,
} from "../../utils/glossaryUtils";

interface GlossaryFilterInputProps {
  filters: FilterChip[];
  onFiltersChange: (filters: FilterChip[]) => void;
  isLoading: boolean;
  placeholder?: string;
}

const GlossaryFilterInput: React.FC<GlossaryFilterInputProps> = ({
  filters,
  onFiltersChange,
  isLoading,
  placeholder = "Filter Glossaries",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedField, setSelectedField] = useState<FilterFieldType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = filters.length > 0;

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Hide dropdown when user starts typing
    if (e.target.value) {
      setShowDropdown(false);
    }
  };

  // Track if we just selected from dropdown to prevent focus from reopening it
  const justSelectedRef = useRef(false);

  // Handle field selection from dropdown
  const handleFieldSelect = (e: React.MouseEvent, field: FilterFieldType) => {
    e.stopPropagation();
    justSelectedRef.current = true;
    setSelectedField(field);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Handle OR selection from dropdown
  const handleOrSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    justSelectedRef.current = true;
    const orChip = createOrConnectorChip();
    onFiltersChange([...filters, orChip]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Handle click away to close dropdown
  const handleClickAway = () => {
    setShowDropdown(false);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
    // Don't reopen dropdown if we just selected from it
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    // Show dropdown when focusing on empty input without a selected field
    if (!inputValue && !selectedField) {
      setShowDropdown(true);
    }
  };

  // Handle input click to toggle dropdown when already focused
  const handleInputClick = () => {
    if (isFocused && !inputValue && !selectedField) {
      setShowDropdown((prev) => !prev);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle key down events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const value = inputValue.trim();

      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();

        if (!value) return;

        // Check if user typed "OR" or "or"
        if (value.toUpperCase() === "OR") {
          // Only add OR if there's at least one filter and last filter is not an OR
          if (filters.length > 0 && !isOrConnector(filters[filters.length - 1])) {
            const orChip = createOrConnectorChip();
            onFiltersChange([...filters, orChip]);
          }
          setInputValue("");
          setSelectedField(null);
          return;
        }

        // Parse regular filter input with the selected field
        const newChip = parseFilterInput(value, selectedField);
        if (newChip) {
          onFiltersChange([...filters, newChip]);
          setInputValue("");
          setSelectedField(null); // Reset selected field after creating chip
        }
      } else if (e.key === "Backspace" && !inputValue) {
        // First clear selected field if exists, then remove last filter
        if (selectedField) {
          setSelectedField(null);
          setShowDropdown(true); // Reopen dropdown when clearing selected field
        } else if (filters.length > 0) {
          const newFilters = filters.slice(0, -1);
          onFiltersChange(newFilters);
          setShowDropdown(true); // Reopen dropdown when removing a filter
        }
      } else if (e.key === "Escape") {
        // Clear selected field and close dropdown on Escape
        setSelectedField(null);
        setShowDropdown(false);
      }
    },
    [inputValue, filters, onFiltersChange, selectedField]
  );

  // Handle chip removal
  const handleRemoveChip = useCallback(
    (chipId: string) => {
      const newFilters = filters.filter((f) => f.id !== chipId);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Determine placeholder text
  const getPlaceholder = () => {
    if (selectedField) {
      return `Enter ${FILTER_FIELD_LABELS[selectedField]} value...`;
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
            "&:hover": {
              borderColor: "#022FCD",
            },
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {isLoading ? (
            <CircularProgress size={16} sx={{ color: "#575757" }} />
          ) : (
            <SearchIcon sx={{ fontSize: 20, color: "#575757" }} />
          )}
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
              }}
            >
              {FILTER_FIELD_LABELS[selectedField]}:
            </Box>
          )}
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
        </Box>

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
              {/* OR option - only show when filters exist and last filter is not OR */}
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
              {VALID_FILTER_FIELDS.map((field) => (
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
                  {FILTER_FIELD_LABELS[field]}
                </MenuItem>
              ))}
            </MenuList>
          </Box>
        )}

        {/* Filter Chips Container */}
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
              <GlossaryFilterChip
                key={chip.id}
                chip={chip}
                onRemove={handleRemoveChip}
              />
            ))}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default GlossaryFilterInput;
