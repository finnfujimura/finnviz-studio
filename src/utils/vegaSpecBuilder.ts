import type { TopLevelSpec } from 'vega-lite';
import type { EncodingState, EncodingFieldConfig, MarkType, AggregateType, FilterConfig, RangeFilterValue, SelectionFilterValue } from '../types';

// Format field name for display (replace underscores with spaces)
function formatFieldName(name: string): string {
  return name.replace(/_/g, ' ');
}

// Format aggregate type for display
function formatAggregate(aggregate: AggregateType): string {
  if (!aggregate) return '';
  const labels: Record<string, string> = {
    sum: 'Sum of',
    mean: 'Average',
    median: 'Median',
    min: 'Min',
    max: 'Max',
    count: 'Count of',
    distinct: 'Distinct',
  };
  return labels[aggregate] || aggregate;
}

// Generate a chart title based on encodings
export function generateChartTitle(encodings: EncodingState): string {
  const x = encodings.x;
  const y = encodings.y;
  const color = encodings.color;

  if (!x && !y) return '';

  let title = '';

  // Build the main part of the title
  if (y && x) {
    const yName = formatFieldName(y.field.name);
    const xName = formatFieldName(x.field.name);

    if (y.aggregate) {
      // "Average Horsepower by Origin"
      title = `${formatAggregate(y.aggregate)} ${yName} by ${xName}`;
    } else if (x.aggregate) {
      // "Origin by Sum of Sales"
      title = `${yName} by ${formatAggregate(x.aggregate)} ${xName}`;
    } else if (x.field.type === 'temporal') {
      // "Horsepower over Year"
      title = `${yName} over ${xName}`;
    } else if (y.field.type === 'quantitative' && (x.field.type === 'nominal' || x.field.type === 'ordinal')) {
      // "Horsepower by Origin"
      title = `${yName} by ${xName}`;
    } else {
      // "Horsepower vs Displacement"
      title = `${yName} vs ${xName}`;
    }
  } else if (y) {
    const yName = formatFieldName(y.field.name);
    title = y.aggregate ? `${formatAggregate(y.aggregate)} ${yName}` : yName;
  } else if (x) {
    const xName = formatFieldName(x.field.name);
    title = x.aggregate ? `${formatAggregate(x.aggregate)} ${xName}` : xName;
  }

  // Add color dimension if present
  if (color && title) {
    const colorName = formatFieldName(color.field.name);
    title += ` by ${colorName}`;
  }

  return title;
}

function inferMark(encodings: EncodingState): string {
  const x = encodings.x?.field;
  const y = encodings.y?.field;

  if (x && y) {
    if (x.type === 'quantitative' && y.type === 'quantitative') {
      return 'point';
    }
    if ((x.type === 'nominal' || x.type === 'ordinal') && y.type === 'quantitative') {
      return 'bar';
    }
    if (x.type === 'quantitative' && (y.type === 'nominal' || y.type === 'ordinal')) {
      return 'bar';
    }
    if (x.type === 'temporal' && y.type === 'quantitative') {
      return 'line';
    }
    if (y.type === 'temporal' && x.type === 'quantitative') {
      return 'line';
    }
    if ((x.type === 'nominal' || x.type === 'ordinal') && (y.type === 'nominal' || y.type === 'ordinal')) {
      return 'rect';
    }
  }

  if (x && !y) {
    return 'bar';
  }
  if (y && !x) {
    return 'bar';
  }

  return 'point';
}

function buildChannelEncoding(config: EncodingFieldConfig) {
  const { field, aggregate, timeUnit, sort } = config;
  const encoding: Record<string, unknown> = {
    field: field.name,
    type: field.type,
  };

  // Add aggregate if specified
  if (aggregate) {
    encoding.aggregate = aggregate;
  }

  // Add timeUnit for temporal fields
  if (field.type === 'temporal' && timeUnit) {
    encoding.timeUnit = timeUnit;
  }

  // Add sort if specified
  if (sort) {
    encoding.sort = sort;
  }

  return encoding;
}

// Build filter transforms for Vega-Lite
function buildFilterTransforms(filters: FilterConfig[]): { filter: string }[] {
  return filters
    .map((filter) => {
      switch (filter.filterType) {
        case 'range': {
          const val = filter.value as RangeFilterValue;
          const conditions: string[] = [];
          if (val.min !== null) {
            conditions.push(`datum['${filter.fieldName}'] >= ${val.min}`);
          }
          if (val.max !== null) {
            conditions.push(`datum['${filter.fieldName}'] <= ${val.max}`);
          }
          if (conditions.length === 0) return null;
          return { filter: conditions.join(' && ') };
        }
        case 'selection': {
          const val = filter.value as SelectionFilterValue;
          if (val.selected.length === 0) {
            // No items selected = show nothing
            return { filter: 'false' };
          }
          if (val.selected.length === val.available.length) {
            // All items selected = no filter needed
            return null;
          }
          // Escape single quotes in values
          const escapedValues = val.selected.map((v) => v.replace(/'/g, "\\'"));
          const valuesList = escapedValues.map((v) => `'${v}'`).join(', ');
          return { filter: `indexof([${valuesList}], datum['${filter.fieldName}']) !== -1` };
        }
        case 'date-range': {
          // Date range filtering - not fully implemented yet
          return null;
        }
        default:
          return null;
      }
    })
    .filter((t): t is { filter: string } => t !== null);
}

export function buildVegaSpec(
  encodings: EncodingState,
  data: Record<string, unknown>[],
  markType: MarkType = 'auto',
  title?: string | null,
  filters?: FilterConfig[]
): TopLevelSpec | null {
  if (!encodings.x && !encodings.y) {
    return null;
  }

  const mark = markType === 'auto' ? inferMark(encodings) : markType;

  // Use provided title or auto-generate
  const chartTitle = title ?? generateChartTitle(encodings);

  const encoding: Record<string, unknown> = {};

  if (encodings.x) {
    encoding.x = buildChannelEncoding(encodings.x);
  }
  if (encodings.y) {
    encoding.y = buildChannelEncoding(encodings.y);
  }
  if (encodings.color) {
    encoding.color = buildChannelEncoding(encodings.color);
  }
  if (encodings.size) {
    encoding.size = buildChannelEncoding(encodings.size);
  }
  if (encodings.shape) {
    encoding.shape = buildChannelEncoding(encodings.shape);
  }
  if (encodings.row) {
    encoding.row = buildChannelEncoding(encodings.row);
  }
  if (encodings.column) {
    encoding.column = buildChannelEncoding(encodings.column);
  }

  // Build filter transforms if filters are provided
  const transforms = filters ? buildFilterTransforms(filters) : [];

  const spec: TopLevelSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    data: { values: data },
    ...(transforms.length > 0 && { transform: transforms }),
    mark: { type: mark as 'point' | 'bar' | 'line' | 'rect' | 'area' | 'circle' | 'tick', tooltip: true },
    encoding,
    width: 'container',
    height: 400,
    ...(chartTitle && { title: chartTitle }),
  };

  return spec;
}
