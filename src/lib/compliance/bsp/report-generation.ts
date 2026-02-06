/**
 * BSP Report Generation Service
 *
 * Generates BSP compliance reports:
 * - Daily transaction reports
 * - Monthly reconciliation reports
 * - Suspicious activity reports
 * - AML threshold breach reports
 *
 * @module lib/compliance/bsp/report-generation
 */

import { query } from '../../db';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  BSPReportSubmission,
  DailyReportRequest,
  MonthlyReportRequest,
  ReportGenerationResult,
  BSPReportType,
  ReportGenerationError,
  DailySummary,
} from './types';

/**
 * Report Generation Service
 *
 * Generates various BSP compliance reports
 */
export class BSPReportGenerationService {
  private reportsDirectory: string;

  constructor(reportsDirectory = '/var/opstower/reports/bsp') {
    this.reportsDirectory = reportsDirectory;
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDirectory)) {
      fs.mkdirSync(this.reportsDirectory, { recursive: true });
    }
  }

  /**
   * Generate daily transaction report
   *
   * @param request - Daily report request
   * @returns Report generation result
   */
  async generateDailyReport(request: DailyReportRequest): Promise<ReportGenerationResult> {
    try {
      const reportDate = request.reportDate;
      const reportId = `DAILY-${reportDate.toISOString().split('T')[0]}-${Date.now()}`;

      // Get daily transactions
      const transactions = await this.getDailyTransactions(reportDate);

      // Get daily summary
      const summary = await this.getDailySummary(reportDate);

      // Generate CSV content
      const csvContent = this.generateDailyCSV(transactions, summary);

      // Save to file
      const fileName = `bsp_daily_report_${reportDate.toISOString().split('T')[0]}.csv`;
      const filePath = path.join(this.reportsDirectory, fileName);
      fs.writeFileSync(filePath, csvContent, 'utf8');

      // Calculate file hash
      const fileHash = this.calculateFileHash(filePath);
      const fileSize = fs.statSync(filePath).size;

      // Store report submission in database
      const submission: BSPReportSubmission = {
        reportId,
        reportType: 'daily_transactions',
        periodStart: reportDate,
        periodEnd: reportDate,
        reportingYear: reportDate.getFullYear(),
        reportingMonth: reportDate.getMonth() + 1,
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
        flaggedTransactions: transactions.filter((t) => t.flagged).length,
        suspiciousActivities: summary.suspiciousCount || 0,
        filePath,
        fileFormat: 'csv',
        fileSizeBytes: fileSize,
        fileHash,
        status: 'generated',
        generatedBy: 'system',
        generatedAt: new Date(),
      };

      await this.storeReportSubmission(submission);

      // Update daily summary to mark report generated
      await this.markDailySummaryReportGenerated(reportDate, reportId);

      return {
        success: true,
        reportId,
        filePath,
        fileSize,
        recordCount: transactions.length,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Daily report generation failed:', error);
      throw new ReportGenerationError('Failed to generate daily report', {
        reportDate: request.reportDate,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate monthly reconciliation report
   *
   * @param request - Monthly report request
   * @returns Report generation result
   */
  async generateMonthlyReport(request: MonthlyReportRequest): Promise<ReportGenerationResult> {
    try {
      const { year, month } = request;
      const reportId = `MONTHLY-${year}-${String(month).padStart(2, '0')}-${Date.now()}`;

      // Get monthly data
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      const monthlyData = await this.getMonthlyData(periodStart, periodEnd);

      // Generate CSV content
      const csvContent = this.generateMonthlyCSV(monthlyData, year, month);

      // Save to file
      const fileName = `bsp_monthly_report_${year}_${String(month).padStart(2, '0')}.csv`;
      const filePath = path.join(this.reportsDirectory, fileName);
      fs.writeFileSync(filePath, csvContent, 'utf8');

      // Calculate file hash
      const fileHash = this.calculateFileHash(filePath);
      const fileSize = fs.statSync(filePath).size;

      // Store report submission
      const submission: BSPReportSubmission = {
        reportId,
        reportType: 'monthly_reconciliation',
        periodStart,
        periodEnd,
        reportingYear: year,
        reportingMonth: month,
        totalTransactions: monthlyData.totalTransactions,
        totalAmount: monthlyData.totalAmount,
        flaggedTransactions: monthlyData.flaggedCount,
        suspiciousActivities: monthlyData.suspiciousCount,
        filePath,
        fileFormat: 'csv',
        fileSizeBytes: fileSize,
        fileHash,
        status: 'generated',
        generatedBy: 'system',
        generatedAt: new Date(),
      };

      await this.storeReportSubmission(submission);

      return {
        success: true,
        reportId,
        filePath,
        fileSize,
        recordCount: monthlyData.totalTransactions,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Monthly report generation failed:', error);
      throw new ReportGenerationError('Failed to generate monthly report', {
        year: request.year,
        month: request.month,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate suspicious activity report
   *
   * @param startDate - Report start date
   * @param endDate - Report end date
   * @returns Report generation result
   */
  async generateSuspiciousActivityReport(
    startDate: Date,
    endDate: Date
  ): Promise<ReportGenerationResult> {
    try {
      const reportId = `SAR-${startDate.toISOString().split('T')[0]}-${Date.now()}`;

      // Get suspicious activities
      const activities = await this.getSuspiciousActivities(startDate, endDate);

      // Generate CSV content
      const csvContent = this.generateSuspiciousActivityCSV(activities);

      // Save to file
      const fileName = `bsp_suspicious_activity_report_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`;
      const filePath = path.join(this.reportsDirectory, fileName);
      fs.writeFileSync(filePath, csvContent, 'utf8');

      // Calculate file hash
      const fileHash = this.calculateFileHash(filePath);
      const fileSize = fs.statSync(filePath).size;

      // Store report submission
      const submission: BSPReportSubmission = {
        reportId,
        reportType: 'suspicious_activity',
        periodStart: startDate,
        periodEnd: endDate,
        reportingYear: startDate.getFullYear(),
        reportingMonth: startDate.getMonth() + 1,
        totalTransactions: 0,
        totalAmount: 0,
        flaggedTransactions: 0,
        suspiciousActivities: activities.length,
        filePath,
        fileFormat: 'csv',
        fileSizeBytes: fileSize,
        fileHash,
        status: 'generated',
        generatedBy: 'system',
        generatedAt: new Date(),
      };

      await this.storeReportSubmission(submission);

      return {
        success: true,
        reportId,
        filePath,
        fileSize,
        recordCount: activities.length,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Suspicious activity report generation failed:', error);
      throw new ReportGenerationError('Failed to generate suspicious activity report', {
        startDate,
        endDate,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get daily transactions
   */
  private async getDailyTransactions(reportDate: Date): Promise<any[]> {
    const result = await query<any>(
      `SELECT
        p.transaction_id,
        p.created_at as transaction_time,
        p.user_id,
        p.amount,
        p.payment_method,
        p.status,
        COALESCE(aml.flagged_for_review, false) as flagged,
        aml.risk_level,
        aml.exceeds_single_threshold
       FROM payments p
       LEFT JOIN bsp_aml_monitoring aml ON p.transaction_id = aml.transaction_id
       WHERE DATE(p.created_at) = $1
       ORDER BY p.created_at`,
      [reportDate]
    );

    return result.rows;
  }

  /**
   * Get daily summary
   */
  private async getDailySummary(reportDate: Date): Promise<any> {
    const result = await query<any>(
      `SELECT * FROM bsp_daily_summary
       WHERE summary_date = $1`,
      [reportDate]
    );

    if (result.rows.length === 0) {
      // Generate summary if not exists
      return await this.generateDailySummary(reportDate);
    }

    return result.rows[0];
  }

  /**
   * Generate daily summary (if not exists)
   */
  private async generateDailySummary(reportDate: Date): Promise<any> {
    const result = await query<any>(
      `INSERT INTO bsp_daily_summary (
        summary_date,
        total_transactions,
        completed_transactions,
        failed_transactions,
        refunded_transactions,
        total_amount,
        total_completed,
        total_refunded,
        average_transaction,
        gcash_count,
        gcash_amount,
        maya_count,
        maya_amount,
        cash_count,
        cash_amount,
        high_value_count,
        high_value_amount,
        flagged_count,
        suspicious_count
      )
      SELECT
        $1 as summary_date,
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_transactions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_completed,
        COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) as total_refunded,
        COALESCE(AVG(amount), 0) as average_transaction,
        COUNT(*) FILTER (WHERE payment_method = 'gcash') as gcash_count,
        COALESCE(SUM(amount) FILTER (WHERE payment_method = 'gcash'), 0) as gcash_amount,
        COUNT(*) FILTER (WHERE payment_method = 'paymaya') as maya_count,
        COALESCE(SUM(amount) FILTER (WHERE payment_method = 'paymaya'), 0) as maya_amount,
        COUNT(*) FILTER (WHERE payment_method = 'cash') as cash_count,
        COALESCE(SUM(amount) FILTER (WHERE payment_method = 'cash'), 0) as cash_amount,
        COUNT(*) FILTER (WHERE amount >= 50000) as high_value_count,
        COALESCE(SUM(amount) FILTER (WHERE amount >= 50000), 0) as high_value_amount,
        (SELECT COUNT(*) FROM bsp_aml_monitoring WHERE DATE(transaction_date) = $1 AND flagged_for_review = true) as flagged_count,
        (SELECT COUNT(*) FROM bsp_suspicious_activity WHERE DATE(detected_at) = $1) as suspicious_count
      FROM payments
      WHERE DATE(created_at) = $1
      RETURNING *`,
      [reportDate]
    );

    return result.rows[0];
  }

  /**
   * Get monthly data
   */
  private async getMonthlyData(periodStart: Date, periodEnd: Date): Promise<any> {
    const result = await query<any>(
      `SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE exceeds_single_threshold) as high_value_count,
        COALESCE(SUM(amount) FILTER (WHERE exceeds_single_threshold), 0) as high_value_amount,
        COUNT(*) FILTER (WHERE flagged_for_review) as flagged_count,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(amount) as average_transaction,
        (SELECT COUNT(*) FROM bsp_suspicious_activity
         WHERE detected_at BETWEEN $1 AND $2) as suspicious_count
       FROM bsp_aml_monitoring
       WHERE transaction_date BETWEEN $1 AND $2`,
      [periodStart, periodEnd]
    );

    return result.rows[0];
  }

  /**
   * Get suspicious activities
   */
  private async getSuspiciousActivities(startDate: Date, endDate: Date): Promise<any[]> {
    const result = await query<any>(
      `SELECT * FROM bsp_suspicious_activity
       WHERE detected_at BETWEEN $1 AND $2
       ORDER BY severity DESC, detected_at DESC`,
      [startDate, endDate]
    );

    return result.rows;
  }

  /**
   * Generate daily CSV content
   */
  private generateDailyCSV(transactions: any[], summary: any): string {
    let csv = 'Transaction ID,Transaction Time,User ID,Amount,Payment Method,Status,Flagged,Risk Level,Exceeds Threshold\n';

    for (const t of transactions) {
      csv += `${t.transaction_id},${t.transaction_time},${t.user_id},${t.amount},${t.payment_method},${t.status},${t.flagged},${t.risk_level || 'N/A'},${t.exceeds_single_threshold || false}\n`;
    }

    // Add summary section
    csv += '\n\nSUMMARY\n';
    csv += `Total Transactions,${summary.total_transactions || 0}\n`;
    csv += `Completed Transactions,${summary.completed_transactions || 0}\n`;
    csv += `Total Amount,${summary.total_amount || 0}\n`;
    csv += `High Value Count,${summary.high_value_count || 0}\n`;
    csv += `Flagged Count,${summary.flagged_count || 0}\n`;
    csv += `Suspicious Activities,${summary.suspicious_count || 0}\n`;

    return csv;
  }

  /**
   * Generate monthly CSV content
   */
  private generateMonthlyCSV(data: any, year: number, month: number): string {
    let csv = `BSP Monthly Reconciliation Report\n`;
    csv += `Period: ${year}-${String(month).padStart(2, '0')}\n\n`;

    csv += `Metric,Value\n`;
    csv += `Total Transactions,${data.total_transactions || 0}\n`;
    csv += `Total Amount,${data.total_amount || 0}\n`;
    csv += `High Value Count,${data.high_value_count || 0}\n`;
    csv += `High Value Amount,${data.high_value_amount || 0}\n`;
    csv += `Flagged Count,${data.flagged_count || 0}\n`;
    csv += `Suspicious Count,${data.suspicious_count || 0}\n`;
    csv += `Unique Users,${data.unique_users || 0}\n`;
    csv += `Average Transaction,${data.average_transaction || 0}\n`;

    return csv;
  }

  /**
   * Generate suspicious activity CSV content
   */
  private generateSuspiciousActivityCSV(activities: any[]): string {
    let csv = 'ID,Activity Type,User ID,Severity,Status,Pattern Description,Detection Method,Detected At,Related Transactions\n';

    for (const a of activities) {
      const relatedTxns = JSON.parse(a.related_transactions || '[]')
        .map((t: any) => t.transactionId)
        .join(';');
      csv += `${a.id},${a.activity_type},${a.user_id},${a.severity},${a.status},"${a.pattern_description}",${a.detection_method},${a.detected_at},${relatedTxns}\n`;
    }

    return csv;
  }

  /**
   * Calculate file hash (SHA-256)
   */
  private calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Store report submission in database
   */
  private async storeReportSubmission(submission: BSPReportSubmission): Promise<void> {
    await query(
      `INSERT INTO bsp_report_submissions (
        report_id, report_type, period_start, period_end,
        reporting_year, reporting_month, total_transactions, total_amount,
        flagged_transactions, suspicious_activities, file_path, file_format,
        file_size_bytes, file_hash, status, generated_by, generated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        submission.reportId,
        submission.reportType,
        submission.periodStart,
        submission.periodEnd,
        submission.reportingYear,
        submission.reportingMonth || null,
        submission.totalTransactions,
        submission.totalAmount,
        submission.flaggedTransactions,
        submission.suspiciousActivities,
        submission.filePath,
        submission.fileFormat,
        submission.fileSizeBytes,
        submission.fileHash,
        submission.status,
        submission.generatedBy,
        submission.generatedAt,
      ]
    );
  }

  /**
   * Mark daily summary as report generated
   */
  private async markDailySummaryReportGenerated(reportDate: Date, reportId: string): Promise<void> {
    await query(
      `UPDATE bsp_daily_summary
       SET report_generated = true,
           report_id = $2,
           generated_at = NOW()
       WHERE summary_date = $1`,
      [reportDate, reportId]
    );
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<BSPReportSubmission | null> {
    const result = await query<any>(
      `SELECT * FROM bsp_report_submissions WHERE report_id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapReportSubmission(result.rows[0]);
  }

  /**
   * Get reports by date range
   */
  async getReports(startDate: Date, endDate: Date, reportType?: BSPReportType): Promise<BSPReportSubmission[]> {
    let sql = `SELECT * FROM bsp_report_submissions
               WHERE period_start >= $1 AND period_end <= $2`;
    const params: any[] = [startDate, endDate];

    if (reportType) {
      sql += ` AND report_type = $3`;
      params.push(reportType);
    }

    sql += ` ORDER BY generated_at DESC`;

    const result = await query<any>(sql, params);
    return result.rows.map(this.mapReportSubmission);
  }

  /**
   * Map database row to report submission
   */
  private mapReportSubmission(row: any): BSPReportSubmission {
    return {
      id: row.id,
      reportId: row.report_id,
      reportType: row.report_type,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      reportingYear: row.reporting_year,
      reportingMonth: row.reporting_month,
      totalTransactions: row.total_transactions,
      totalAmount: parseFloat(row.total_amount),
      flaggedTransactions: row.flagged_transactions,
      suspiciousActivities: row.suspicious_activities,
      filePath: row.file_path,
      fileFormat: row.file_format,
      fileSizeBytes: row.file_size_bytes,
      fileHash: row.file_hash,
      status: row.status,
      bspReferenceNumber: row.bsp_reference_number,
      bspAcknowledgmentDate: row.bsp_acknowledgment_date
        ? new Date(row.bsp_acknowledgment_date)
        : undefined,
      bspNotes: row.bsp_notes,
      generatedBy: row.generated_by,
      submittedBy: row.submitted_by,
      approvedBy: row.approved_by,
      generatedAt: new Date(row.generated_at),
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

/**
 * Default report generation service instance
 */
let defaultService: BSPReportGenerationService | null = null;

/**
 * Get default report generation service
 */
export function getBSPReportService(): BSPReportGenerationService {
  if (!defaultService) {
    defaultService = new BSPReportGenerationService();
  }
  return defaultService;
}

export default BSPReportGenerationService;
