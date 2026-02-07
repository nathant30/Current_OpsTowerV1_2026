/**
 * Analytics System - Utility Functions
 *
 * Helper functions for data transformation, formatting, and export
 *
 * @module lib/analytics/utils
 */

import type { MetricTrend, ChartData } from './types';

// =====================================================
// DATE UTILITIES
// =====================================================

/**
 * Get date range for period
 */
export function getDateRangeForPeriod(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7days':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30days':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90days':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'thisMonth':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'lastMonth':
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisYear':
      startDate.setMonth(0);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}

/**
 * Format date for SQL query
 */
export function formatDateForSQL(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse SQL date string to Date
 */
export function parseSQLDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get month name from number
 */
export function getMonthName(monthNumber: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[monthNumber - 1] || '';
}

// =====================================================
// CALCULATION UTILITIES
// =====================================================

/**
 * Calculate metric trend
 */
export function calculateTrend(current: number, previous: number): MetricTrend {
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 1) {
    trend = change > 0 ? 'up' : 'down';
  }

  return {
    current,
    previous,
    change,
    changePercent,
    trend,
  };
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) {return 0;}
  return Math.round((value / total) * 100 * 100) / 100;
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) {return 0;}
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

/**
 * Calculate average
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) {return 0;}
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Calculate median
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) {return 0;}
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// =====================================================
// FORMATTING UTILITIES
// =====================================================

/**
 * Format currency (Philippine Peso)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-PH').format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format duration (minutes to hours/minutes)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =====================================================
// DATA TRANSFORMATION UTILITIES
// =====================================================

/**
 * Group data by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Sort array by key
 */
export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) {return order === 'asc' ? -1 : 1;}
    if (aVal > bVal) {return order === 'asc' ? 1 : -1;}
    return 0;
  });
}

/**
 * Aggregate data by sum
 */
export function sumBy<T>(array: T[], key: keyof T): number {
  return array.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}

/**
 * Create time series data
 */
export function createTimeSeries(
  startDate: Date,
  endDate: Date,
  interval: 'day' | 'week' | 'month'
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));

    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return dates;
}

// =====================================================
// CSV EXPORT UTILITIES
// =====================================================

/**
 * Convert object array to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns?: Array<{ key: keyof T; label: string }>
): string {
  if (data.length === 0) {return '';}

  // Get columns from first object if not provided
  const cols =
    columns ||
    Object.keys(data[0]).map((key) => ({
      key: key as keyof T,
      label: key,
    }));

  // Create header row
  const header = cols.map((col) => escapeCSVValue(col.label)).join(',');

  // Create data rows
  const rows = data.map((row) => {
    return cols
      .map((col) => {
        const value = row[col.key];
        return escapeCSVValue(String(value ?? ''));
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Escape CSV value
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// =====================================================
// CHART DATA UTILITIES
// =====================================================

/**
 * Generate colors for charts
 */
export function generateColors(count: number, opacity: number = 1): string[] {
  const baseColors = [
    `rgba(59, 130, 246, ${opacity})`, // blue
    `rgba(16, 185, 129, ${opacity})`, // green
    `rgba(245, 158, 11, ${opacity})`, // amber
    `rgba(239, 68, 68, ${opacity})`, // red
    `rgba(139, 92, 246, ${opacity})`, // purple
    `rgba(236, 72, 153, ${opacity})`, // pink
    `rgba(20, 184, 166, ${opacity})`, // teal
    `rgba(251, 146, 60, ${opacity})`, // orange
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors if needed
  const colors = [...baseColors];
  while (colors.length < count) {
    const hue = (colors.length * 137.5) % 360;
    colors.push(`hsla(${hue}, 70%, 60%, ${opacity})`);
  }

  return colors;
}

/**
 * Transform data for line chart
 */
export function transformToLineChartData(
  data: Array<{ label: string; value: number }>,
  datasetLabel: string = 'Value'
): ChartData {
  return {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: datasetLabel,
        data: data.map((d) => d.value),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
    ],
  };
}

/**
 * Transform data for bar chart
 */
export function transformToBarChartData(
  data: Array<{ label: string; value: number }>,
  datasetLabel: string = 'Value'
): ChartData {
  return {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: datasetLabel,
        data: data.map((d) => d.value),
        backgroundColor: generateColors(data.length, 0.8),
      },
    ],
  };
}

/**
 * Transform data for pie chart
 */
export function transformToPieChartData(
  data: Array<{ label: string; value: number }>
): ChartData {
  return {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: 'Distribution',
        data: data.map((d) => d.value),
        backgroundColor: generateColors(data.length, 0.8),
      },
    ],
  };
}

// =====================================================
// VALIDATION UTILITIES
// =====================================================

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Validate date is not in future
 */
export function validateNotFuture(date: Date): boolean {
  return date <= new Date();
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '');
}

// =====================================================
// STATISTICS UTILITIES
// =====================================================

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) {return 0;}
  const avg = calculateAverage(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate percentile
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {return 0;}
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Simple moving average
 */
export function calculateMovingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(values[i]);
    } else {
      const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
  }
  return result;
}

// =====================================================
// COLOR UTILITIES
// =====================================================

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    completed: 'text-green-600',
    pending: 'text-yellow-600',
    failed: 'text-red-600',
    cancelled: 'text-gray-600',
    active: 'text-blue-600',
    inactive: 'text-gray-400',
  };
  return statusColors[status.toLowerCase()] || 'text-gray-600';
}

/**
 * Get trend color
 */
export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600',
  };
  return trendColors[trend];
}

/**
 * Get performance color
 */
export function getPerformanceColor(value: number, thresholds: { good: number; warning: number }): string {
  if (value >= thresholds.good) {return 'text-green-600';}
  if (value >= thresholds.warning) {return 'text-yellow-600';}
  return 'text-red-600';
}
