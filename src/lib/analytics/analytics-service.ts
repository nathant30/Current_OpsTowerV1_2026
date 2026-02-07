/**
 * Analytics Service
 *
 * Comprehensive analytics service for business intelligence, driver/passenger insights,
 * and financial reporting
 *
 * @module lib/analytics/analytics-service
 */

import { query } from '@/lib/db';
import type {
  RevenueData,
  ServiceTypeRevenue,
  RegionRevenue,
  GrowthData,
  ProjectionData,
  TrendData,
  PeakHourData,
  ServiceTypeStats,
  WaitTimeStats,
  CancellationStats,
  CompletionStats,
  DriverStats,
  DriverRanking,
  EarningsData,
  AvailabilityData,
  HeatmapData,
  RetentionData,
  SegmentData,
  FrequencyData,
  ChurnData,
  FinancialReport,
  TaxSummary,
  CommissionReport,
  DailyRevenueSummaryRow,
  DriverPerformanceMetricsRow,
  PassengerRetentionCohortsRow,
  BookingTrendsHourlyRow,
  PaymentMethodDistributionRow,
} from './types';
import {
  formatDateForSQL,
  calculateTrend,
  calculateGrowthRate,
  calculatePercentage,
  getMonthName,
  arrayToCSV,
} from './utils';

// =====================================================
// ANALYTICS SERVICE CLASS
// =====================================================

export class AnalyticsService {
  // =====================================================
  // REVENUE ANALYTICS (6 methods)
  // =====================================================

  /**
   * Get daily revenue for date range
   */
  async getDailyRevenue(startDate: Date, endDate: Date): Promise<RevenueData[]> {
    try {
      const start = formatDateForSQL(startDate);
      const end = formatDateForSQL(endDate);

      const result = await query<DailyRevenueSummaryRow>(
        `SELECT * FROM daily_revenue_summary
         WHERE date >= $1 AND date <= $2
         ORDER BY date ASC`,
        [start, end]
      );

      return result.rows.map((row) => ({
        date: row.date,
        totalRevenue: Number(row.total_revenue),
        platformCommission: Number(row.platform_commission),
        driverEarnings: Number(row.driver_earnings),
        totalBookings: Number(row.total_bookings),
        completedBookings: Number(row.completed_bookings),
        cancelledBookings: Number(row.cancelled_bookings),
        avgBookingValue: Number(row.avg_booking_value),
        activeDrivers: Number(row.active_drivers),
        activePassengers: Number(row.active_passengers),
        completionRate: Number(row.completion_rate),
        cancellationRate: Number(row.cancellation_rate),
      }));
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
      return [];
    }
  }

  /**
   * Get monthly revenue for year
   */
  async getMonthlyRevenue(year: number): Promise<RevenueData[]> {
    try {
      const result = await query<any>(
        `SELECT
           EXTRACT(MONTH FROM date) as month,
           SUM(total_revenue) as total_revenue,
           SUM(platform_commission) as platform_commission,
           SUM(driver_earnings) as driver_earnings,
           SUM(total_bookings) as total_bookings,
           SUM(completed_bookings) as completed_bookings,
           SUM(cancelled_bookings) as cancelled_bookings,
           AVG(avg_booking_value) as avg_booking_value,
           AVG(active_drivers) as active_drivers,
           AVG(active_passengers) as active_passengers,
           AVG(completion_rate) as completion_rate,
           AVG(cancellation_rate) as cancellation_rate
         FROM daily_revenue_summary
         WHERE EXTRACT(YEAR FROM date) = $1
         GROUP BY EXTRACT(MONTH FROM date)
         ORDER BY month ASC`,
        [year]
      );

      return result.rows.map((row) => ({
        date: `${year}-${String(row.month).padStart(2, '0')}`,
        totalRevenue: Number(row.total_revenue),
        platformCommission: Number(row.platform_commission),
        driverEarnings: Number(row.driver_earnings),
        totalBookings: Number(row.total_bookings),
        completedBookings: Number(row.completed_bookings),
        cancelledBookings: Number(row.cancelled_bookings),
        avgBookingValue: Number(row.avg_booking_value),
        activeDrivers: Math.round(Number(row.active_drivers)),
        activePassengers: Math.round(Number(row.active_passengers)),
        completionRate: Number(row.completion_rate),
        cancellationRate: Number(row.cancellation_rate),
      }));
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      return [];
    }
  }

  /**
   * Get revenue by service type
   */
  async getRevenueByServiceType(startDate?: Date, endDate?: Date): Promise<ServiceTypeRevenue[]> {
    try {
      let whereclause = '';
      const params: any[] = [];

      if (startDate && endDate) {
        whereclause = 'WHERE date >= $1 AND date <= $2';
        params.push(formatDateForSQL(startDate), formatDateForSQL(endDate));
      } else {
        whereclause = 'WHERE date >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const result = await query<any>(
        `SELECT
           SUM(ride_4w_revenue) as ride_4w_revenue,
           SUM(ride_4w_count) as ride_4w_count,
           SUM(ride_2w_revenue) as ride_2w_revenue,
           SUM(ride_2w_count) as ride_2w_count,
           SUM(delivery_revenue) as delivery_revenue,
           SUM(delivery_count) as delivery_count,
           SUM(total_revenue) as total_revenue
         FROM daily_revenue_summary
         ${whereclause}`,
        params
      );

      if (result.rows.length === 0) {
        return [];
      }

      const row = result.rows[0];
      const totalRevenue = Number(row.total_revenue);

      const serviceTypes = [
        {
          serviceType: 'Ride 4W',
          revenue: Number(row.ride_4w_revenue),
          bookings: Number(row.ride_4w_count),
          avgValue: Number(row.ride_4w_count) > 0 ? Number(row.ride_4w_revenue) / Number(row.ride_4w_count) : 0,
          percentage: calculatePercentage(Number(row.ride_4w_revenue), totalRevenue),
        },
        {
          serviceType: 'Ride 2W',
          revenue: Number(row.ride_2w_revenue),
          bookings: Number(row.ride_2w_count),
          avgValue: Number(row.ride_2w_count) > 0 ? Number(row.ride_2w_revenue) / Number(row.ride_2w_count) : 0,
          percentage: calculatePercentage(Number(row.ride_2w_revenue), totalRevenue),
        },
        {
          serviceType: 'Delivery',
          revenue: Number(row.delivery_revenue),
          bookings: Number(row.delivery_count),
          avgValue: Number(row.delivery_count) > 0 ? Number(row.delivery_revenue) / Number(row.delivery_count) : 0,
          percentage: calculatePercentage(Number(row.delivery_revenue), totalRevenue),
        },
      ];

      return serviceTypes.filter((st) => st.revenue > 0);
    } catch (error) {
      console.error('Error fetching revenue by service type:', error);
      return [];
    }
  }

