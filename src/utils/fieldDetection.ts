import type { FieldType, DetectedField } from '../types';

const CATEGORICAL_THRESHOLD = 20;

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                    // YYYY-MM-DD
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,  // ISO 8601 datetime
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,            // MM/DD/YYYY or M/D/YY
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,              // MM-DD-YYYY
];

function isTemporalField(values: unknown[]): boolean {
  const stringValues = values.filter((v): v is string => typeof v === 'string');

  // Temporal fields must be strings (not numbers that look like years)
  if (stringValues.length < values.length * 0.8) return false;

  const dateMatches = stringValues.filter((v) => {
    // STRICT: Only match explicit date patterns, no Date.parse()
    return DATE_PATTERNS.some((pattern) => pattern.test(v));
  });

  return dateMatches.length >= stringValues.length * 0.8;
}

// Common ID field name patterns
const ID_NAME_PATTERNS = [
  /^id$/i,
  /_id$/i,
  /^.*_id$/i,
  /^.*id$/i,
  /code$/i,
  /^key$/i,
  /^.*_key$/i,
];

function hasIdFieldName(fieldName: string): boolean {
  return ID_NAME_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function looksLikeId(values: unknown[]): boolean {
  const numericValues = values.filter((v): v is number => typeof v === 'number');
  if (numericValues.length !== values.length) return false;

  // Check if all integers
  const allIntegers = numericValues.every((v) => Number.isInteger(v));
  if (!allIntegers) return false;

  // Check if values are sequential or nearly sequential (ID pattern)
  const sorted = [...numericValues].sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) gaps++;
  }
  const sequentialRatio = gaps / (sorted.length - 1);
  if (sequentialRatio > 0.7) return true;

  // Check if values are very large AND sequential-ish (likely IDs, not meaningful quantities)
  const avgValue = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
  if (avgValue > 10000 && sequentialRatio > 0.3) return true;

  return false;
}

export function detectFieldType(values: unknown[], fieldName?: string): FieldType {
  const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) return 'nominal';

  const sample = nonNullValues.slice(0, 100);
  const uniqueValues = new Set(sample);
  const uniqueCount = uniqueValues.size;

  // Check for temporal fields first
  if (isTemporalField(sample)) {
    return 'temporal';
  }

  const numericValues = sample.filter(
    (v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)))
  );
  const isNumeric = numericValues.length === sample.length;

  if (isNumeric) {
    // Check if field name suggests it's an ID
    if (fieldName && hasIdFieldName(fieldName)) {
      return 'nominal';
    }

    // Check if values look like IDs
    if (looksLikeId(sample)) {
      return 'nominal';
    }

    // Distinguish ordinal from quantitative
    if (uniqueCount <= CATEGORICAL_THRESHOLD) {
      return 'ordinal';
    }
    return 'quantitative';
  }

  return 'nominal';
}

export function detectAllFields(data: Record<string, unknown>[]): DetectedField[] {
  if (data.length === 0) return [];

  const fieldNames = Object.keys(data[0]);

  return fieldNames.map((name) => {
    const values = data.map((row) => row[name]);
    const type = detectFieldType(values, name);
    const uniqueCount = new Set(values.filter((v) => v != null)).size;

    return {
      name,
      type,
      uniqueCount,
    };
  });
}
