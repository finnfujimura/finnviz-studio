import { useState, useEffect } from 'react';
import type { FilterConfig, RangeFilterValue } from '../../types';
import { useApp } from '../../context/AppContext';

interface RangeFilterProps {
  filter: FilterConfig;
}

export function RangeFilter({ filter }: RangeFilterProps) {
  const { updateFilter } = useApp();
  const value = filter.value as RangeFilterValue;

  // Local state for inputs (debounced updates)
  const [localMin, setLocalMin] = useState(value.min?.toString() ?? '');
  const [localMax, setLocalMax] = useState(value.max?.toString() ?? '');

  // Sync local state when filter value changes externally
  useEffect(() => {
    setLocalMin(value.min?.toString() ?? '');
    setLocalMax(value.max?.toString() ?? '');
  }, [value.min, value.max]);

  // Debounced update
  useEffect(() => {
    const timer = setTimeout(() => {
      const newMin = localMin === '' ? null : parseFloat(localMin);
      const newMax = localMax === '' ? null : parseFloat(localMax);

      // Only update if values actually changed
      if (newMin !== value.min || newMax !== value.max) {
        updateFilter(filter.fieldName, {
          min: isNaN(newMin as number) ? null : newMin,
          max: isNaN(newMax as number) ? null : newMax,
        } as RangeFilterValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localMin, localMax, filter.fieldName, updateFilter, value.min, value.max]);

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '6px 8px',
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div style={{ paddingTop: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Min
          </label>
          <input
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder="No min"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          />
        </div>

        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '12px',
            paddingTop: '18px',
          }}
        >
          to
        </span>

        <div style={{ flex: 1 }}>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Max
          </label>
          <input
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder="No max"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          />
        </div>
      </div>
    </div>
  );
}
