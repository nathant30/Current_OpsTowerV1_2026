/**
 * BSP Daily Report Cron Job
 *
 * Generates daily BSP compliance reports for previous day's transactions.
 * Should run at 1 AM daily.
 *
 * @module lib/cron/bsp-daily-report
 */

import { getBSPReportService } from '@/lib/compliance/bsp/report-generation';
import { logger } from '@/lib/security/productionLogger';
import { ReportGenerationResult } from '@/lib/compliance/bsp/types';

/**
 * Generate daily BSP compliance report
 * Should run at 1 AM daily to generate previous day's report
 *
 * @returns Report generation result
 */
export async function generateDailyBSPReport(): Promise<ReportGenerationResult> {
  const startTime = Date.now();

  try {
    // Calculate yesterday's date
    const yesterday = new Date(Date.now() - 86400000);
    yesterday.setHours(0, 0, 0, 0);

    logger.info('Starting daily BSP report generation', {
      reportDate: yesterday.toISOString(),
      scheduledTime: new Date().toISOString(),
    });

    // Get report service
    const reportService = getBSPReportService();

    // Generate report
    const report = await reportService.generateDailyReport({
      reportDate: yesterday,
    });

    const duration = Date.now() - startTime;

    logger.info('Daily BSP report generated successfully', {
      reportId: report.reportId,
      reportDate: yesterday.toISOString().split('T')[0],
      recordCount: report.recordCount,
      fileSize: report.fileSize,
      filePath: report.filePath,
      duration: `${duration}ms`,
    });

    // Log metric for monitoring
    logger.metric('bsp_daily_report_generated', 1, {
      status: 'success',
      record_count: report.recordCount.toString(),
    });

    return report;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to generate daily BSP report', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    // Log metric for monitoring
    logger.metric('bsp_daily_report_generated', 1, {
      status: 'failure',
    });

    throw error;
  }
}

/**
 * Generate report for specific date (manual execution)
 *
 * @param reportDate - Date to generate report for
 * @returns Report generation result
 */
export async function generateBSPReportForDate(
  reportDate: Date
): Promise<ReportGenerationResult> {
  try {
    logger.info('Generating BSP report for specific date', {
      reportDate: reportDate.toISOString(),
      triggeredBy: 'manual',
    });

    const reportService = getBSPReportService();
    const report = await reportService.generateDailyReport({
      reportDate,
    });

    logger.info('Manual BSP report generated successfully', {
      reportId: report.reportId,
      reportDate: reportDate.toISOString().split('T')[0],
      recordCount: report.recordCount,
    });

    return report;
  } catch (error) {
    logger.error('Failed to generate manual BSP report', {
      reportDate: reportDate.toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
