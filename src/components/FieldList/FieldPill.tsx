import { useState, useMemo } from 'react';
import type { DetectedField, FieldType } from '../../types';
import { useApp } from '../../context/AppContext';

const TYPE_COLORS: Record<FieldType, string> = {
  quantitative: 'var(--color-quantitative)',
  nominal: 'var(--color-nominal)',
  ordinal: 'var(--color-ordinal)',
  temporal: 'var(--color-temporal)',
};

const TYPE_LABELS: Record<FieldType, string> = {
  quantitative: 'Q',
  nominal: 'N',
  ordinal: 'O',
  temporal: 'T',
};

interface FieldPillProps {
  field: DetectedField;
  index: number;
}

export function FieldPill({ field, index }: FieldPillProps) {
  const { state, toggleFieldType, addFilter, removeFilter } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Check if this field has an active filter
  const hasFilter = useMemo(() => {
    return state.filters.some(f => f.fieldName === field.name);
  }, [state.filters, field.name]);

  const handleFilterToggle = () => {
    // Toggle filter: add if not present, remove if present
    if (hasFilter) {
      removeFilter(field.name);
    } else {
      addFilter(field);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copyMove';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const canToggle = field.type === 'ordinal' || field.type === 'nominal';
  const color = TYPE_COLORS[field.type];

  return (
    <div
      className="field-pill"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        backgroundColor: hasFilter
          ? 'var(--color-accent-glow)'
          : isHovered
            ? 'var(--color-bg-tertiary)'
            : 'var(--color-bg-elevated)',
        border: `1px solid ${hasFilter ? 'var(--color-accent)' : isHovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontSize: '13px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
        opacity: isDragging ? 0.5 : 1,
        animation: `slideIn 0.3s ease-out ${index * 0.03}s both`,
      }}
    >
      {/* Type indicator with glow */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          backgroundColor: color,
          color: 'white',
          borderRadius: '5px',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.02em',
          boxShadow: isHovered ? `0 0 12px ${color}60` : `0 0 6px ${color}30`,
          transition: 'box-shadow 0.2s ease',
        }}
      >
        {TYPE_LABELS[field.type]}
      </span>

      {/* Field name */}
      <span
        style={{
          color: 'var(--color-text-primary)',
          fontWeight: 500,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {field.name}
      </span>

      {/* Filter button - always visible when hovered or active */}
      {(isHovered || hasFilter) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFilterToggle();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          draggable={false}
          title={hasFilter ? 'Remove filter' : 'Add filter'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            padding: 0,
            backgroundColor: hasFilter
              ? 'var(--color-accent-glow)'
              : 'var(--color-bg-tertiary)',
            border: `1px solid ${hasFilter ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            color: hasFilter ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            if (!hasFilter) {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-glow)';
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'var(--color-accent)';
            }
          }}
          onMouseOut={(e) => {
            if (!hasFilter) {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>
      )}

      {/* Toggle button for ordinal/nominal */}
      {canToggle && isHovered && !hasFilter && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFieldType(field.name);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          draggable={false}
          title={field.type === 'ordinal'
            ? 'Switch to Nominal (distinct colors)'
            : 'Switch to Ordinal (gradient colors)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            padding: 0,
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            fontSize: '10px',
            fontWeight: 600,
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent-glow)';
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.color = 'var(--color-accent)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          {field.type === 'ordinal' ? 'N' : 'O'}
        </button>
      )}

      {/* Drag indicator */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          color: 'var(--color-text-muted)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          flexShrink: 0,
        }}
      >
        <circle cx="9" cy="5" r="1" fill="currentColor" />
        <circle cx="9" cy="12" r="1" fill="currentColor" />
        <circle cx="9" cy="19" r="1" fill="currentColor" />
        <circle cx="15" cy="5" r="1" fill="currentColor" />
        <circle cx="15" cy="12" r="1" fill="currentColor" />
        <circle cx="15" cy="19" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}
