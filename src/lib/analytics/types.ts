/**
 * Analytics System - TypeScript Type Definitions
 *
 * Comprehensive types for OpsTower analytics and reporting system
 *
 * @module lib/analytics/types
 */

// =====================================================
// COMMON TYPES
// =====================================================

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type Period = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export type MetricTrend = {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
};

// =====================================================
// REVENUE ANALYTICS TYPES
// =====================================================

export type RevenueData = {
  date: string;
  totalRevenue: number;
  platformCommission: number;
  driverEarnings: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  avgBookingValue: number;
  activeDrivers: number;
  activePassengers: number;
  completionRate: number;
  cancellationRate: number;
};

export type ServiceTypeRevenue = {
  serviceType: string;
  revenue: number;
  bookings: number;
  avgValue: number;
  percentage: number;
};

export type RegionRevenue = {
  regionId: string;
  regionName: string;
  revenue: number;
  bookings: number;
  avgValue: number;
  activeDrivers: number;
  activePassengers: number;
};

export type GrowthData = {
  period: string;
  value: number;
  growth: number;
  growthPercent: number;
};

export type ProjectionData = {
  month: string;
  projectedRevenue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  growthRate: number;
};

// =====================================================
// BOOKING ANALYTICS TYPES
// =====================================================

export type TrendData = {
  period: string;
  value: number;
  label: string;
};

export type PeakHourData = {
  hour: number;
  dayOfWeek: string;
  bookingCount: number;
  avgFare: number;
  avgWaitTime: number;
  surgeMultiplier: number;
  demandLevel: 'low' | 'medium' | 'high' | 'peak';
};

export type ServiceTypeStats = {
  serviceType: string;
  totalBookings: number;
  completedBookings: number;
  revenue: number;
  avgFare: number;
  avgDuration: number;
  completionRate: number;
};

export type WaitTimeStats = {
  overall: number;
  byServiceType: Record<string, number>;
  byHour: Array<{ hour: number; waitTime: number }>;
  trend: MetricTrend;
};

export type CancellationStats = {
  overallRate: number;
  byDriver: number;
  byPassenger: number;
  byServiceType: Record<string, number>;
  topReasons: Array<{ reason: string; count: number; percentage: number }>;
  trend: MetricTrend;
};

export type CompletionStats = {
  overallRate: number;
  byServiceType: Record<string, number>;
  byRegion: Record<string, number>;
  trend: MetricTrend;
};

// =====================================================
// DRIVER ANALYTICS TYPES
// =====================================================

export type DriverStats = {
  driverId: string;
  driverCode: string;
  driverName: string;
  phone: string;
  currentStatus: string;
  primaryService: string;

  // Trip statistics
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  failedTrips: number;
  tripsLast7Days: number;
  tripsLast30Days: number;

  // Earnings
  totalEarnings: number;
  earningsLast7Days: number;
  earningsLast30Days: number;
  avgEarningsPerTrip: number;

  // Ratings
  overallRating: number;
  avgTripRating: number;
  positiveRatings: number;
  negativeRatings: number;

  // Performance
  completionRate: number;
  cancellationRate: number;
  acceptanceRate: number;
  avgTripDuration: number;
  avgWaitTime: number;

  // Activity
  lastTripDate: string | null;
  driverSince: string;
  performanceTier: 'VIP' | 'Premium' | 'Regular';
  isActive: boolean;
};

export type DriverRanking = {
  rank: number;
  driverId: string;
  driverName: string;
  driverCode: string;
  metricValue: number;
  metricLabel: string;
  performanceTier: string;
  rating: number;
  totalTrips: number;
};

export type EarningsData = {
  period: string;
  earnings: number;
  trips: number;
  avgPerTrip: number;
  hours: number;
  avgPerHour: number;
};

export type AvailabilityData = {
  totalHours: number;
  activeHours: number;
  breakHours: number;
  offlineHours: number;
  utilizationRate: number;
  peakHourAvailability: number;
};

