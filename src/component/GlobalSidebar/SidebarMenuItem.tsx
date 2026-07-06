import React from 'react';
import './GlobalSidebar.css';

interface SidebarMenuItemProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  isActive?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  multiLine?: boolean;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
  disabled = false,
  multiLine = false,
}) => {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled && onClick) {
      onClick(event);
    }
  };

  return (
    <div
      className={`sidebar-menu-item ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''} ${multiLine ? 'two-line' : 'single-line'}`}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <div className="menu-icon-container">
        {typeof icon === 'string' ? (
          <span className="material-symbols-outlined sidebar-icon">{icon}</span>
        ) : (
          icon
        )}
      </div>
      <span className="menu-label">{label}</span>
    </div>
  );
};

export default SidebarMenuItem;
