// SidebarItem.tsx
import React from "react";
import {
  Box,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  List,
  Tooltip,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { type GlossaryItem } from "./GlossaryDataType";
import { getIcon } from "./glossaryUIHelpers";

interface SidebarItemProps {
  item: GlossaryItem;
  depth?: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  insideGroup?: boolean;
}

const OverflowTooltip: React.FC<{ 
  text: string; 
  enterDelay?: number; 
  children: React.ReactElement<any> 
}> = ({ text, enterDelay = 500, children }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    // Check if the inner text element is overflowing
    const el = e.currentTarget.querySelector('.MuiTypography-root') || e.currentTarget;
    setShowTooltip(el.scrollWidth > el.clientWidth);
  };

  return (
    <Tooltip 
      title={text} 
      placement="right" 
      enterDelay={enterDelay} 
      arrow 
      disableHoverListener={!showTooltip}
    >
      {React.cloneElement(children, { onMouseEnter: handleMouseEnter })}
    </Tooltip>
  );
};

const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  depth = 0,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  insideGroup = false,
}) => {
  const isSelected = selectedId === item.id;
  const isExpanded = expandedIds.has(item.id);
  const renderableChildren = item.children || [];
  const indent = depth * 20;
  const isInaccessible = item.isInaccessible === true;
  const containsSelectedItem = (children: GlossaryItem[]): boolean => {
    return children.some(
      (child) =>
        child.id === selectedId || // No longer restricting to child.type === "term"
        (child.children ? containsSelectedItem(child.children) : false)
    );
  };
  const hasExpandedChildGroup = renderableChildren.some(
    (child) =>
      child.type === "category" &&
      expandedIds.has(child.id) &&
      (child.children || []).length > 0
  );
  const isGroupHeader =
    isExpanded &&
    renderableChildren.length > 0 &&
    !hasExpandedChildGroup &&
    !containsSelectedItem(renderableChildren);

  const activeThemes = {
    glossary: { bg: "#DDE5FC", icon: "#022FCD" },
    category: { bg: "#E6F4EA", icon: "#0D652D" },
    term: { bg: "#FEF7E0", icon: "#B06000" },
  };

  const activeTheme = activeThemes[item.type as keyof typeof activeThemes] || activeThemes.term;

  const itemButton = (
    <ListItemButton
      selected={isSelected && !isInaccessible}
      disabled={isInaccessible}
      onClick={() => {
        if (!isInaccessible) {
          onSelect(item.id);
          if (!isExpanded) onToggle(item.id);
        }
      }}
      sx={{
        // Inside the group card the Box is inset by 12px (mx), so subtract that from the
        // original margins to keep every row at the same absolute position as when collapsed.
        ml: `${20 + indent}px`,
        mr: "20px",
        pl: "8px",
        pr: "12px",
        height: "36px",
        borderRadius: isSelected ? "31px" : "20px",
        mb: 0.5,
        width: "auto",
        opacity: isInaccessible ? 0.5 : 1,
        cursor: isInaccessible ? "not-allowed" : "pointer",
        backgroundColor: undefined,

        "&.Mui-selected": {
          backgroundColor: "#DDE5FC",
          color: "#0C1226",
          "&:hover": { backgroundColor: "#DDE5FC" },
         "& .MuiListItemIcon-root": { color: activeTheme.icon },
          "& .MuiTypography-root": { fontWeight: 500, color: "#0C1226" },
        },
        "&:hover": {
          backgroundColor: isInaccessible ? undefined : "#ced1d3ff",
          borderRadius: '20px'
        },
        "&.Mui-disabled": {
          opacity: 0.5,
        },
      }}
    >
      {/* Chevron Icon Container */}
      <Box
        component="span"
        onClick={(e) => {
          e.stopPropagation();
          if (!isInaccessible) {
            onToggle(item.id);
            onSelect(item.id);
          }
        }}
        sx={{
          display: item.type !== "term" ? "flex" : "none",

          alignItems: "center",
          cursor: isInaccessible ? "not-allowed" : "pointer",
          mr: 0.5,
          transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 0.2s",
          visibility: "visible",
        }}
      >
        <ExpandMore
          fontSize="inherit"
          sx={{ fontSize: 16, color: isInaccessible ? "#5F6368" : "#1F1F1F" }}
        />
      </Box>

      <ListItemIcon 
        sx={{ 
          minWidth: 20, 
          mr: 0.1, 
          color: isInaccessible 
            ? "#5F6368" 
            : (isSelected ? activeTheme.icon : (item.type === "glossary" ? "#0C1226" : undefined)) 
        }}
      >
        {isInaccessible ? (
          <LockOutlinedIcon sx={{ fontSize: 16, color: "#5F6368" }} />
        ) : (
          getIcon(
            item.type, 
            "small", 
            isSelected ? activeTheme.icon : (item.type === "glossary" ? "#0C1226" : undefined)
          )
        )}
      </ListItemIcon>
      <OverflowTooltip text={item.displayName}>
        <ListItemText
          primary={item.displayName}
          primaryTypographyProps={{
            fontFamily: depth === 0 ? "Product Sans" : "Google Sans",
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.25px",
            fontWeight: isSelected && !isInaccessible ? 500 : 400,
            color: isInaccessible ? "#5F6368" : (isSelected ? "#0C1226" : "#1F1F1F"),
            noWrap: true,
          }}
        />
      </OverflowTooltip>
    </ListItemButton>
  );

  const headerNode = isInaccessible ? (
    <Tooltip
      title="You don't have access to this resource"
      placement="right"
      arrow
    >
      <span>{itemButton}</span>
    </Tooltip>
  ) : (
    itemButton
  );

  const childrenNode = renderableChildren.length > 0 && (
    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
        {renderableChildren.map((child) => (
          <SidebarItem
            key={child.id}
            item={child}
            depth={depth + 1}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggle={onToggle}
            insideGroup={insideGroup || isGroupHeader}
          />
        ))}
      </List>
    </Collapse>
  );

  if (isGroupHeader) {
    return (
      <Box sx={{ position: "relative", mb: 0.5 }}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${20 + indent}px`,
            right: "20px",
            backgroundColor: "#e8ebf7ff",
            borderRadius: "16px",
            zIndex: 0, 
          }}
        />
        
        {/* Content Layer */}
        <Box sx={{ position: "relative", zIndex: 1, pb: "6px" }}>
          {headerNode}
          {childrenNode}
        </Box>
      </Box>
    );
  }

  return (
    <>
      {headerNode}
      {childrenNode}
    </>
  );
};

export default SidebarItem;