export type HeatmapData = {
  hour: number;
  day: string;
  trips: number;
  earnings: number;
  intensity: number;
};

// =====================================================
// PASSENGER ANALYTICS TYPES
// =====================================================

export type RetentionData = {
  cohortMonth: string;
  totalPassengers: number;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  month12: number;
  retentionRate: Record<string, number>;
};

export type SegmentData = {
  segment: 'VIP' | 'Premium' | 'Regular';
  passengerCount: number;
  percentage: number;
  avgLifetimeValue: number;
  avgBookings: number;
  avgBookingValue: number;
  retentionRate: number;
};

export type FrequencyData = {
  frequency: string;
  passengerCount: number;
  percentage: number;
  avgLifetimeValue: number;
};

export type ChurnData = {
  month: string;
  totalPassengers: number;
  churnedPassengers: number;
  churnRate: number;
  atRiskPassengers: number;
};

// =====================================================
// FINANCIAL REPORTING TYPES
// =====================================================

export type FinancialReport = {
  period: string;
  startDate: string;
  endDate: string;

  // Revenue summary
  grossRevenue: number;
  platformCommission: number;
  driverPayouts: number;
  netRevenue: number;

  // Booking summary
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  refundedBookings: number;

  // Service breakdown
  serviceTypeBreakdown: Array<{
    serviceType: string;
    revenue: number;
    bookings: number;
    percentage: number;
  }>;

  // Payment breakdown
  paymentMethodBreakdown: Array<{
    paymentMethod: string;
    amount: number;
    transactions: number;
    percentage: number;
  }>;

  // Regional breakdown
  regionalBreakdown: Array<{
    region: string;
    revenue: number;
    bookings: number;
    percentage: number;
  }>;

  // Growth metrics
  growthRate: number;
  previousPeriodRevenue: number;

  // Cost breakdown (if available)
  operatingCosts?: number;
  marketingCosts?: number;
  supportCosts?: number;
};

export type TaxSummary = {
  year: number;
  quarter?: number;

  // VAT summary (12% in Philippines)
  vatCollected: number;
  vatRemitted: number;
  vatBalance: number;

  // Income summary
  grossIncome: number;
  deductions: number;
  taxableIncome: number;
  incomeTax: number;

  // Withholding tax (for drivers)
  withholdingTax: number;
  driversAffected: number;

  // Monthly breakdown
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    vat: number;
    withholdingTax: number;
  }>;

  // Documents
  receiptCount: number;
  atpNumber?: string;
  tinNumber?: string;
};

export type CommissionReport = {
  startDate: string;
  endDate: string;

  // Overall commission
  totalCommission: number;
  commissionRate: number;
  commissionByServiceType: Record<string, number>;

  // Driver breakdown
  driverCommissions: Array<{
    driverId: string;
    driverName: string;
    totalEarnings: number;
    platformCommission: number;
    netEarnings: number;
    trips: number;
  }>;

  // Payment status
  paidCommission: number;
  pendingCommission: number;
  outstandingCommission: number;
};

// =====================================================
// EXPORT TYPES
// =====================================================

export type ExportFormat = 'csv' | 'pdf' | 'xlsx';

export type ExportRequest = {
  reportType: string;
  format: ExportFormat;
  dateRange: DateRange;
  filters?: Record<string, any>;
  includeCharts?: boolean;
};

export type ExportResult = {
  success: boolean;
  filename: string;
  url?: string;
  buffer?: Buffer;
  size: number;
  error?: string;
};

// =====================================================
// REPORT SCHEDULE TYPES
// =====================================================

export type ReportSchedule = {
  id: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  format: ExportFormat;
  filters?: Record<string, any>;
  isActive: boolean;
  nextRunDate: Date;
  lastRunDate?: Date;
};

// =====================================================
// DASHBOARD TYPES
// =====================================================

export type DashboardKPI = {
  label: string;
  value: number | string;
  trend?: MetricTrend;
  icon?: string;
  format?: 'currency' | 'number' | 'percent' | 'duration';
};

