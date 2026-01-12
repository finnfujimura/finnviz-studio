import { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';
import type { AppState, AppAction, DetectedField, EncodingChannel, FieldType, AggregateType, TimeUnit, MarkType, SortOrder, FilterConfig, FilterValue, FilterType, RangeFilterValue, SelectionFilterValue, DateRangeFilterValue, SavedProject, ViewMode, ChartConfig, ColorScheme } from '../types';
import { detectAllFields } from '../utils/fieldDetection';
import { persistence } from '../utils/persistence';
import carsData from '../../superstore.json';

const initialState: AppState = {
  data: [],
  fields: [],
  charts: [
    {
      id: 'default',
      encodings: {},
      markType: 'auto',
      chartTitle: null,
      colorScheme: 'default',
    },
  ],
  activeChartId: 'default',
  filters: [],
  isLoading: true,
  error: null,
  projects: [],
  currentProjectId: null,
  viewMode: 'chart',
};

function appReducer(state: AppState, action: AppAction): AppState {
  const updateChart = (chartId: string | undefined, updates: Partial<ChartConfig>): ChartConfig[] => {
    const targetId = chartId || state.activeChartId;
    return state.charts.map(chart => 
      chart.id === targetId ? { ...chart, ...updates } : chart
    );
  };

  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload, isLoading: false };
    case 'SET_FIELDS':
      return { ...state, fields: action.payload };
    case 'ASSIGN_FIELD': {
      const targetId = action.chartId || state.activeChartId;
      const chart = state.charts.find(c => c.id === targetId);
      if (!chart) return state;
      
      const newEncodings = {
        ...chart.encodings,
        [action.channel]: {
          field: action.field,
          aggregate: null,
          timeUnit: action.field.type === 'temporal' ? 'year' : null,
          sort: null
        }
      };
      return { ...state, charts: updateChart(action.chartId, { encodings: newEncodings }) };
    }
    case 'REMOVE_FIELD': {
      const targetId = action.chartId || state.activeChartId;
      const chart = state.charts.find(c => c.id === targetId);
      if (!chart) return state;

      const newEncodings = { ...chart.encodings };
      delete newEncodings[action.channel];
      return { ...state, charts: updateChart(action.chartId, { encodings: newEncodings }) };
    }
    case 'SET_AGGREGATE': {
      const targetId = action.chartId || state.activeChartId;
      const chart = state.charts.find(c => c.id === targetId);
      if (!chart || !chart.encodings[action.channel]) return state;

      const newEncodings = {
        ...chart.encodings,
        [action.channel]: { ...chart.encodings[action.channel]!, aggregate: action.aggregate },
      };
      return { ...state, charts: updateChart(action.chartId, { encodings: newEncodings }) };
    }
    case 'SET_TIME_UNIT': {
      const targetId = action.chartId || state.activeChartId;
      const chart = state.charts.find(c => c.id === targetId);
      if (!chart || !chart.encodings[action.channel]) return state;

      const newEncodings = {
        ...chart.encodings,
        [action.channel]: { ...chart.encodings[action.channel]!, timeUnit: action.timeUnit },
      };
      return { ...state, charts: updateChart(action.chartId, { encodings: newEncodings }) };
    }
    case 'CLEAR_ALL':
      return { 
        ...state, 
        charts: initialState.charts, 
        activeChartId: initialState.activeChartId,
        filters: [], 
        currentProjectId: null 
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'TOGGLE_FIELD_TYPE': {
      const newFields = state.fields.map((field) => {
        if (field.name === action.fieldName) {
          const newType: FieldType = field.type === 'ordinal' ? 'nominal' : 'ordinal';
          return { ...field, type: newType };
        }
        return field;
      });

      // Update all charts that use this field
      const newCharts = state.charts.map(chart => {
        const newEncodings = { ...chart.encodings };
        let changed = false;
        for (const [channel, config] of Object.entries(newEncodings)) {
          if (config && config.field.name === action.fieldName) {
            const newType: FieldType = config.field.type === 'ordinal' ? 'nominal' : 'ordinal';
            newEncodings[channel as EncodingChannel] = {
              ...config,
              field: { ...config.field, type: newType }
            };
            changed = true;
          }
        }
        return changed ? { ...chart, encodings: newEncodings } : chart;
      });

      return { ...state, fields: newFields, charts: newCharts };
    }
    case 'RESET_FOR_NEW_DATA':
      return {
        ...state,
        data: [],
        fields: [],
        charts: initialState.charts,
        activeChartId: initialState.activeChartId,
        filters: [],
        isLoading: true,
        error: null,
      };
    case 'SET_MARK_TYPE':
      return { ...state, charts: updateChart(action.chartId, { markType: action.markType }) };
    case 'SET_CHART_TITLE':
      return { ...state, charts: updateChart(action.chartId, { chartTitle: action.title }) };
    case 'SET_COLOR_SCHEME':
      return { ...state, charts: updateChart(action.chartId, { colorScheme: action.colorScheme }) };
    case 'SET_SORT': {
      const targetId = action.chartId || state.activeChartId;
      const chart = state.charts.find(c => c.id === targetId);
      if (!chart || !chart.encodings[action.channel]) return state;

      const newEncodings = {
        ...chart.encodings,
        [action.channel]: { ...chart.encodings[action.channel]!, sort: action.sort },
      };
      return { ...state, charts: updateChart(action.chartId, { encodings: newEncodings }) };
    }
    case 'ADD_FILTER': {
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
    case 'SAVE_PROJECT': {
      return { ...state, projects: action.projects, currentProjectId: action.id };
    }
    case 'LOAD_PROJECT': {
      const project = action.project;
      
      // Migration: If it's an old project format, convert to multi-chart format
      let charts: ChartConfig[];
      let activeChartId: string | null;

      if ('charts' in project && Array.isArray(project.charts)) {
        charts = project.charts;
        activeChartId = project.activeChartId;
      } else {
        // Fallback for old single-chart projects
        const oldProject = project as any;
        charts = [
          {
            id: 'default',
            encodings: oldProject.encodings || {},
            markType: oldProject.markType || 'auto',
            chartTitle: oldProject.chartTitle || null,
            colorScheme: oldProject.colorScheme || 'default',
          }
        ];
        activeChartId = 'default';
      }

      return {
        ...state,
        charts,
        activeChartId,
        filters: project.filters || [],
        currentProjectId: project.id,
      };
    }
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        currentProjectId: state.currentProjectId === action.id ? null : state.currentProjectId,
      };
    case 'SET_PROJECTS':
      return { ...state, projects: action.projects };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'ADD_CHART': {
      const newChart: ChartConfig = {
        id: crypto.randomUUID(),
        encodings: {},
        markType: 'auto',
        chartTitle: null,
        colorScheme: 'default',
      };
      return {
        ...state,
        charts: [...state.charts, newChart],
        activeChartId: newChart.id,
        viewMode: 'chart', // Switch to edit mode for the new chart
      };
    }
    case 'REMOVE_CHART': {
      if (state.charts.length <= 1) return state;
      const newCharts = state.charts.filter(c => c.id !== action.id);
      let newActiveId = state.activeChartId;
      if (state.activeChartId === action.id) {
        newActiveId = newCharts[0].id;
      }
      return {
        ...state,
        charts: newCharts,
        activeChartId: newActiveId,
      };
    }
    case 'SET_ACTIVE_CHART':
      return { ...state, activeChartId: action.id };
    case 'DUPLICATE_CHART': {
      const chartToCopy = state.charts.find(c => c.id === action.id);
      if (!chartToCopy) return state;
      const newChart: ChartConfig = {
        ...chartToCopy,
        id: crypto.randomUUID(),
        chartTitle: chartToCopy.chartTitle ? `${chartToCopy.chartTitle} (Copy)` : null,
      };
      return {
        ...state,
        charts: [...state.charts, newChart],
        activeChartId: newChart.id,
      };
    }
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  assignField: (channel: EncodingChannel, field: DetectedField, chartId?: string) => void;
  removeField: (channel: EncodingChannel, chartId?: string) => void;
  setAggregate: (channel: EncodingChannel, aggregate: AggregateType, chartId?: string) => void;
  setTimeUnit: (channel: EncodingChannel, timeUnit: TimeUnit, chartId?: string) => void;
  setSort: (channel: EncodingChannel, sort: SortOrder, chartId?: string) => void;
  setMarkType: (markType: MarkType, chartId?: string) => void;
  setChartTitle: (title: string | null, chartId?: string) => void;
  setColorScheme: (colorScheme: ColorScheme, chartId?: string) => void;
  clearAll: () => void;
  toggleFieldType: (fieldName: string) => void;
  loadData: (data: Record<string, unknown>[]) => void;
  addFilter: (field: DetectedField) => void;
  updateFilter: (fieldName: string, value: FilterValue) => void;
  removeFilter: (fieldName: string) => void;
  clearFilters: () => void;
  saveProject: (name: string) => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  addChart: () => void;
  removeChart: (id: string) => void;
  setActiveChart: (id: string) => void;
  duplicateChart: (id: string) => void;
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

  const assignField = (channel: EncodingChannel, field: DetectedField, chartId?: string) => {
    dispatch({ type: 'ASSIGN_FIELD', channel, field, chartId });
  };

  const removeField = (channel: EncodingChannel, chartId?: string) => {
    dispatch({ type: 'REMOVE_FIELD', channel, chartId });
  };

  const setAggregate = (channel: EncodingChannel, aggregate: AggregateType, chartId?: string) => {
    dispatch({ type: 'SET_AGGREGATE', channel, aggregate, chartId });
  };

  const setTimeUnit = (channel: EncodingChannel, timeUnit: TimeUnit, chartId?: string) => {
    dispatch({ type: 'SET_TIME_UNIT', channel, timeUnit, chartId });
  };

  const setSort = (channel: EncodingChannel, sort: SortOrder, chartId?: string) => {
    dispatch({ type: 'SET_SORT', channel, sort, chartId });
  };

  const setMarkType = (markType: MarkType, chartId?: string) => {
    dispatch({ type: 'SET_MARK_TYPE', markType, chartId });
  };

  const setChartTitle = (title: string | null, chartId?: string) => {
    dispatch({ type: 'SET_CHART_TITLE', title, chartId });
  };

  const setColorScheme = (colorScheme: ColorScheme, chartId?: string) => {
    dispatch({ type: 'SET_COLOR_SCHEME', colorScheme, chartId });
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

  const saveProject = (name: string) => {
    const id = state.currentProjectId && state.currentProjectId !== 'temp-session' 
      ? state.currentProjectId 
      : crypto.randomUUID();
    
    const project: SavedProject = {
      id,
      name,
      updatedAt: Date.now(),
      charts: state.charts,
      activeChartId: state.activeChartId,
      filters: state.filters,
    };

    persistence.saveProject(project);
    const metadata = persistence.getProjectsMetadata();
    
    dispatch({ type: 'SAVE_PROJECT', name, id, projects: metadata });
  };

  const loadProject = (id: string) => {
    const project = persistence.getProject(id);
    if (project) {
      dispatch({ type: 'LOAD_PROJECT', project: project as SavedProject });
    }
  };

  const deleteProject = (id: string) => {
    persistence.deleteProject(id);
    dispatch({ type: 'DELETE_PROJECT', id });
  };

  const addChart = () => dispatch({ type: 'ADD_CHART' });
  const removeChart = (id: string) => dispatch({ type: 'REMOVE_CHART', id });
  const setActiveChart = (id: string) => dispatch({ type: 'SET_ACTIVE_CHART', id });
  const duplicateChart = (id: string) => dispatch({ type: 'DUPLICATE_CHART', id });

  // Initial load of projects and session
  useEffect(() => {
    const metadata = persistence.getProjectsMetadata();
    dispatch({ type: 'SET_PROJECTS', projects: metadata });

    const lastSession = persistence.getLastSession();
    if (lastSession) {
      // Small adaptation for potential old session format
      const projectData = lastSession as any;
      const charts = projectData.charts || [{
        id: 'default',
        encodings: projectData.encodings || {},
        markType: projectData.markType || 'auto',
        chartTitle: projectData.chartTitle || null,
        colorScheme: projectData.colorScheme || 'default',
      }];
      
      dispatch({
        type: 'LOAD_PROJECT',
        project: {
          ...projectData,
          charts,
          activeChartId: projectData.activeChartId || charts[0].id,
          name: 'Restored Session',
          updatedAt: Date.now(),
        } as SavedProject,
      });
    }
  }, []);

  // Auto-save last session
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    persistence.saveLastSession({
      id: state.currentProjectId || 'temp-session',
      charts: state.charts,
      activeChartId: state.activeChartId,
      filters: state.filters,
    });
  }, [state.charts, state.activeChartId, state.filters]);

  return (
    <AppContext.Provider
      value={{
        state,
        assignField,
        removeField,
        setAggregate,
        setTimeUnit,
        setSort,
        setMarkType,
        setChartTitle,
        setColorScheme,
        clearAll,
        toggleFieldType,
        loadData,
        addFilter,
        updateFilter,
        removeFilter,
        clearFilters,
        saveProject,
        loadProject,
        deleteProject,
        setViewMode: (mode: ViewMode) => dispatch({ type: 'SET_VIEW_MODE', mode }),
        addChart,
        removeChart,
        setActiveChart,
        duplicateChart,
      }}
    >
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
