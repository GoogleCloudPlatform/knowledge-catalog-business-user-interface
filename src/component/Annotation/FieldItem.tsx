import React from 'react';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import EditNoteIcon from '../../assets/svg/ListIcon.svg';
import DatabaseSchemaIcon from '../../assets/svg/database_schema_icon.svg';
import { getAspectL2Icon } from '../../constants/aspectIcons';

interface FieldItemProps {
  fieldName: string;
  fieldValue: any;
  depth: number;
  expandedFieldPaths: Set<string>;
  onToggleField: (path: string) => void;
  fieldPath: string;
  isLast?: boolean;
  isDataProduct?: boolean;
}

/**
 * Determines if a field value is "complex" (struct or list-of-structs).
 */
const isComplexField = (fieldValue: any): boolean => {
  if (!fieldValue || typeof fieldValue !== 'object') return false;
  if (fieldValue.kind === 'structValue') return true;
  if (fieldValue.kind === 'listValue') {
    const values = fieldValue.listValue?.values;
    return values?.some((v: any) => v.kind === 'structValue') ?? false;
  }
  // Plain JSON array of objects
  if (Array.isArray(fieldValue)) {
    return fieldValue.some((v: any) => v && typeof v === 'object');
  }
  // Plain JSON nested object (no kind wrapper)
  return Object.keys(fieldValue).length > 0;
};

/**
 * Formats a camelCase or snake_case field key into a readable label.
 * e.g. "jobDetails" → "Job Details", "num_nulls" → "Num Nulls"
 */
const formatFieldName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Extracts a simple display string from a field value.
 */
const getSimpleDisplayValue = (fieldValue: any): string | null => {
  if (!fieldValue || typeof fieldValue !== 'object') {
    return fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : null;
  }
  if (fieldValue.kind === 'stringValue') return fieldValue.stringValue || null;
  if (fieldValue.kind === 'numberValue') return fieldValue.numberValue !== undefined ? String(fieldValue.numberValue) : null;
  if (fieldValue.kind === 'boolValue') return fieldValue.boolValue ? 'true' : 'false';
  // Handle objects with stringValue/numberValue/boolValue but without kind
  if ('stringValue' in fieldValue) return fieldValue.stringValue || null;
  if ('numberValue' in fieldValue) return fieldValue.numberValue !== undefined ? String(fieldValue.numberValue) : null;
  if ('boolValue' in fieldValue) return fieldValue.boolValue ? 'true' : 'false';
  return null;
};

/**
 * Renders leaf-level key-value pairs for struct fields beyond max depth.
 */
