import { useApp } from '../../context/AppContext';
import { FilterRow } from './FilterRow';

export function FilterPanel() {
  const { state, clearFilters } = useApp();
  const filterCount = state.filters.length;

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filter icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <h3
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Filters
          </h3>
          {filterCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                borderRadius: '9px',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              {filterCount}
            </span>
          )}
        </div>

        {/* Clear all button */}
        {filterCount > 0 && (
          <button
            onClick={clearFilters}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: '10px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {filterCount === 0 ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
            }}
          >
            Click a field to add a filter
          </div>
        ) : (
          state.filters.map((filter) => (
            <FilterRow key={filter.fieldName} filter={filter} />
          ))
        )}
      </div>
    </div>
  );
}
