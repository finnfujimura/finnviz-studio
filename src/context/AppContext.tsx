import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { AppState, AppAction, DetectedField, EncodingChannel, FieldType, AggregateType, TimeUnit, MarkType, SortOrder, FilterConfig, FilterValue, FilterType, RangeFilterValue, SelectionFilterValue, DateRangeFilterValue } from '../types';
import { detectAllFields } from '../utils/fieldDetection';
import carsData from '../../superstore.json';

const initialState: AppState = {
  data: [],
  fields: [],
  encodings: {},
  filters: [],
  markType: 'auto',
  chartTitle: null,
  isLoading: true,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload, isLoading: false };
    case 'SET_FIELDS':
      return { ...state, fields: action.payload };
    case 'ASSIGN_FIELD':
      return {
        ...state,
        encodings: {
          ...state.encodings,
          [action.channel]: {
            field: action.field,
            aggregate: null,
            timeUnit: action.field.type === 'temporal' ? 'year' : null,
            sort: null
          }
        },
      };
    case 'REMOVE_FIELD': {
      const newEncodings = { ...state.encodings };
      delete newEncodings[action.channel];
      return { ...state, encodings: newEncodings };
    }
    case 'SET_AGGREGATE': {
      const existingConfig = state.encodings[action.channel];
      if (!existingConfig) return state;
      return {
        ...state,
        encodings: {
          ...state.encodings,
          [action.channel]: { ...existingConfig, aggregate: action.aggregate },
        },
      };
    }
    case 'SET_TIME_UNIT': {
      const existingConfig = state.encodings[action.channel];
      if (!existingConfig) return state;
      return {
        ...state,
        encodings: {
          ...state.encodings,
          [action.channel]: { ...existingConfig, timeUnit: action.timeUnit },
        },
      };
    }
    case 'CLEAR_ALL':
      return { ...state, encodings: {}, filters: [], chartTitle: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'TOGGLE_FIELD_TYPE': {
      const newFields = state.fields.map((field) => {
        if (field.name === action.fieldName) {
          // Toggle between ordinal and nominal
          const newType: FieldType = field.type === 'ordinal' ? 'nominal' : 'ordinal';
          return { ...field, type: newType };
        }
        return field;
      });
      // Also update any encodings that use this field
      const newEncodings = { ...state.encodings };
      for (const [channel, config] of Object.entries(newEncodings)) {
        if (config && config.field.name === action.fieldName) {
          const newType: FieldType = config.field.type === 'ordinal' ? 'nominal' : 'ordinal';
          newEncodings[channel as EncodingChannel] = {
            ...config,
            field: { ...config.field, type: newType }
          };
        }
      }
      return { ...state, fields: newFields, encodings: newEncodings };
    }
    case 'RESET_FOR_NEW_DATA':
      return {
        ...state,
        data: [],
        fields: [],
        encodings: {},
        filters: [],
        markType: 'auto',
        chartTitle: null,
        isLoading: true,
        error: null,
      };
    case 'SET_MARK_TYPE':
      return { ...state, markType: action.markType };
    case 'SET_CHART_TITLE':
      return { ...state, chartTitle: action.title };
    case 'SET_SORT': {
      const existingConfig = state.encodings[action.channel];
      if (!existingConfig) return state;
      return {
        ...state,
        encodings: {
          ...state.encodings,
          [action.channel]: { ...existingConfig, sort: action.sort },
        },
      };
    }
    case 'ADD_FILTER': {
      // Prevent duplicate filters for same field
      if (state.filters.some(f => f.fieldName === action.filter.fieldName)) {
        return state;
      }
      return { ...state, filters: [...state.filters, action.filter] };
    }
    case 'UPDATE_FILTER': {
      return {
        ...state,
        filters: state.filters.map(f =>
          f.fieldName === action.fieldName ? { ...f, value: action.value } : f
        ),
      };
    }
    case 'REMOVE_FILTER': {
      return {
        ...state,
        filters: state.filters.filter(f => f.fieldName !== action.fieldName),
      };
    }
    case 'CLEAR_FILTERS':
      return { ...state, filters: [] };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  assignField: (channel: EncodingChannel, field: DetectedField) => void;
  removeField: (channel: EncodingChannel) => void;
  setAggregate: (channel: EncodingChannel, aggregate: AggregateType) => void;
  setTimeUnit: (channel: EncodingChannel, timeUnit: TimeUnit) => void;
  setSort: (channel: EncodingChannel, sort: SortOrder) => void;
  setMarkType: (markType: MarkType) => void;
  setChartTitle: (title: string | null) => void;
  clearAll: () => void;
  toggleFieldType: (fieldName: string) => void;
  loadData: (data: Record<string, unknown>[]) => void;
  addFilter: (field: DetectedField) => void;
  updateFilter: (fieldName: string, value: FilterValue) => void;
  removeFilter: (fieldName: string) => void;
  clearFilters: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    try {
      const data = carsData as Record<string, unknown>[];
      dispatch({ type: 'SET_DATA', payload: data });
      const fields = detectAllFields(data);
      dispatch({ type: 'SET_FIELDS', payload: fields });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
      console.error(err);
    }
  }, []);

  const assignField = (channel: EncodingChannel, field: DetectedField) => {
    dispatch({ type: 'ASSIGN_FIELD', channel, field });
  };

  const removeField = (channel: EncodingChannel) => {
    dispatch({ type: 'REMOVE_FIELD', channel });
  };

  const setAggregate = (channel: EncodingChannel, aggregate: AggregateType) => {
    dispatch({ type: 'SET_AGGREGATE', channel, aggregate });
  };

  const setTimeUnit = (channel: EncodingChannel, timeUnit: TimeUnit) => {
    dispatch({ type: 'SET_TIME_UNIT', channel, timeUnit });
  };

  const setSort = (channel: EncodingChannel, sort: SortOrder) => {
    dispatch({ type: 'SET_SORT', channel, sort });
  };

  const setMarkType = (markType: MarkType) => {
    dispatch({ type: 'SET_MARK_TYPE', markType });
  };

  const setChartTitle = (title: string | null) => {
    dispatch({ type: 'SET_CHART_TITLE', title });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  const toggleFieldType = (fieldName: string) => {
    dispatch({ type: 'TOGGLE_FIELD_TYPE', fieldName });
  };

  const loadData = (data: Record<string, unknown>[]) => {
    dispatch({ type: 'RESET_FOR_NEW_DATA' });
    try {
      dispatch({ type: 'SET_DATA', payload: data });
      const fields = detectAllFields(data);
      dispatch({ type: 'SET_FIELDS', payload: fields });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to process uploaded data' });
      console.error(err);
    }
  };

  // Helper to get unique values for a field
  const getUniqueValues = (fieldName: string): string[] => {
    const values = new Set<string>();
    state.data.forEach(row => {
      const val = row[fieldName];
      if (val !== null && val !== undefined) {
        values.add(String(val));
      }
    });
    return Array.from(values).sort();
  };

  // Helper to get min/max for a numeric field
  const getFieldRange = (fieldName: string): { min: number; max: number } => {
    let min = Infinity;
    let max = -Infinity;
    state.data.forEach(row => {
      const val = row[fieldName];
      if (typeof val === 'number' && !isNaN(val)) {
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
    });
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
  };

  const addFilter = (field: DetectedField) => {
    // Create filter with smart defaults based on field type
    let filterType: FilterType;
    let value: FilterValue;

    if (field.type === 'quantitative') {
      filterType = 'range';
      const range = getFieldRange(field.name);
      value = { min: range.min, max: range.max } as RangeFilterValue;
    } else if (field.type === 'temporal') {
      filterType = 'date-range';
      value = { min: null, max: null } as DateRangeFilterValue;
    } else {
      // nominal or ordinal
      filterType = 'selection';
      const available = getUniqueValues(field.name);
      value = { selected: [...available], available } as SelectionFilterValue;
    }

    const filter: FilterConfig = {
      fieldName: field.name,
      fieldType: field.type,
      filterType,
      value,
    };

    dispatch({ type: 'ADD_FILTER', filter });
  };

  const updateFilter = (fieldName: string, value: FilterValue) => {
    dispatch({ type: 'UPDATE_FILTER', fieldName, value });
  };

  const removeFilter = (fieldName: string) => {
    dispatch({ type: 'REMOVE_FILTER', fieldName });
  };

  const clearFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
  };

  return (
    <AppContext.Provider value={{ state, assignField, removeField, setAggregate, setTimeUnit, setSort, setMarkType, setChartTitle, clearAll, toggleFieldType, loadData, addFilter, updateFilter, removeFilter, clearFilters }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