const renderLeafKeyValuePairs = (fields: Record<string, any>): React.ReactNode => {
  const entries = Object.entries(fields).filter(([, v]) => {
    const val = getSimpleDisplayValue(v);
    return val !== null;
  });

  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '53px' }}>
      {entries.map(([key, value]) => {
        const displayVal = getSimpleDisplayValue(value);
        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'Google Sans Text, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#575757',
            }}>
              {formatFieldName(key)}
            </span>
            <span style={{
              fontFamily: 'Google Sans Text, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              color: '#1F1F1F',
              wordBreak: 'break-word',
            }}>
              {displayVal}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const FieldItem: React.FC<FieldItemProps> = ({
  fieldName,
  fieldValue,
  depth,
  expandedFieldPaths,
  onToggleField,
  fieldPath,
  isLast = false,
  isDataProduct = false,
}) => {
  const isExpanded = expandedFieldPaths.has(fieldPath);
  const complex = isComplexField(fieldValue);
  const showIcon = depth <= 1;
  const l2Icon = showIcon ? getAspectL2Icon(fieldName) : null;
  const icon = showIcon ? (l2Icon ?? (complex ? DatabaseSchemaIcon : EditNoteIcon)) : null;
  const isL2 = depth === 0;
  const isL3 = depth === 1;

  const handleClick = () => {
    onToggleField(fieldPath);
  };

  // Render expanded content based on field type
  const renderExpandedContent = (): React.ReactNode => {
    // Simple value types — show value text
    const simpleValueStyle: React.CSSProperties = {
      padding: `6px 0 6px 53px`,
      fontFamily: 'Google Sans Text, sans-serif',
      fontSize: '12px',
      fontWeight: 400,
      color: '#1F1F1F',
      wordBreak: 'break-word',
      lineHeight: 1.5,
    };

    if (fieldValue === null || typeof fieldValue !== 'object') {
      const val = getSimpleDisplayValue(fieldValue);
      return val !== null ? <div style={simpleValueStyle}>{val}</div> : null;
    }
    
    if (fieldValue.kind === 'stringValue') {
      return <div style={simpleValueStyle}>{fieldValue.stringValue}</div>;
    }

    if (fieldValue.kind === 'numberValue') {
      return <div style={simpleValueStyle}>{String(fieldValue.numberValue)}</div>;
    }

    if (fieldValue.kind === 'boolValue') {
      return <div style={simpleValueStyle}>{fieldValue.boolValue ? 'true' : 'false'}</div>;
    }

    // structValue — show sub-fields as key-value pairs
    if (fieldValue.kind === 'structValue') {
      const subFields = fieldValue.structValue?.fields;
      if (!subFields || Object.keys(subFields).length === 0) return null;

      return (
        <div style={{ padding: '6px 0' }}>
          {renderLeafKeyValuePairs(subFields)}
        </div>
      );
    }

    // listValue — show list items
    if (fieldValue.kind === 'listValue') {
      const values = fieldValue.listValue?.values;
      if (!values || values.length === 0) return null;

      const hasStructItems = values.some((v: any) => v.kind === 'structValue');

      if (hasStructItems) {
        return (
          <div style={{ paddingLeft: isL2 ? '16px' : '8px' }}>
            {values.map((item: any, index: number) => {
              if (item.kind === 'structValue') {
                const subFields = item.structValue?.fields;
                if (!subFields || Object.keys(subFields).length === 0) return null;

                // Beyond max depth, render as leaf pairs
                if (depth >= 1) {
                  const itemPath = `${fieldPath}.${index}`;
                  const itemExpanded = expandedFieldPaths.has(itemPath);
                  const itemComplex = Object.values(subFields).some((v: any) =>
                    v?.kind === 'structValue' || v?.kind === 'listValue'
                  );
                  const itemIcon = (depth + 1) <= 1 ? (itemComplex ? DatabaseSchemaIcon : EditNoteIcon) : null;

                  return (
                    <div key={itemPath}>
                      <div
                        onClick={() => onToggleField(itemPath)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '0px 16px',
                          minHeight: '36px',
                          cursor: 'pointer',
                          borderBottom: (!isLast || index < values.length - 1) ? '1px solid #E9EEF6' : 'none',
                        }}
                      >
                        {itemExpanded ? (
                          <ArrowDropDownIcon sx={{ fontSize: '20px', color: '#575757' }} />
                        ) : (
                          <ArrowRightIcon sx={{ fontSize: '20px', color: '#575757' }} />
                        )}
                        {itemIcon && (
                          <img src={itemIcon} alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontFamily: 'Google Sans Text, sans-serif',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#575757',
                          textTransform: 'capitalize',
                        }}>
                          {fieldName}
                        </span>
                      </div>
                      {itemExpanded && (
                        <div style={{ padding: '6px 0' }}>
                          {renderLeafKeyValuePairs(subFields)}
                        </div>
                      )}
                    </div>
                  );
                }

                // Within depth limit, render as FieldItem
                return (
                  <FieldItem
                    key={`${fieldPath}.${index}`}
                    fieldName={fieldName}
                    fieldValue={item}
                    depth={depth + 1}
                    expandedFieldPaths={expandedFieldPaths}
                    onToggleField={onToggleField}
                    fieldPath={`${fieldPath}.${index}`}
                    isLast={index === values.length - 1}
                    isDataProduct={isDataProduct}
                  />
                );
              }

              // Simple list items
              const simpleVal = getSimpleDisplayValue(item);
              if (simpleVal) {
                return (
                  <div key={`${fieldPath}.${index}`} style={{
                    padding: '4px 0',
                    fontFamily: 'Google Sans Text, sans-serif',
                    fontSize: '12px',
                    fontWeight: 400,
                    color: '#1F1F1F',
                    paddingLeft: '53px',
                    wordBreak: 'break-word',
                  }}>
                    {simpleVal}
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }

      // All simple list items
      return (
        <div style={{ paddingLeft: '53px' }}>
          {values.map((item: any, index: number) => {
            const simpleVal = getSimpleDisplayValue(item);
            if (simpleVal) {
              return (
                <div key={`${fieldPath}.${index}`} style={{
                  padding: '4px 0',
                  fontFamily: 'Google Sans Text, sans-serif',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: '#1F1F1F',
                  wordBreak: 'break-word',
                }}>
                  {simpleVal}
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // Plain JSON array (no kind wrapper)
    if (Array.isArray(fieldValue)) {
      return (
        <div style={{ paddingLeft: isL2 ? '16px' : '8px' }}>
          {fieldValue.map((item: any, index: number) => {
            if (item && typeof item === 'object') {
              const itemPath = `${fieldPath}.${index}`;
              const itemExpanded = expandedFieldPaths.has(itemPath);
              return (
                <div key={itemPath}>
                  <div
                    onClick={() => onToggleField(itemPath)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '0px 16px', minHeight: '36px', cursor: 'pointer',
                      borderBottom: (!isLast || index < fieldValue.length - 1) ? '1px solid #E9EEF6' : 'none',
                    }}
                  >
                    {itemExpanded
                      ? <ArrowDropDownIcon sx={{ fontSize: '20px', color: '#575757' }} />
                      : <ArrowRightIcon sx={{ fontSize: '20px', color: '#575757' }} />}
                    <span style={{
                      fontFamily: 'Google Sans Text, sans-serif', fontSize: '12px',
                      fontWeight: 600, color: '#575757', textTransform: 'capitalize',
                    }}>
                      {`${formatFieldName(fieldName)} ${index + 1}`}
                    </span>
                  </div>
                  {itemExpanded && (
                    <div style={{ padding: '6px 0' }}>
                      {renderLeafKeyValuePairs(item)}
                    </div>
                  )}
                </div>
              );
            }
            const simpleVal = getSimpleDisplayValue(item);
            if (simpleVal) {
              return (
                <div key={`${fieldPath}.${index}`} style={{
                  padding: '4px 0', fontFamily: 'Google Sans Text, sans-serif',
                  fontSize: '12px', fontWeight: 400, color: '#1F1F1F',
                  paddingLeft: '53px', wordBreak: 'break-word',
                }}>
                  {simpleVal}
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // Plain JSON object (no kind wrapper)
    if (fieldValue && typeof fieldValue === 'object') {
      return (
        <div style={{ padding: '6px 0' }}>
          {renderLeafKeyValuePairs(fieldValue)}
        </div>
      );
    }
    return null;
  };

  // L2: depth=0, L3: depth=1
  const rowStyle: React.CSSProperties = isL2
    ? {
        background: isDataProduct ? '#FFFFFF' : '#F8FAFD',
        padding: '12px 12px 12px 24px',
        borderBottom: isLast ? 'none' : '1px solid #E9EEF6',
      }
    : isL3
    ? {
        background: isDataProduct ? '#FFFFFF' : 'transparent',
        padding: '0px 16px',
        borderBottom: isLast ? 'none' : '1px solid #E9EEF6',
      }
    : {
        background: isDataProduct ? '#FFFFFF' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid #E9EEF6',
      };

  const titleStyle: React.CSSProperties = {
    fontFamily: 'Google Sans Text, sans-serif',
    fontSize: '12px',
    fontWeight: isL2 ? 700 : 600,
    color: '#575757',
    textTransform: 'capitalize',
  };

  return (
    <div style={rowStyle}>
      {/* Clickable header row */}
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: isL2 ? '0' : '8px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {isExpanded ? (
          <ArrowDropDownIcon sx={{ fontSize: '20px', color: '#575757' }} />
        ) : (
          <ArrowRightIcon sx={{ fontSize: '20px', color: '#575757' }} />
        )}
        {icon && (
          <img src={icon} alt="" style={{ width: '12px', height: '12px', flexShrink: 0 }} />
        )}
        <span style={titleStyle}>
          {fieldName}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && renderExpandedContent()}
    </div>
  );
};

export default FieldItem;
