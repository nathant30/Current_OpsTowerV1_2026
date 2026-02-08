/**
 * LTFRB Daily Report Generation
 *
 * Automated job that generates daily LTFRB trip reports
 * Runs once per day to compile and submit trip data to LTFRB
 */

import { getLTFRBComplianceService } from '@/lib/compliance/ltfrb/ltfrb-service';
import { logger } from '@/lib/security/productionLogger';

/**
 * Generate daily LTFRB report for yesterday's trips
 */
export async function generateDailyLTFRBReport() {
  const startTime = Date.now();

  try {
    logger.info('Starting daily LTFRB report generation');

    const ltfrbService = getLTFRBComplianceService();

    // Generate report for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const report = await ltfrbService.generateDailyReport(yesterday);

    if (report.success && report.report) {
      const duration = Date.now() - startTime;

      logger.info('Daily LTFRB report generated successfully', {
        reportDate: yesterday.toISOString().split('T')[0],
        reportId: report.reportId,
        totalTrips: report.report.totalTrips,
        completedTrips: report.report.completedTrips,
        cancelledTrips: report.report.cancelledTrips,
        uniqueDrivers: report.report.uniqueDrivers,
        uniqueVehicles: report.report.uniqueVehicles,
        totalDistanceKm: report.report.totalDistanceKm,
        totalFareAmount: report.report.totalFareAmount,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        report: report.report,
        reportId: report.reportId,
        duration,
      };
    } else {
      throw new Error(report.error || 'Failed to generate report');
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to generate daily LTFRB report', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    throw error;
  }
}

/**
 * Generate monthly LTFRB report
 * Can be called manually or scheduled for month-end
 */
export async function generateMonthlyLTFRBReport(year?: number, month?: number) {
  const startTime = Date.now();

  try {
    // Default to last month if not specified
    const now = new Date();
    const reportYear = year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    const reportMonth = month || (now.getMonth() === 0 ? 12 : now.getMonth());

    logger.info('Starting monthly LTFRB report generation', {
      year: reportYear,
      month: reportMonth,
    });

    const ltfrbService = getLTFRBComplianceService();
    const report = await ltfrbService.generateMonthlyReport(reportYear, reportMonth);

    if (report.success && report.report) {
      const duration = Date.now() - startTime;

      logger.info('Monthly LTFRB report generated successfully', {
        year: reportYear,
        month: reportMonth,
        reportId: report.reportId,
        totalTrips: report.report.totalTrips,
        completedTrips: report.report.completedTrips,
        cancelledTrips: report.report.cancelledTrips,
        uniqueDrivers: report.report.uniqueDrivers,
        uniqueVehicles: report.report.uniqueVehicles,
        totalDistanceKm: report.report.totalDistanceKm,
        totalFareAmount: report.report.totalFareAmount,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        report: report.report,
        reportId: report.reportId,
        duration,
      };
    } else {
      throw new Error(report.error || 'Failed to generate monthly report');
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to generate monthly LTFRB report', {
      year,
      month,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    throw error;
  }
}
