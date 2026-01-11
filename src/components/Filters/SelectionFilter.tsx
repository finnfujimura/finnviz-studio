import { useState, useMemo } from 'react';
import type { FilterConfig, SelectionFilterValue } from '../../types';
import { useApp } from '../../context/AppContext';

interface SelectionFilterProps {
  filter: FilterConfig;
}

export function SelectionFilter({ filter }: SelectionFilterProps) {
  const { updateFilter } = useApp();
  const value = filter.value as SelectionFilterValue;
  const [searchQuery, setSearchQuery] = useState('');

  // Filter available options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return value.available;
    const query = searchQuery.toLowerCase();
    return value.available.filter((opt) => opt.toLowerCase().includes(query));
  }, [value.available, searchQuery]);

  const handleToggle = (option: string) => {
    const isSelected = value.selected.includes(option);
    const newSelected = isSelected
      ? value.selected.filter((s) => s !== option)
      : [...value.selected, option];

    updateFilter(filter.fieldName, {
      ...value,
      selected: newSelected,
    } as SelectionFilterValue);
  };

  const handleSelectAll = () => {
    updateFilter(filter.fieldName, {
      ...value,
      selected: [...value.available],
    } as SelectionFilterValue);
  };

  const handleSelectNone = () => {
    updateFilter(filter.fieldName, {
      ...value,
      selected: [],
    } as SelectionFilterValue);
  };

  const allSelected = value.selected.length === value.available.length;
  const noneSelected = value.selected.length === 0;

  return (
    <div style={{ paddingTop: '12px' }}>
      {/* Search input */}
      {value.available.length > 5 && (
        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              padding: '6px 8px',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          />
        </div>
      )}

      {/* Select all / none buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <button
          onClick={handleSelectAll}
          disabled={allSelected}
          style={{
            flex: 1,
            padding: '4px 8px',
            backgroundColor: allSelected ? 'var(--color-bg-tertiary)' : 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 500,
            color: allSelected ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
            cursor: allSelected ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Select All
        </button>
        <button
          onClick={handleSelectNone}
          disabled={noneSelected}
          style={{
            flex: 1,
            padding: '4px 8px',
            backgroundColor: noneSelected ? 'var(--color-bg-tertiary)' : 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 500,
            color: noneSelected ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
            cursor: noneSelected ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Select None
        </button>
      </div>

      {/* Options list */}
      <div
        style={{
          maxHeight: '150px',
          overflowY: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          backgroundColor: 'var(--color-bg-tertiary)',
        }}
      >
        {filteredOptions.length === 0 ? (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
            }}
          >
            No matches found
          </div>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = value.selected.includes(option);
            return (
              <label
                key={option}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--color-accent-glow)' : 'transparent',
                  borderBottom: '1px solid var(--color-border)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(option)}
                  style={{
                    width: '14px',
                    height: '14px',
                    accentColor: 'var(--color-accent)',
                    cursor: 'pointer',
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option}
                </span>
              </label>
            );
          })
        )}
      </div>

      {/* Count indicator */}
      <div
        style={{
          marginTop: '6px',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          textAlign: 'right',
        }}
      >
        {value.selected.length} of {value.available.length} selected
      </div>
    </div>
  );
}
