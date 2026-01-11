import { useState } from 'react';
import type { FilterConfig, FieldType, SelectionFilterValue, RangeFilterValue } from '../../types';
import { useApp } from '../../context/AppContext';
import { RangeFilter } from './RangeFilter';
import { SelectionFilter } from './SelectionFilter';

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

interface FilterRowProps {
  filter: FilterConfig;
}

function getFilterSummary(filter: FilterConfig): string {
  switch (filter.filterType) {
    case 'selection': {
      const val = filter.value as SelectionFilterValue;
      const selected = val.selected.length;
      const total = val.available.length;
      if (selected === total) return 'All selected';
      if (selected === 0) return 'None selected';
      return `${selected} of ${total}`;
    }
    case 'range': {
      const val = filter.value as RangeFilterValue;
      if (val.min === null && val.max === null) return 'No range set';
      if (val.min !== null && val.max !== null) {
        return `${val.min.toLocaleString()} - ${val.max.toLocaleString()}`;
      }
      if (val.min !== null) return `>= ${val.min.toLocaleString()}`;
      return `<= ${val.max?.toLocaleString()}`;
    }
    case 'date-range':
      return 'Date range';
    default:
      return '';
  }
}

export function FilterRow({ filter }: FilterRowProps) {
  const { removeFilter } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const color = TYPE_COLORS[filter.fieldType];
  const summary = getFilterSummary(filter);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: `1px solid ${isHovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header - always visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Expand/collapse chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>

        {/* Type badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            backgroundColor: color,
            color: 'white',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {TYPE_LABELS[filter.fieldType]}
        </span>

        {/* Field name */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {filter.fieldName}
        </span>

        {/* Summary (when collapsed) */}
        {!isExpanded && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          >
            {summary}
          </span>
        )}

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeFilter(filter.fieldName);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            padding: 0,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            opacity: isHovered ? 1 : 0,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            padding: '0 12px 12px 12px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {filter.filterType === 'range' && <RangeFilter filter={filter} />}
          {filter.filterType === 'selection' && <SelectionFilter filter={filter} />}
          {filter.filterType === 'date-range' && (
            <div style={{ padding: '12px 0', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              Date range filter coming soon
            </div>
          )}
        </div>
      )}
    </div>
  );
}