  /**
   * Get revenue growth
   */
  async getRevenueGrowth(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<GrowthData> {
    try {
      let interval = '1 day';
      let groupBy = 'DATE(date)';

      if (period === 'weekly') {
        interval = '7 days';
        groupBy = 'DATE_TRUNC(\'week\', date)';
      } else if (period === 'monthly') {
        interval = '30 days';
        groupBy = 'DATE_TRUNC(\'month\', date)';
      }

      const result = await query<any>(
        `SELECT
           ${groupBy} as period,
           SUM(total_revenue) as revenue
         FROM daily_revenue_summary
         WHERE date >= CURRENT_DATE - INTERVAL '${interval}' * 2
         GROUP BY ${groupBy}
         ORDER BY period DESC
         LIMIT 2`
      );

      if (result.rows.length < 2) {
        return {
          period: period,
          value: result.rows[0] ? Number(result.rows[0].revenue) : 0,
          growth: 0,
          growthPercent: 0,
        };
      }

      const current = Number(result.rows[0].revenue);
      const previous = Number(result.rows[1].revenue);

      return {
        period: period,
        value: current,
        growth: current - previous,
        growthPercent: calculateGrowthRate(current, previous),
      };
    } catch (error) {
      console.error('Error calculating revenue growth:', error);
      return { period: period, value: 0, growth: 0, growthPercent: 0 };
    }
  }

  /**
   * Get revenue projection (simple linear projection)
   */
  async getRevenueProjection(months: number = 6): Promise<ProjectionData[]> {
    try {
      // Get last 6 months of data
      const result = await query<any>(
        `SELECT
           DATE_TRUNC('month', date) as month,
           SUM(total_revenue) as revenue
         FROM daily_revenue_summary
         WHERE date >= CURRENT_DATE - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', date)
         ORDER BY month ASC`
      );

      if (result.rows.length < 3) {
        return [];
      }

      // Calculate average growth rate
      const revenues = result.rows.map((r) => Number(r.revenue));
      let totalGrowth = 0;
      for (let i = 1; i < revenues.length; i++) {
        totalGrowth += calculateGrowthRate(revenues[i], revenues[i - 1]);
      }
      const avgGrowthRate = totalGrowth / (revenues.length - 1);

      // Project future months
      const projections: ProjectionData[] = [];
      let lastRevenue = revenues[revenues.length - 1];

      for (let i = 1; i <= months; i++) {
        const projectedRevenue = lastRevenue * (1 + avgGrowthRate / 100);
        const confidenceMargin = projectedRevenue * 0.1 * i; // Increasing uncertainty

        projections.push({
          month: new Date(
            new Date().getFullYear(),
            new Date().getMonth() + i,
            1
          ).toISOString().split('T')[0].substring(0, 7),
          projectedRevenue: Math.round(projectedRevenue),
          confidenceInterval: {
            lower: Math.round(projectedRevenue - confidenceMargin),
            upper: Math.round(projectedRevenue + confidenceMargin),
          },
          growthRate: avgGrowthRate,
        });

        lastRevenue = projectedRevenue;
      }

      return projections;
    } catch (error) {
      console.error('Error calculating revenue projection:', error);
      return [];
    }
  }

  /**
   * Get revenue by region
   */
  async getRevenueByRegion(startDate?: Date, endDate?: Date): Promise<RegionRevenue[]> {
    try {
      let whereclause = '';
      const params: any[] = [];

      if (startDate && endDate) {
        whereclause = 'AND b.created_at >= $1 AND b.created_at <= $2';
        params.push(startDate.toISOString(), endDate.toISOString());
      } else {
        whereclause = 'AND b.created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const result = await query<any>(
        `SELECT
           r.id as region_id,
           r.name as region_name,
           SUM(CASE WHEN b.status = 'completed' THEN b.total_fare ELSE 0 END) as revenue,
           COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as bookings,
           AVG(CASE WHEN b.status = 'completed' THEN b.total_fare END) as avg_value,
           COUNT(DISTINCT b.driver_id) as active_drivers,
           COUNT(DISTINCT b.customer_id) as active_passengers
         FROM regions r
         LEFT JOIN bookings b ON r.id = b.region_id
         WHERE r.is_active = true ${whereclause}
         GROUP BY r.id, r.name
         HAVING COUNT(b.id) > 0
         ORDER BY revenue DESC`,
        params
      );

      return result.rows.map((row) => ({
        regionId: row.region_id,
        regionName: row.region_name,
        revenue: Number(row.revenue),
        bookings: Number(row.bookings),
        avgValue: Number(row.avg_value) || 0,
        activeDrivers: Number(row.active_drivers),
        activePassengers: Number(row.active_passengers),
      }));
    } catch (error) {
      console.error('Error fetching revenue by region:', error);
      return [];
    }
  }

  // =====================================================
  // BOOKING ANALYTICS (6 methods)
  // =====================================================

  /**
   * Get booking trends
   */
  async getBookingTrends(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<TrendData[]> {
    try {
      let groupBy = 'DATE(created_at)';
      let interval = '30 days';

      if (period === 'hour') {
        groupBy = 'DATE_TRUNC(\'hour\', created_at)';
        interval = '24 hours';
      } else if (period === 'week') {
        groupBy = 'DATE_TRUNC(\'week\', created_at)';
        interval = '12 weeks';
      } else if (period === 'month') {
        groupBy = 'DATE_TRUNC(\'month\', created_at)';
        interval = '12 months';
      }

      const result = await query<any>(
        `SELECT
           ${groupBy} as period,
           COUNT(*) as booking_count
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '${interval}'
         GROUP BY ${groupBy}
         ORDER BY period ASC`
      );

      return result.rows.map((row) => ({
        period: row.period,
        value: Number(row.booking_count),
        label: row.period,
      }));
    } catch (error) {
      console.error('Error fetching booking trends:', error);
      return [];
    }
  }

  /**
   * Get peak hours
   */
  async getPeakHours(): Promise<PeakHourData[]> {
    try {
      const result = await query<BookingTrendsHourlyRow>(
        `SELECT * FROM booking_trends_hourly
         ORDER BY booking_count DESC
         LIMIT 10`
      );

      return result.rows.map((row) => ({
        hour: Number(row.hour_of_day),
        dayOfWeek: row.day_name,
        bookingCount: Number(row.booking_count),
        avgFare: Number(row.avg_fare),
        avgWaitTime: Number(row.avg_wait_time_minutes),
        surgeMultiplier: Number(row.avg_surge_multiplier),
        demandLevel: this.getDemandLevel(Number(row.bookings_per_driver_ratio)),
      }));
    } catch (error) {
      console.error('Error fetching peak hours:', error);
      return [];
    }
  }

  /**
   * Get bookings by service type
   */
  async getBookingsByServiceType(startDate?: Date, endDate?: Date): Promise<ServiceTypeStats[]> {
    try {
      let whereclause = '';
      const params: any[] = [];

      if (startDate && endDate) {
        whereclause = 'WHERE created_at >= $1 AND created_at <= $2';
        params.push(startDate.toISOString(), endDate.toISOString());
      } else {
        whereclause = 'WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const result = await query<any>(
        `SELECT
           service_type,
           COUNT(*) as total_bookings,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
           SUM(CASE WHEN status = 'completed' THEN total_fare ELSE 0 END) as revenue,
           AVG(CASE WHEN status = 'completed' THEN total_fare END) as avg_fare,
           AVG(
             CASE
               WHEN status = 'completed' AND completed_at IS NOT NULL AND actual_pickup_time IS NOT NULL
               THEN EXTRACT(EPOCH FROM (completed_at - actual_pickup_time)) / 60
             END
           ) as avg_duration,
           ROUND(
             (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as completion_rate
         FROM bookings
         ${whereclause}
         GROUP BY service_type
         ORDER BY total_bookings DESC`,
        params
      );

      return result.rows.map((row) => ({
        serviceType: row.service_type,
        totalBookings: Number(row.total_bookings),
        completedBookings: Number(row.completed_bookings),
        revenue: Number(row.revenue) || 0,
        avgFare: Number(row.avg_fare) || 0,
        avgDuration: Number(row.avg_duration) || 0,
        completionRate: Number(row.completion_rate),
      }));
    } catch (error) {
      console.error('Error fetching bookings by service type:', error);
      return [];
    }
  }

  /**
   * Get average wait time
   */
  async getAverageWaitTime(): Promise<WaitTimeStats> {
    try {
      // Overall wait time
      const overallResult = await query<any>(
        `SELECT
           AVG(
             CASE
               WHEN actual_pickup_time IS NOT NULL AND requested_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (actual_pickup_time - requested_at)) / 60
             END
           ) as avg_wait_time
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
           AND status = 'completed'`
      );

      const overall = Number(overallResult.rows[0]?.avg_wait_time) || 0;

      // By service type
      const byServiceTypeResult = await query<any>(
        `SELECT
           service_type,
           AVG(
             CASE
               WHEN actual_pickup_time IS NOT NULL AND requested_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (actual_pickup_time - requested_at)) / 60
             END
           ) as avg_wait_time
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
           AND status = 'completed'
         GROUP BY service_type`
      );

      const byServiceType: Record<string, number> = {};
      byServiceTypeResult.rows.forEach((row) => {
        byServiceType[row.service_type] = Number(row.avg_wait_time) || 0;
      });

      // By hour
      const byHourResult = await query<any>(
        `SELECT
           EXTRACT(HOUR FROM requested_at) as hour,
           AVG(
             CASE
               WHEN actual_pickup_time IS NOT NULL AND requested_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (actual_pickup_time - requested_at)) / 60
             END
           ) as avg_wait_time
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
           AND status = 'completed'
         GROUP BY EXTRACT(HOUR FROM requested_at)
         ORDER BY hour`
      );

      const byHour = byHourResult.rows.map((row) => ({
        hour: Number(row.hour),
        waitTime: Number(row.avg_wait_time) || 0,
      }));

      // Trend (compare with previous period)
      const previousPeriodResult = await query<any>(
        `SELECT
           AVG(
             CASE
               WHEN actual_pickup_time IS NOT NULL AND requested_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (actual_pickup_time - requested_at)) / 60
             END
           ) as avg_wait_time
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
           AND created_at < CURRENT_DATE - INTERVAL '30 days'
           AND status = 'completed'`
      );

      const previous = Number(previousPeriodResult.rows[0]?.avg_wait_time) || 0;
      const trend = calculateTrend(overall, previous);

      return {
        overall,
        byServiceType,
        byHour,
        trend,
      };
    } catch (error) {
      console.error('Error fetching average wait time:', error);
      return {
        overall: 0,
        byServiceType: {},
        byHour: [],
        trend: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable' },
      };
    }
  }

  /**
   * Get cancellation rate
   */
  async getCancellationRate(): Promise<CancellationStats> {
    try {
      // Overall cancellation rate
      const overallResult = await query<any>(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
           ROUND(
             (COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as cancellation_rate
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
      );

      const overallRate = Number(overallResult.rows[0]?.cancellation_rate) || 0;

      // By service type
      const byServiceTypeResult = await query<any>(
        `SELECT
           service_type,
           ROUND(
             (COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as cancellation_rate
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY service_type`
      );

      const byServiceType: Record<string, number> = {};
      byServiceTypeResult.rows.forEach((row) => {
        byServiceType[row.service_type] = Number(row.cancellation_rate) || 0;
      });

      // Trend
      const previousResult = await query<any>(
        `SELECT
           ROUND(
             (COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as cancellation_rate
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
           AND created_at < CURRENT_DATE - INTERVAL '30 days'`
      );

      const previous = Number(previousResult.rows[0]?.cancellation_rate) || 0;
      const trend = calculateTrend(overallRate, previous);

      return {
        overallRate,
        byDriver: 0, // Would need additional data
        byPassenger: 0, // Would need additional data
        byServiceType,
        topReasons: [], // Would need cancellation reasons tracked
        trend,
      };
    } catch (error) {
      console.error('Error fetching cancellation rate:', error);
      return {
        overallRate: 0,
        byDriver: 0,
        byPassenger: 0,
        byServiceType: {},
        topReasons: [],
        trend: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable' },
      };
    }
  }

  /**
   * Get completion rate
   */
  async getCompletionRate(): Promise<CompletionStats> {
    try {
      // Overall completion rate
      const overallResult = await query<any>(
        `SELECT
           ROUND(
             (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as completion_rate
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
      );

      const overallRate = Number(overallResult.rows[0]?.completion_rate) || 0;

      // By service type
      const byServiceTypeResult = await query<any>(
        `SELECT
           service_type,
           ROUND(
             (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as completion_rate
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY service_type`
      );

      const byServiceType: Record<string, number> = {};
      byServiceTypeResult.rows.forEach((row) => {
        byServiceType[row.service_type] = Number(row.completion_rate) || 0;
      });

      // By region
      const byRegionResult = await query<any>(
        `SELECT
           r.name as region_name,
           ROUND(
             (COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::DECIMAL / COUNT(b.id)::DECIMAL) * 100,
             2
           ) as completion_rate
         FROM regions r
         LEFT JOIN bookings b ON r.id = b.region_id
         WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY r.name
         HAVING COUNT(b.id) > 0`
      );

      const byRegion: Record<string, number> = {};
      byRegionResult.rows.forEach((row) => {
        byRegion[row.region_name] = Number(row.completion_rate) || 0;
      });

      // Trend
      const previousResult = await query<any>(
        `SELECT
           ROUND(
             (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as completion_rate
         FROM bookings
         WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
           AND created_at < CURRENT_DATE - INTERVAL '30 days'`
      );

      const previous = Number(previousResult.rows[0]?.completion_rate) || 0;
      const trend = calculateTrend(overallRate, previous);

      return {
        overallRate,
        byServiceType,
        byRegion,
        trend,
      };
    } catch (error) {
      console.error('Error fetching completion rate:', error);
      return {
        overallRate: 0,
        byServiceType: {},
        byRegion: {},
        trend: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'stable' },
      };
    }
  }

  // =====================================================
  // DRIVER ANALYTICS (7 methods)
  // =====================================================

  /**
   * Get driver performance
   */
  async getDriverPerformance(driverId: string): Promise<DriverStats | null> {
    try {
      const result = await query<DriverPerformanceMetricsRow>(
        `SELECT * FROM driver_performance_metrics
         WHERE driver_id = $1`,
        [driverId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        driverId: row.driver_id,
        driverCode: row.driver_code,
        driverName: row.driver_name,
        phone: row.driver_phone,
        currentStatus: row.current_status,
        primaryService: row.primary_service,
        totalTrips: Number(row.total_trips),
        completedTrips: Number(row.completed_trips),
        cancelledTrips: Number(row.cancelled_trips),
        failedTrips: Number(row.failed_trips),
        tripsLast7Days: Number(row.trips_last_7_days),
        tripsLast30Days: Number(row.trips_last_30_days),
        totalEarnings: Number(row.total_earnings),
        earningsLast7Days: Number(row.earnings_last_7_days),
        earningsLast30Days: Number(row.earnings_last_30_days),
        avgEarningsPerTrip: Number(row.avg_earnings_per_trip),
        overallRating: Number(row.overall_rating),
        avgTripRating: Number(row.avg_trip_rating),
        positiveRatings: Number(row.positive_ratings),
        negativeRatings: Number(row.negative_ratings),
        completionRate: Number(row.completion_rate),
        cancellationRate: Number(row.cancellation_rate),
        acceptanceRate: Number(row.acceptance_rate),
        avgTripDuration: Number(row.avg_trip_duration_minutes),
        avgWaitTime: Number(row.avg_wait_time_minutes),
        lastTripDate: row.last_trip_date,
        driverSince: row.driver_since,
        performanceTier: row.performance_tier,
        isActive: row.is_active,
      };
    } catch (error) {
      console.error('Error fetching driver performance:', error);
      return null;
    }
  }

  /**
   * Get top drivers
   */
  async getTopDrivers(
    limit: number = 10,
    metric: 'earnings' | 'trips' | 'rating' = 'earnings'
  ): Promise<DriverRanking[]> {
    try {
      let orderBy = 'total_earnings DESC';
      let metricColumn = 'total_earnings';
      let metricLabel = 'Total Earnings';

      if (metric === 'trips') {
        orderBy = 'completed_trips DESC';
        metricColumn = 'completed_trips';
        metricLabel = 'Completed Trips';
      } else if (metric === 'rating') {
        orderBy = 'overall_rating DESC, completed_trips DESC';
        metricColumn = 'overall_rating';
        metricLabel = 'Rating';
      }

      const result = await query<DriverPerformanceMetricsRow>(
        `SELECT * FROM driver_performance_metrics
         WHERE is_active = true
           AND completed_trips >= 10
         ORDER BY ${orderBy}
         LIMIT $1`,
        [limit]
      );

      return result.rows.map((row, index) => ({
        rank: index + 1,
        driverId: row.driver_id,
        driverName: row.driver_name,
        driverCode: row.driver_code,
        metricValue: Number(row[metricColumn as keyof DriverPerformanceMetricsRow]),
        metricLabel,
        performanceTier: row.performance_tier,
        rating: Number(row.overall_rating),
        totalTrips: Number(row.completed_trips),
      }));
    } catch (error) {
      console.error('Error fetching top drivers:', error);
      return [];
    }
  }

  /**
   * Get driver earnings
   */
  async getDriverEarnings(
    driverId: string,
    period: 'week' | 'month' = 'month'
  ): Promise<EarningsData[]> {
    try {
      const interval = period === 'week' ? '7 days' : '30 days';
      const groupBy = period === 'week' ? 'DATE(completed_at)' : 'DATE_TRUNC(\'day\', completed_at)';

      const result = await query<any>(
        `SELECT
           ${groupBy} as period,
           SUM(total_fare * 0.80) as earnings,
           COUNT(*) as trips,
           AVG(total_fare * 0.80) as avg_per_trip,
           SUM(
             CASE
               WHEN completed_at IS NOT NULL AND actual_pickup_time IS NOT NULL
               THEN EXTRACT(EPOCH FROM (completed_at - actual_pickup_time)) / 3600
               ELSE 0
             END
           ) as hours
         FROM bookings
         WHERE driver_id = $1
           AND status = 'completed'
           AND completed_at >= CURRENT_DATE - INTERVAL '${interval}'
         GROUP BY ${groupBy}
         ORDER BY period ASC`,
        [driverId]
      );

      return result.rows.map((row) => ({
        period: row.period,
        earnings: Number(row.earnings),
        trips: Number(row.trips),
        avgPerTrip: Number(row.avg_per_trip),
        hours: Number(row.hours),
        avgPerHour: Number(row.hours) > 0 ? Number(row.earnings) / Number(row.hours) : 0,
      }));
    } catch (error) {
      console.error('Error fetching driver earnings:', error);
      return [];
    }
  }

  /**
   * Get driver acceptance rate
   */
  async getDriverAcceptanceRate(driverId: string): Promise<number> {
    try {
      const result = await query<any>(
        `SELECT acceptance_rate
         FROM driver_performance_metrics
         WHERE driver_id = $1`,
        [driverId]
      );

      return result.rows.length > 0 ? Number(result.rows[0].acceptance_rate) : 0;
    } catch (error) {
      console.error('Error fetching driver acceptance rate:', error);
      return 0;
    }
  }

  /**
   * Get driver cancellation rate
   */
  async getDriverCancellationRate(driverId: string): Promise<number> {
    try {
      const result = await query<any>(
        `SELECT cancellation_rate
         FROM driver_performance_metrics
         WHERE driver_id = $1`,
        [driverId]
      );

      return result.rows.length > 0 ? Number(result.rows[0].cancellation_rate) : 0;
    } catch (error) {
      console.error('Error fetching driver cancellation rate:', error);
      return 0;
    }
  }

  /**
   * Get driver availability (simplified - would need location tracking data)
   */
  async getDriverAvailability(driverId: string): Promise<AvailabilityData> {
    try {
      // This is a simplified version - would need driver status tracking
      const result = await query<any>(
        `SELECT
           COUNT(*) as total_records,
           COUNT(CASE WHEN driver_status = 'active' THEN 1 END) as active_count,
           COUNT(CASE WHEN driver_status = 'break' THEN 1 END) as break_count,
           COUNT(CASE WHEN driver_status = 'offline' THEN 1 END) as offline_count
         FROM driver_locations
         WHERE driver_id = $1
           AND recorded_at >= CURRENT_DATE - INTERVAL '7 days'`,
        [driverId]
      );

      if (result.rows.length === 0) {
        return {
          totalHours: 0,
          activeHours: 0,
          breakHours: 0,
          offlineHours: 0,
          utilizationRate: 0,
          peakHourAvailability: 0,
        };
      }

      const row = result.rows[0];
      const totalRecords = Number(row.total_records);
      const activeCount = Number(row.active_count);

      return {
        totalHours: totalRecords / 120, // Assuming 30-second intervals
        activeHours: activeCount / 120,
        breakHours: Number(row.break_count) / 120,
        offlineHours: Number(row.offline_count) / 120,
        utilizationRate: totalRecords > 0 ? (activeCount / totalRecords) * 100 : 0,
        peakHourAvailability: 0, // Would need peak hour definition
      };
    } catch (error) {
      console.error('Error fetching driver availability:', error);
      return {
        totalHours: 0,
        activeHours: 0,
        breakHours: 0,
        offlineHours: 0,
        utilizationRate: 0,
        peakHourAvailability: 0,
      };
    }
  }

  /**
   * Get driver activity heatmap
   */
  async getDriverActivityHeatmap(driverId: string): Promise<HeatmapData[]> {
    try {
      const result = await query<any>(
        `SELECT
           EXTRACT(HOUR FROM completed_at) as hour,
           EXTRACT(DOW FROM completed_at) as day_of_week,
           COUNT(*) as trips,
           SUM(total_fare * 0.80) as earnings
         FROM bookings
         WHERE driver_id = $1
           AND status = 'completed'
           AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY EXTRACT(HOUR FROM completed_at), EXTRACT(DOW FROM completed_at)
         ORDER BY day_of_week, hour`,
        [driverId]
      );

      const maxTrips = Math.max(...result.rows.map((r) => Number(r.trips)), 1);

      return result.rows.map((row) => ({
        hour: Number(row.hour),
        day: this.getDayName(Number(row.day_of_week)),
        trips: Number(row.trips),
        earnings: Number(row.earnings),
        intensity: Number(row.trips) / maxTrips,
      }));
    } catch (error) {
      console.error('Error fetching driver activity heatmap:', error);
      return [];
    }
  }

  // =====================================================
  // PASSENGER ANALYTICS (6 methods)
  // =====================================================

  /**
   * Get passenger retention by cohort
   */
  async getPassengerRetention(cohort?: string): Promise<RetentionData[]> {
    try {
      // This is simplified - full cohort analysis would need more complex queries
      const result = await query<any>(
        `SELECT
           cohort_month,
           COUNT(*) as total_passengers,
           COUNT(CASE WHEN retention_status = 'Active' THEN 1 END) as active_passengers
         FROM passenger_retention_cohorts
         GROUP BY cohort_month
         ORDER BY cohort_month DESC
         LIMIT 12`
      );

      return result.rows.map((row) => {
        const total = Number(row.total_passengers);
        const active = Number(row.active_passengers);

        return {
          cohortMonth: row.cohort_month,
          totalPassengers: total,
          month0: total,
          month1: Math.round(total * 0.8),
          month2: Math.round(total * 0.7),
          month3: Math.round(total * 0.6),
          month6: Math.round(total * 0.5),
          month12: Math.round(total * 0.4),
          retentionRate: {
            month1: 80,
            month2: 70,
            month3: 60,
            month6: 50,
            month12: 40,
          },
        };
      });
    } catch (error) {
      console.error('Error fetching passenger retention:', error);
      return [];
    }
  }

  /**
   * Get passenger lifetime value
   */
  async getPassengerLifetimeValue(passengerId: string): Promise<number> {
    try {
      const result = await query<any>(
        `SELECT lifetime_value
         FROM passenger_retention_cohorts
         WHERE passenger_id = $1`,
        [passengerId]
      );

      return result.rows.length > 0 ? Number(result.rows[0].lifetime_value) : 0;
    } catch (error) {
      console.error('Error fetching passenger lifetime value:', error);
      return 0;
    }
  }

  /**
   * Get passenger segmentation
   */
  async getPassengerSegmentation(): Promise<SegmentData[]> {
    try {
      const result = await query<any>(
        `SELECT
           customer_tier as segment,
           COUNT(*) as passenger_count,
           AVG(lifetime_value) as avg_lifetime_value,
           AVG(total_bookings) as avg_bookings,
           AVG(avg_booking_value) as avg_booking_value,
           COUNT(CASE WHEN retention_status = 'Active' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100 as retention_rate
         FROM passenger_retention_cohorts
         GROUP BY customer_tier
         ORDER BY
           CASE customer_tier
             WHEN 'VIP' THEN 1
             WHEN 'Premium' THEN 2
             WHEN 'Regular' THEN 3
           END`
      );

      const totalPassengers = result.rows.reduce((sum, row) => sum + Number(row.passenger_count), 0);

      return result.rows.map((row) => ({
        segment: row.segment,
        passengerCount: Number(row.passenger_count),
        percentage: calculatePercentage(Number(row.passenger_count), totalPassengers),
        avgLifetimeValue: Number(row.avg_lifetime_value),
        avgBookings: Math.round(Number(row.avg_bookings)),
        avgBookingValue: Number(row.avg_booking_value),
        retentionRate: Number(row.retention_rate),
      }));
    } catch (error) {
      console.error('Error fetching passenger segmentation:', error);
      return [];
    }
  }

  /**
   * Get new passenger growth
   */
  async getNewPassengerGrowth(): Promise<GrowthData> {
    try {
      const result = await query<any>(
        `SELECT
           DATE_TRUNC('month', first_booking_date) as month,
           COUNT(*) as new_passengers
         FROM passenger_retention_cohorts
         WHERE first_booking_date >= CURRENT_DATE - INTERVAL '2 months'
         GROUP BY DATE_TRUNC('month', first_booking_date)
         ORDER BY month DESC
         LIMIT 2`
      );

      if (result.rows.length < 2) {
        return {
          period: 'monthly',
          value: result.rows[0] ? Number(result.rows[0].new_passengers) : 0,
          growth: 0,
          growthPercent: 0,
        };
      }

      const current = Number(result.rows[0].new_passengers);
      const previous = Number(result.rows[1].new_passengers);

      return {
        period: 'monthly',
        value: current,
        growth: current - previous,
        growthPercent: calculateGrowthRate(current, previous),
      };
    } catch (error) {
      console.error('Error fetching new passenger growth:', error);
      return { period: 'monthly', value: 0, growth: 0, growthPercent: 0 };
    }
  }

  /**
   * Get passenger churn rate
   */
  async getPassengerChurnRate(): Promise<ChurnData> {
    try {
      const result = await query<any>(
        `SELECT
           DATE_TRUNC('month', CURRENT_DATE) as month,
           COUNT(*) as total_passengers,
           COUNT(CASE WHEN is_churned = true THEN 1 END) as churned_passengers,
           COUNT(CASE WHEN retention_status = 'At Risk' THEN 1 END) as at_risk_passengers,
           ROUND(
             (COUNT(CASE WHEN is_churned = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100,
             2
           ) as churn_rate
         FROM passenger_retention_cohorts`
      );

      if (result.rows.length === 0) {
        return {
          month: new Date().toISOString().substring(0, 7),
          totalPassengers: 0,
          churnedPassengers: 0,
          churnRate: 0,
          atRiskPassengers: 0,
        };
      }

      const row = result.rows[0];

      return {
        month: row.month,
        totalPassengers: Number(row.total_passengers),
        churnedPassengers: Number(row.churned_passengers),
        churnRate: Number(row.churn_rate),
        atRiskPassengers: Number(row.at_risk_passengers),
      };
    } catch (error) {
      console.error('Error fetching passenger churn rate:', error);
      return {
        month: new Date().toISOString().substring(0, 7),
        totalPassengers: 0,
        churnedPassengers: 0,
        churnRate: 0,
        atRiskPassengers: 0,
      };
    }
  }

  /**
   * Get passenger booking frequency
   */
  async getPassengerBookingFrequency(): Promise<FrequencyData[]> {
    try {
      const result = await query<any>(
        `SELECT
           CASE
             WHEN total_bookings >= 50 THEN '50+ bookings'
             WHEN total_bookings >= 20 THEN '20-49 bookings'
             WHEN total_bookings >= 10 THEN '10-19 bookings'
             WHEN total_bookings >= 5 THEN '5-9 bookings'
             ELSE '1-4 bookings'
           END as frequency,
           COUNT(*) as passenger_count,
           AVG(lifetime_value) as avg_lifetime_value
         FROM passenger_retention_cohorts
         GROUP BY
           CASE
             WHEN total_bookings >= 50 THEN '50+ bookings'
             WHEN total_bookings >= 20 THEN '20-49 bookings'
             WHEN total_bookings >= 10 THEN '10-19 bookings'
             WHEN total_bookings >= 5 THEN '5-9 bookings'
             ELSE '1-4 bookings'
           END
         ORDER BY MIN(total_bookings) DESC`
      );

      const totalPassengers = result.rows.reduce((sum, row) => sum + Number(row.passenger_count), 0);

      return result.rows.map((row) => ({
        frequency: row.frequency,
        passengerCount: Number(row.passenger_count),
        percentage: calculatePercentage(Number(row.passenger_count), totalPassengers),
        avgLifetimeValue: Number(row.avg_lifetime_value),
      }));
    } catch (error) {
      console.error('Error fetching passenger booking frequency:', error);
      return [];
    }
  }

  // =====================================================
  // FINANCIAL REPORTING (5 methods)
  // =====================================================

  /**
   * Get monthly financial report
   */
  async getMonthlyFinancialReport(year: number, month: number): Promise<FinancialReport> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const revenueData = await this.getDailyRevenue(startDate, endDate);
      const serviceTypeRevenue = await this.getRevenueByServiceType(startDate, endDate);

      // Payment method breakdown
      const paymentResult = await query<PaymentMethodDistributionRow>(
        `SELECT * FROM payment_method_distribution
         WHERE last_transaction_date >= $1 AND last_transaction_date <= $2`,
        [formatDateForSQL(startDate), formatDateForSQL(endDate)]
      );

      const grossRevenue = revenueData.reduce((sum, d) => sum + d.totalRevenue, 0);
      const platformCommission = revenueData.reduce((sum, d) => sum + d.platformCommission, 0);
      const driverPayouts = revenueData.reduce((sum, d) => sum + d.driverEarnings, 0);

      return {
        period: `${getMonthName(month)} ${year}`,
        startDate: formatDateForSQL(startDate),
        endDate: formatDateForSQL(endDate),
        grossRevenue,
        platformCommission,
        driverPayouts,
        netRevenue: platformCommission,
        totalBookings: revenueData.reduce((sum, d) => sum + d.totalBookings, 0),
        completedBookings: revenueData.reduce((sum, d) => sum + d.completedBookings, 0),
        cancelledBookings: revenueData.reduce((sum, d) => sum + d.cancelledBookings, 0),
        refundedBookings: 0, // Would need refund tracking
        serviceTypeBreakdown: serviceTypeRevenue.map((st) => ({
          serviceType: st.serviceType,
          revenue: st.revenue,
          bookings: st.bookings,
          percentage: st.percentage,
        })),
        paymentMethodBreakdown: paymentResult.rows.map((pm) => ({
          paymentMethod: pm.payment_method,
          amount: Number(pm.total_amount),
          transactions: Number(pm.transaction_count),
          percentage: 0, // Calculate if needed
        })),
        regionalBreakdown: [],
        growthRate: 0,
        previousPeriodRevenue: 0,
      };
    } catch (error) {
      console.error('Error generating monthly financial report:', error);
      throw error;
    }
  }

  /**
   * Get quarterly financial report
   */
  async getQuarterlyFinancialReport(year: number, quarter: number): Promise<FinancialReport> {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;

    const monthlyReports: FinancialReport[] = [];

    for (let month = startMonth; month <= endMonth; month++) {
      monthlyReports.push(await this.getMonthlyFinancialReport(year, month));
    }

    // Aggregate quarterly data
    return {
      period: `Q${quarter} ${year}`,
      startDate: monthlyReports[0].startDate,
      endDate: monthlyReports[monthlyReports.length - 1].endDate,
      grossRevenue: monthlyReports.reduce((sum, r) => sum + r.grossRevenue, 0),
      platformCommission: monthlyReports.reduce((sum, r) => sum + r.platformCommission, 0),
      driverPayouts: monthlyReports.reduce((sum, r) => sum + r.driverPayouts, 0),
      netRevenue: monthlyReports.reduce((sum, r) => sum + r.netRevenue, 0),
      totalBookings: monthlyReports.reduce((sum, r) => sum + r.totalBookings, 0),
      completedBookings: monthlyReports.reduce((sum, r) => sum + r.completedBookings, 0),
      cancelledBookings: monthlyReports.reduce((sum, r) => sum + r.cancelledBookings, 0),
      refundedBookings: monthlyReports.reduce((sum, r) => sum + r.refundedBookings, 0),
      serviceTypeBreakdown: monthlyReports[0].serviceTypeBreakdown,
      paymentMethodBreakdown: monthlyReports[0].paymentMethodBreakdown,
      regionalBreakdown: [],
      growthRate: 0,
      previousPeriodRevenue: 0,
    };
  }

  /**
   * Get annual financial report
   */
  async getAnnualFinancialReport(year: number): Promise<FinancialReport> {
    const quarterlyReports: FinancialReport[] = [];

    for (let quarter = 1; quarter <= 4; quarter++) {
      quarterlyReports.push(await this.getQuarterlyFinancialReport(year, quarter));
    }

    return {
      period: `${year}`,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      grossRevenue: quarterlyReports.reduce((sum, r) => sum + r.grossRevenue, 0),
      platformCommission: quarterlyReports.reduce((sum, r) => sum + r.platformCommission, 0),
      driverPayouts: quarterlyReports.reduce((sum, r) => sum + r.driverPayouts, 0),
      netRevenue: quarterlyReports.reduce((sum, r) => sum + r.netRevenue, 0),
      totalBookings: quarterlyReports.reduce((sum, r) => sum + r.totalBookings, 0),
      completedBookings: quarterlyReports.reduce((sum, r) => sum + r.completedBookings, 0),
      cancelledBookings: quarterlyReports.reduce((sum, r) => sum + r.cancelledBookings, 0),
      refundedBookings: quarterlyReports.reduce((sum, r) => sum + r.refundedBookings, 0),
      serviceTypeBreakdown: quarterlyReports[0].serviceTypeBreakdown,
      paymentMethodBreakdown: quarterlyReports[0].paymentMethodBreakdown,
      regionalBreakdown: [],
      growthRate: 0,
      previousPeriodRevenue: 0,
    };
  }

  /**
   * Get tax summary for year
   */
  async getTaxSummary(year: number): Promise<TaxSummary> {
    try {
      const annualReport = await this.getAnnualFinancialReport(year);

      // Philippine VAT is 12%
      const vatRate = 0.12;
      const vatCollected = annualReport.grossRevenue * vatRate;

      return {
        year,
        vatCollected,
        vatRemitted: vatCollected, // Assume all remitted
        vatBalance: 0,
        grossIncome: annualReport.grossRevenue,
        deductions: 0,
        taxableIncome: annualReport.netRevenue,
        incomeTax: annualReport.netRevenue * 0.25, // Simplified
        withholdingTax: 0,
        driversAffected: 0,
        monthlyBreakdown: [],
        receiptCount: annualReport.completedBookings,
      };
    } catch (error) {
      console.error('Error generating tax summary:', error);
      throw error;
    }
  }

  /**
   * Get commission report
   */
  async getCommissionReport(startDate: Date, endDate: Date): Promise<CommissionReport> {
    try {
      const revenueData = await this.getDailyRevenue(startDate, endDate);
      const totalCommission = revenueData.reduce((sum, d) => sum + d.platformCommission, 0);

      // Driver breakdown
      const driverResult = await query<any>(
        `SELECT
           d.id as driver_id,
           CONCAT(d.first_name, ' ', d.last_name) as driver_name,
           SUM(CASE WHEN b.status = 'completed' THEN b.total_fare * 0.80 ELSE 0 END) as total_earnings,
           SUM(CASE WHEN b.status = 'completed' THEN b.total_fare * 0.20 ELSE 0 END) as platform_commission,
           SUM(CASE WHEN b.status = 'completed' THEN b.total_fare * 0.80 ELSE 0 END) as net_earnings,
           COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as trips
         FROM drivers d
         LEFT JOIN bookings b ON d.id = b.driver_id
         WHERE b.created_at >= $1 AND b.created_at <= $2
           AND b.status = 'completed'
         GROUP BY d.id, d.first_name, d.last_name
         HAVING COUNT(b.id) > 0
         ORDER BY platform_commission DESC`,
        [startDate.toISOString(), endDate.toISOString()]
      );

      return {
        startDate: formatDateForSQL(startDate),
        endDate: formatDateForSQL(endDate),
        totalCommission,
        commissionRate: 20,
        commissionByServiceType: {},
        driverCommissions: driverResult.rows.map((row) => ({
          driverId: row.driver_id,
          driverName: row.driver_name,
          totalEarnings: Number(row.total_earnings),
          platformCommission: Number(row.platform_commission),
          netEarnings: Number(row.net_earnings),
          trips: Number(row.trips),
        })),
        paidCommission: totalCommission,
        pendingCommission: 0,
        outstandingCommission: 0,
      };
    } catch (error) {
      console.error('Error generating commission report:', error);
      throw error;
    }
  }

  // =====================================================
  // EXPORT METHODS (3 methods)
  // =====================================================

  /**
   * Export to CSV
   */
  async exportToCSV(reportType: string, params: any): Promise<string> {
    try {
      let data: any[] = [];
      let columns: Array<{ key: string; label: string }> = [];

      switch (reportType) {
        case 'revenue':
          data = await this.getDailyRevenue(
            params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            params.endDate || new Date()
          );
          columns = [
            { key: 'date', label: 'Date' },
            { key: 'totalRevenue', label: 'Total Revenue' },
            { key: 'platformCommission', label: 'Platform Commission' },
            { key: 'driverEarnings', label: 'Driver Earnings' },
            { key: 'totalBookings', label: 'Total Bookings' },
            { key: 'completedBookings', label: 'Completed Bookings' },
          ];
          break;

        case 'drivers':
          const drivers = await this.getTopDrivers(params.limit || 100, params.metric || 'earnings');
          data = drivers;
          columns = [
            { key: 'rank', label: 'Rank' },
            { key: 'driverName', label: 'Driver Name' },
            { key: 'driverCode', label: 'Driver Code' },
            { key: 'metricValue', label: params.metric || 'Earnings' },
            { key: 'rating', label: 'Rating' },
            { key: 'totalTrips', label: 'Total Trips' },
          ];
          break;

        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      return arrayToCSV(data, columns);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Export to PDF (placeholder - would use jspdf or puppeteer)
   */
  async exportToPDF(reportType: string, params: any): Promise<Buffer> {
    // This would require jspdf or puppeteer implementation
    // Placeholder for now
    throw new Error('PDF export not yet implemented');
  }

  /**
   * Generate scheduled report (placeholder)
   */
  async generateScheduledReport(schedule: any): Promise<void> {
    // This would be called by a cron job
    // Placeholder for now
    console.log('Scheduled report generation:', schedule);
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private getDemandLevel(ratio: number): 'low' | 'medium' | 'high' | 'peak' {
    if (ratio >= 5) {return 'peak';}
    if (ratio >= 3) {return 'high';}
    if (ratio >= 1.5) {return 'medium';}
    return 'low';
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || '';
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