export type ChartData = {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }>;
};

export type TableData<T = any> = {
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    format?: 'currency' | 'number' | 'percent' | 'date';
  }>;
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

// =====================================================
// API RESPONSE TYPES
// =====================================================

export type AnalyticsResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    cached?: boolean;
    cacheAge?: number;
  };
};

// =====================================================
// FILTER TYPES
// =====================================================

export type AnalyticsFilters = {
  startDate?: Date;
  endDate?: Date;
  serviceType?: string[];
  region?: string[];
  status?: string[];
  paymentMethod?: string[];
};

// =====================================================
// MATERIALIZED VIEW TYPES (matching database views)
// =====================================================

export type DailyRevenueSummaryRow = {
  date: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  active_bookings: number;
  total_revenue: number;
  platform_commission: number;
  driver_earnings: number;
  avg_booking_value: number;
  ride_4w_count: number;
  ride_2w_count: number;
  delivery_count: number;
  ride_4w_revenue: number;
  ride_2w_revenue: number;
  delivery_revenue: number;
  active_drivers: number;
  active_passengers: number;
  avg_customer_rating: number;
  avg_driver_rating: number;
  cancellation_rate: number;
  completion_rate: number;
};

export type DriverPerformanceMetricsRow = {
  driver_id: string;
  driver_code: string;
  driver_name: string;
  driver_phone: string;
  current_status: string;
  primary_service: string;
  total_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  failed_trips: number;
  trips_last_7_days: number;
  trips_last_30_days: number;
  total_earnings: number;
  earnings_last_7_days: number;
  earnings_last_30_days: number;
  avg_earnings_per_trip: number;
  overall_rating: number;
  avg_trip_rating: number;
  positive_ratings: number;
  negative_ratings: number;
  completion_rate: number;
  cancellation_rate: number;
  acceptance_rate: number;
  avg_trip_duration_minutes: number;
  avg_wait_time_minutes: number;
  last_trip_date: string | null;
  is_active: boolean;
  driver_since: string;
  performance_tier: 'VIP' | 'Premium' | 'Regular';
};

export type PassengerRetentionCohortsRow = {
  passenger_id: string;
  first_booking_date: string;
  cohort_month: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  last_booking_date: string;
  bookings_last_7_days: number;
  bookings_last_30_days: number;
  bookings_last_90_days: number;
  lifetime_value: number;
  avg_booking_value: number;
  ride_4w_count: number;
  ride_2w_count: number;
  delivery_count: number;
  avg_rating_given: number;
  ratings_given_count: number;
  days_active: number;
  bookings_per_day: number;
  is_churned: boolean;
  days_since_last_booking: number;
  customer_tier: 'VIP' | 'Premium' | 'Regular';
  retention_status: 'Active' | 'At Risk' | 'Inactive' | 'Churned';
};

export type BookingTrendsHourlyRow = {
  hour_of_day: number;
  day_of_week: number;
  day_name: string;
  booking_count: number;
  completed_count: number;
  cancelled_count: number;
  avg_fare: number;
  total_revenue: number;
  ride_4w_count: number;
  ride_2w_count: number;
  delivery_count: number;
  avg_wait_time_minutes: number;
  avg_trip_duration_minutes: number;
  avg_surge_multiplier: number;
  surge_bookings_count: number;
  unique_drivers: number;
  unique_passengers: number;
  bookings_per_driver_ratio: number;
};

export type PaymentMethodDistributionRow = {
  payment_method: string;
  payment_status: string;
  transaction_count: number;
  successful_count: number;
  failed_count: number;
  pending_count: number;
  refunded_count: number;
  total_amount: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  success_rate: number;
  failure_rate: number;
  provider: string;
  transactions_last_7_days: number;
  amount_last_7_days: number;
  transactions_last_30_days: number;
  amount_last_30_days: number;
  total_refunded: number;
  last_transaction_date: string;
};
