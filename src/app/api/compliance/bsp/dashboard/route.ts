/**
 * BSP Compliance Dashboard API
 *
 * GET /api/compliance/bsp/dashboard - Get dashboard metrics
 *
 * @module api/compliance/bsp/dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAMLMonitoringService } from '@/lib/compliance/bsp/aml-monitoring';
import { query } from '@/lib/db';

/**
 * GET /api/compliance/bsp/dashboard
 *
 * Get BSP compliance dashboard metrics
 *
 * Query params:
 * - startDate: Start date for metrics (default: today)
 * - endDate: End date for metrics (default: today)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date();
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Set start date to beginning of day
    startDate.setHours(0, 0, 0, 0);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    const amlService = getAMLMonitoringService();

    // Get AML statistics
    const amlStats = await amlService.getStatistics(startDate, endDate);

    // Get active alerts count
    const alertsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM bsp_compliance_alerts WHERE status = 'active'`
    );
    const activeAlerts = parseInt(alertsResult.rows[0]?.count || '0');

    // Get pending reviews count
    const reviewsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM bsp_aml_monitoring WHERE flagged_for_review = true AND reviewed = false`
    );
    const pendingReviews = parseInt(reviewsResult.rows[0]?.count || '0');

    // Get unresolved suspicious activities count
    const suspiciousResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM bsp_suspicious_activity WHERE status IN ('detected', 'under_review')`
    );
    const unresolvedSuspicious = parseInt(suspiciousResult.rows[0]?.count || '0');

    // Get last report submitted
    const lastReportResult = await query<{ submitted_at: string }>(
      `SELECT submitted_at FROM bsp_report_submissions WHERE status = 'submitted' ORDER BY submitted_at DESC LIMIT 1`
    );
    const lastReportSubmitted = lastReportResult.rows[0]?.submitted_at
      ? new Date(lastReportResult.rows[0].submitted_at)
      : null;

    // Calculate compliance score (0-100)
    // Based on: reviewed transactions, resolved alerts, submitted reports
    const reviewRate = amlStats.reviewed_count / Math.max(amlStats.flagged_count, 1);
    const complianceScore = Math.round(
      (reviewRate * 40 + // 40% weight on review completion
        (activeAlerts === 0 ? 30 : Math.max(0, 30 - activeAlerts * 5)) + // 30% weight on alert resolution
        (lastReportSubmitted ? 30 : 0)) // 30% weight on report submission
    );

    // Get today's daily summary
    const todaySummaryResult = await query<any>(
      `SELECT * FROM bsp_daily_summary WHERE summary_date = $1`,
      [new Date().toISOString().split('T')[0]]
    );

    const todaySummary = todaySummaryResult.rows[0] || {
      summary_date: new Date(),
      total_transactions: 0,
      completed_transactions: 0,
      total_amount: 0,
      high_value_count: 0,
      flagged_count: 0,
      suspicious_count: 0,
    };

    return NextResponse.json({
      success: true,
      dashboard: {
        today: {
          summaryDate: todaySummary.summary_date,
          totalTransactions: todaySummary.total_transactions,
          completedTransactions: todaySummary.completed_transactions,
          totalAmount: parseFloat(todaySummary.total_amount || '0'),
          highValueCount: todaySummary.high_value_count,
          flaggedCount: todaySummary.flagged_count,
          suspiciousCount: todaySummary.suspicious_count,
        },
        amlStatistics: {
          totalMonitored: parseInt(amlStats.total_monitored),
          singleThresholdBreaches: parseInt(amlStats.single_threshold_breaches),
          dailyThresholdBreaches: parseInt(amlStats.daily_threshold_breaches),
          monthlyThresholdBreaches: parseInt(amlStats.monthly_threshold_breaches),
          flaggedCount: parseInt(amlStats.flagged_count),
          reviewedCount: parseInt(amlStats.reviewed_count),
          totalAmount: parseFloat(amlStats.total_amount),
          averageAmount: parseFloat(amlStats.average_amount),
          maxAmount: parseFloat(amlStats.max_amount),
          uniqueUsers: parseInt(amlStats.unique_users),
        },
        complianceOverview: {
          activeAlerts,
          pendingReviews,
          unresolvedSuspicious,
          lastReportSubmitted,
          complianceScore,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve dashboard metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
