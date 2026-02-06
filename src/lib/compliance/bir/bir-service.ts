/**
 * BIR Tax Compliance Service
 *
 * Comprehensive service for BIR compliance:
 * - VAT calculation (12%)
 * - Official Receipt generation
 * - Tax reporting (monthly, quarterly, annual)
 * - Driver income tracking (Form 2316)
 *
 * @module lib/compliance/bir/bir-service
 */

import { query } from '@/lib/db';
import type {
  BIRReceipt,
  BIRTaxCalculation,
  BIRMonthlyReport,
  BIRDriverIncome,
  BIRReceiptSeries,
  ReceiptGenerationResponse,
  TaxCalculationResponse,
  MonthlyReportResponse,
  DriverIncomeResponse,
  BIRStatistics,
} from './types';
import { BIR_VAT_RATE } from './types';

// =====================================================
// BIR TAX COMPLIANCE SERVICE
// =====================================================

export class BIRTaxService {
  // =====================================================
  // VAT CALCULATION METHODS
  // =====================================================

  /**
   * Calculate VAT (12%) on amount
   */
  calculateVAT(amount: number, isInclusive: boolean = true): TaxCalculationResponse {
    try {
      let vatAble: number;
      let vatAmount: number;
      let total: number;

      if (isInclusive) {
        // Amount already includes VAT: VAT = Amount / 1.12 * 0.12
        vatAble = amount / (1 + BIR_VAT_RATE);
        vatAmount = amount - vatAble;
        total = amount;
      } else {
        // VAT needs to be added: VAT = Amount * 0.12
        vatAble = amount;
        vatAmount = amount * BIR_VAT_RATE;
        total = amount + vatAmount;
      }

      return {
        success: true,
        vatAmount: Math.round(vatAmount * 100) / 100,
        totalAmount: Math.round(total * 100) / 100,
        calculation: {
          grossSales: amount,
          vatAbleSales: Math.round(vatAble * 100) / 100,
          outputVat: Math.round(vatAmount * 100) / 100,
          netSales: Math.round(vatAble * 100) / 100,
        } as any,
      };
    } catch (error) {
      console.error('Error calculating VAT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate VAT',
      };
    }
  }

  /**
   * Calculate withholding tax for drivers
   */
  calculateWithholdingTax(
    driverEarnings: number,
    taxRate: number = 0.10
  ): number {
    return Math.round(driverEarnings * taxRate * 100) / 100;
  }

  /**
   * Calculate net income after tax
   */
  calculateNetIncome(
    grossEarnings: number,
    platformCommission: number,
    withholdingTax: number
  ): number {
    return Math.round((grossEarnings - platformCommission - withholdingTax) * 100) / 100;
  }

  // =====================================================
  // RECEIPT GENERATION METHODS
  // =====================================================

  /**
   * Generate Official Receipt (OR)
   */
  async generateOfficialReceipt(
    receiptData: Partial<BIRReceipt>
  ): Promise<ReceiptGenerationResponse> {
    try {
      // Get next receipt number
      const receiptNumber = await this.getNextReceiptNumber(
        receiptData.seriesPrefix || 'OR',
        receiptData.seriesYear || new Date().getFullYear()
      );

      // Calculate VAT
      const vatCalc = this.calculateVAT(
        receiptData.grossAmount || 0,
        receiptData.isVatInclusive !== false
      );

      if (!vatCalc.success) {
        return {
          success: false,
          error: 'Failed to calculate VAT',
        };
      }

      // Insert receipt
      const result = await query<BIRReceipt>(
        `INSERT INTO bir_receipts (
          receipt_number,
          receipt_type,
          series_prefix,
          series_year,
          sequence_number,
          payment_id,
          transaction_id,
          customer_name,
          customer_tin,
          customer_address,
          gross_amount,
          vat_able_amount,
          vat_amount,
          total_amount,
          vat_rate,
          is_vat_inclusive,
          payment_method,
          payment_date,
          description,
          service_type,
          status,
          issued_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *`,
        [
          receiptNumber,
          receiptData.receiptType || 'official_receipt',
          receiptData.seriesPrefix || 'OR',
          receiptData.seriesYear || new Date().getFullYear(),
          parseInt(receiptNumber.split('-')[2]),
          receiptData.paymentId,
          receiptData.transactionId,
          receiptData.customerName,
          receiptData.customerTin,
          receiptData.customerAddress,
          receiptData.grossAmount,
          vatCalc.calculation?.vatAbleSales,
          vatCalc.vatAmount,
          vatCalc.totalAmount,
          BIR_VAT_RATE,
          receiptData.isVatInclusive !== false,
          receiptData.paymentMethod,
          receiptData.paymentDate || new Date(),
          receiptData.description,
          receiptData.serviceType || 'ride_service',
          'issued',
          receiptData.issuedBy || 'system',
        ]
      );

      return {
        success: true,
        receipt: this.mapReceipt(result.rows[0]),
        receiptNumber,
      };
    } catch (error) {
      console.error('Error generating official receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate receipt',
      };
    }
  }

  /**
   * Get next receipt number from series
   */
  private async getNextReceiptNumber(prefix: string, year: number): Promise<string> {
    const result = await query<{ get_next_receipt_number: string }>(
      `SELECT get_next_receipt_number($1, $2) as get_next_receipt_number`,
      [prefix, year]
    );
    return result.rows[0].get_next_receipt_number;
  }

  /**
   * Cancel receipt
   */
  async cancelReceipt(
    receiptId: string,
    reason: string,
    cancelledBy: string
  ): Promise<ReceiptGenerationResponse> {
    try {
      const result = await query<BIRReceipt>(
        `UPDATE bir_receipts
         SET status = 'cancelled',
             cancellation_reason = $2,
             cancelled_at = NOW(),
             cancelled_by = $3,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [receiptId, reason, cancelledBy]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'Receipt not found',
        };
      }

      return {
        success: true,
        receipt: this.mapReceipt(result.rows[0]),
      };
    } catch (error) {
      console.error('Error cancelling receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel receipt',
      };
    }
  }

  // =====================================================
  // TAX REPORTING METHODS
  // =====================================================

  /**
   * Generate monthly sales report (Form 2550M)
   */
  async generateMonthlySalesReport(
    year: number,
    month: number
  ): Promise<MonthlyReportResponse> {
    try {
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      // Get monthly sales statistics
      const stats = await query<any>(
        `SELECT
          COUNT(*) as total_receipts,
          SUM(gross_amount) as total_gross_sales,
          SUM(vat_able_amount) as total_vat_able_sales,
          SUM(vat_exempt_amount) as total_vat_exempt_sales,
          SUM(vat_zero_rated_amount) as total_vat_zero_rated_sales,
          SUM(vat_amount) as total_output_vat,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_receipts,
          SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) as cash_sales,
          SUM(CASE WHEN payment_method = 'gcash' THEN total_amount ELSE 0 END) as gcash_sales,
          SUM(CASE WHEN payment_method = 'maya' THEN total_amount ELSE 0 END) as maya_sales
         FROM bir_receipts
         WHERE payment_date >= $1 AND payment_date <= $2
           AND status = 'issued'`,
        [periodStart, periodEnd]
      );

      const row = stats.rows[0];

      // Create monthly report
      const result = await query<BIRMonthlyReport>(
        `INSERT INTO bir_monthly_reports (
          report_month,
          report_year,
          period_start,
          period_end,
          total_gross_sales,
          total_vat_able_sales,
          total_vat_exempt_sales,
          total_vat_zero_rated_sales,
          total_output_vat,
          total_receipts_issued,
          cancelled_receipts,
          cash_sales,
          gcash_sales,
          maya_sales,
          total_transactions,
          status,
          filing_deadline,
          generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'generated', $16, 'system')
        RETURNING *`,
        [
          month,
          year,
          periodStart,
          periodEnd,
          row.total_gross_sales || 0,
          row.total_vat_able_sales || 0,
          row.total_vat_exempt_sales || 0,
          row.total_vat_zero_rated_sales || 0,
          row.total_output_vat || 0,
          row.total_receipts || 0,
          row.cancelled_receipts || 0,
          row.cash_sales || 0,
          row.gcash_sales || 0,
          row.maya_sales || 0,
          row.total_receipts || 0,
          new Date(year, month, 20), // Filing deadline: 20th of following month
        ]
      );

      return {
        success: true,
        report: this.mapMonthlyReport(result.rows[0]),
      };
    } catch (error) {
      console.error('Error generating monthly sales report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      };
    }
  }

  /**
   * Generate quarterly report (Form 2550Q)
   */
  async generateQuarterlyReport(
    year: number,
    quarter: number
  ): Promise<MonthlyReportResponse> {
    try {
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = quarter * 3;
      const periodStart = new Date(year, startMonth - 1, 1);
      const periodEnd = new Date(year, endMonth, 0);

      // Aggregate quarterly data from monthly reports
      const stats = await query<any>(
        `SELECT
          SUM(total_gross_sales) as total_gross_sales,
          SUM(total_vat_able_sales) as total_vat_able_sales,
          SUM(total_vat_exempt_sales) as total_vat_exempt_sales,
          SUM(total_output_vat) as total_output_vat,
          SUM(total_receipts_issued) as total_receipts
         FROM bir_monthly_reports
         WHERE report_year = $1
           AND report_month >= $2
           AND report_month <= $3`,
        [year, startMonth, endMonth]
      );

      const row = stats.rows[0];

      // Create quarterly report
      const result = await query<BIRMonthlyReport>(
        `INSERT INTO bir_monthly_reports (
          report_month,
          report_year,
          period_start,
          period_end,
          total_gross_sales,
          total_vat_able_sales,
          total_vat_exempt_sales,
          total_output_vat,
          total_receipts_issued,
          total_transactions,
          status,
          filing_deadline,
          generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'generated', $11, 'system')
        RETURNING *`,
        [
          quarter,
          year,
          periodStart,
          periodEnd,
          row.total_gross_sales || 0,
          row.total_vat_able_sales || 0,
          row.total_vat_exempt_sales || 0,
          row.total_output_vat || 0,
          row.total_receipts || 0,
          row.total_receipts || 0,
          new Date(year, endMonth, 25), // Quarterly filing deadline
        ]
      );

      return {
        success: true,
        report: this.mapMonthlyReport(result.rows[0]),
      };
    } catch (error) {
      console.error('Error generating quarterly report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate quarterly report',
      };
    }
  }

  /**
   * Generate driver income certificate (Form 2316)
   */
  async generateDriverIncome(
    driverId: string,
    year: number,
    month?: number
  ): Promise<DriverIncomeResponse> {
    try {
      let periodStart: Date;
      let periodEnd: Date;

      if (month) {
        // Monthly income
        periodStart = new Date(year, month - 1, 1);
        periodEnd = new Date(year, month, 0);
      } else {
        // Annual income
        periodStart = new Date(year, 0, 1);
        periodEnd = new Date(year, 11, 31);
      }

      // Calculate driver earnings from payments
      const stats = await query<any>(
        `SELECT
          COUNT(*) as total_trips,
          SUM(amount) as gross_earnings,
          SUM(platform_commission) as platform_commission
         FROM payments
         WHERE driver_id = $1
           AND created_at >= $2
           AND created_at <= $3
           AND status = 'completed'`,
        [driverId, periodStart, periodEnd]
      );

      const row = stats.rows[0];
      const grossEarnings = parseFloat(row.gross_earnings || '0');
      const platformCommission = parseFloat(row.platform_commission || '0');
      const netEarnings = grossEarnings - platformCommission;

      // Calculate withholding tax (10% for professional fees)
      const withholdingTax = this.calculateWithholdingTax(netEarnings, 0.10);

      // Get driver details
      const driverResult = await query<any>(
        `SELECT name, tin FROM users WHERE id = $1`,
        [driverId]
      );
      const driver = driverResult.rows[0];

      // Create income record
      const result = await query<BIRDriverIncome>(
        `INSERT INTO bir_driver_income (
          driver_id,
          driver_name,
          driver_tin,
          income_year,
          income_month,
          period_start,
          period_end,
          gross_earnings,
          platform_commission,
          net_earnings,
          total_trips,
          withholding_tax_amount,
          taxable_amount,
          employment_type,
          status,
          generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'professional', 'calculated', 'system')
        RETURNING *`,
        [
          driverId,
          driver?.name || 'Unknown',
          driver?.tin,
          year,
          month,
          periodStart,
          periodEnd,
          grossEarnings,
          platformCommission,
          netEarnings,
          row.total_trips || 0,
          withholdingTax,
          netEarnings,
        ]
      );

      return {
        success: true,
        income: this.mapDriverIncome(result.rows[0]),
      };
    } catch (error) {
      console.error('Error generating driver income:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate driver income',
      };
    }
  }

  // =====================================================
  // STATISTICS METHODS
  // =====================================================

  /**
   * Get BIR compliance statistics
   */
  async getStatistics(): Promise<BIRStatistics> {
    try {
      const [receiptsStats, vatStats, reportsStats] = await Promise.all([
        this.getReceiptStatistics(),
        this.getVATStatistics(),
        this.getReportStatistics(),
      ]);

      return {
        receipts: receiptsStats,
        vat: vatStats,
        reports: reportsStats,
      };
    } catch (error) {
      console.error('Error fetching BIR statistics:', error);
      return {
        receipts: {
          totalIssued: 0,
          totalCancelled: 0,
          todayIssued: 0,
          thisMonthIssued: 0,
        },
        vat: {
          totalVatAble: 0,
          totalOutputVat: 0,
          averageVatRate: 0.12,
        },
        reports: {
          pendingReports: 0,
          filedReports: 0,
          overdueReports: 0,
        },
      };
    }
  }

  private async getReceiptStatistics() {
    const result = await query<any>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'issued') as total_issued,
        COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,
        COUNT(*) FILTER (WHERE status = 'issued' AND DATE(payment_date) = CURRENT_DATE) as today_issued,
        COUNT(*) FILTER (WHERE status = 'issued' AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)) as this_month_issued
       FROM bir_receipts`
    );

    const row = result.rows[0];
    return {
      totalIssued: parseInt(row.total_issued),
      totalCancelled: parseInt(row.total_cancelled),
      todayIssued: parseInt(row.today_issued),
      thisMonthIssued: parseInt(row.this_month_issued),
    };
  }

  private async getVATStatistics() {
    const result = await query<any>(
      `SELECT
        SUM(vat_able_amount) as total_vat_able,
        SUM(vat_amount) as total_output_vat
       FROM bir_receipts
       WHERE status = 'issued'
         AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)`
    );

    const row = result.rows[0];
    return {
      totalVatAble: parseFloat(row.total_vat_able || '0'),
      totalOutputVat: parseFloat(row.total_output_vat || '0'),
      averageVatRate: 0.12,
    };
  }

  private async getReportStatistics() {
    const result = await query<any>(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('draft', 'generated')) as pending_reports,
        COUNT(*) FILTER (WHERE status = 'filed') as filed_reports,
        COUNT(*) FILTER (WHERE filing_deadline < CURRENT_DATE AND status NOT IN ('filed', 'acknowledged')) as overdue_reports
       FROM bir_monthly_reports`
    );

    const row = result.rows[0];
    return {
      pendingReports: parseInt(row.pending_reports),
      filedReports: parseInt(row.filed_reports),
      overdueReports: parseInt(row.overdue_reports),
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private mapReceipt(row: any): BIRReceipt {
    return {
      id: row.id,
      receiptNumber: row.receipt_number,
      receiptType: row.receipt_type,
      seriesPrefix: row.series_prefix,
      seriesYear: row.series_year,
      sequenceNumber: row.sequence_number,
      paymentId: row.payment_id,
      transactionId: row.transaction_id,
      rideId: row.ride_id,
      customerName: row.customer_name,
      customerTin: row.customer_tin,
      customerAddress: row.customer_address,
      customerBusinessStyle: row.customer_business_style,
      grossAmount: parseFloat(row.gross_amount),
      vatExemptAmount: parseFloat(row.vat_exempt_amount),
      vatZeroRatedAmount: parseFloat(row.vat_zero_rated_amount),
      vatAbleAmount: parseFloat(row.vat_able_amount),
      vatAmount: parseFloat(row.vat_amount),
      totalAmount: parseFloat(row.total_amount),
      vatRate: parseFloat(row.vat_rate),
      isVatInclusive: row.is_vat_inclusive,
      paymentMethod: row.payment_method,
      paymentDate: new Date(row.payment_date),
      paymentReference: row.payment_reference,
      description: row.description,
      serviceType: row.service_type,
      birPermitNumber: row.bir_permit_number,
      permitIssueDate: row.permit_issue_date ? new Date(row.permit_issue_date) : undefined,
      permitValidUntil: row.permit_valid_until ? new Date(row.permit_valid_until) : undefined,
      status: row.status,
      cancellationReason: row.cancellation_reason,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
      cancelledBy: row.cancelled_by,
      replacesReceiptId: row.replaces_receipt_id,
      replacedByReceiptId: row.replaced_by_receipt_id,
      printed: row.printed,
      printedAt: row.printed_at ? new Date(row.printed_at) : undefined,
      emailed: row.emailed,
      emailedAt: row.emailed_at ? new Date(row.emailed_at) : undefined,
      emailRecipient: row.email_recipient,
      pdfUrl: row.pdf_url,
      pdfHash: row.pdf_hash,
      issuedBy: row.issued_by,
      issuedAt: new Date(row.issued_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapMonthlyReport(row: any): BIRMonthlyReport {
    return {
      id: row.id,
      reportMonth: row.report_month,
      reportYear: row.report_year,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      totalGrossSales: parseFloat(row.total_gross_sales),
      totalVatAbleSales: parseFloat(row.total_vat_able_sales),
      totalVatExemptSales: parseFloat(row.total_vat_exempt_sales),
      totalVatZeroRatedSales: parseFloat(row.total_vat_zero_rated_sales),
      totalOutputVat: parseFloat(row.total_output_vat),
      totalTransactions: row.total_transactions,
      totalReceiptsIssued: row.total_receipts_issued,
      cancelledReceipts: row.cancelled_receipts,
      cashSales: parseFloat(row.cash_sales),
      gcashSales: parseFloat(row.gcash_sales),
      mayaSales: parseFloat(row.maya_sales),
      otherEwalletSales: parseFloat(row.other_ewallet_sales),
      totalWithholdingTax: parseFloat(row.total_withholding_tax),
      totalDriverEarnings: parseFloat(row.total_driver_earnings),
      totalDriverTaxWithheld: parseFloat(row.total_driver_tax_withheld),
      totalPlatformCommission: parseFloat(row.total_platform_commission),
      form2550mData:
        typeof row.form_2550m_data === 'string'
          ? JSON.parse(row.form_2550m_data)
          : row.form_2550m_data,
      form2550qData:
        typeof row.form_2550q_data === 'string'
          ? JSON.parse(row.form_2550q_data)
          : row.form_2550q_data,
      status: row.status,
      filingDeadline: row.filing_deadline ? new Date(row.filing_deadline) : undefined,
      filedAt: row.filed_at ? new Date(row.filed_at) : undefined,
      filedBy: row.filed_by,
      birReferenceNumber: row.bir_reference_number,
      birAcknowledgmentDate: row.bir_acknowledgment_date
        ? new Date(row.bir_acknowledgment_date)
        : undefined,
      reportFileUrl: row.report_file_url,
      alphalistFileUrl: row.alphalist_file_url,
      generatedBy: row.generated_by,
      generatedAt: row.generated_at ? new Date(row.generated_at) : undefined,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapDriverIncome(row: any): BIRDriverIncome {
    return {
      id: row.id,
      driverId: row.driver_id,
      driverName: row.driver_name,
      driverTin: row.driver_tin,
      driverAddress: row.driver_address,
      incomeYear: row.income_year,
      incomeMonth: row.income_month,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      grossEarnings: parseFloat(row.gross_earnings),
      platformCommission: parseFloat(row.platform_commission),
      netEarnings: parseFloat(row.net_earnings),
      totalTrips: row.total_trips,
      totalDistanceKm: row.total_distance_km,
      withholdingTaxRate: row.withholding_tax_rate,
      withholdingTaxAmount: parseFloat(row.withholding_tax_amount),
      nonTaxableAmount: parseFloat(row.non_taxable_amount),
      taxableAmount: parseFloat(row.taxable_amount),
      employmentType: row.employment_type,
      form2316Data:
        typeof row.form_2316_data === 'string'
          ? JSON.parse(row.form_2316_data)
          : row.form_2316_data,
      status: row.status,
      certificateIssued: row.certificate_issued,
      certificateIssuedAt: row.certificate_issued_at
        ? new Date(row.certificate_issued_at)
        : undefined,
      certificateNumber: row.certificate_number,
      certificatePdfUrl: row.certificate_pdf_url,
      generatedBy: row.generated_by,
      generatedAt: row.generated_at ? new Date(row.generated_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let birServiceInstance: BIRTaxService | null = null;

export function getBIRTaxService(): BIRTaxService {
  if (!birServiceInstance) {
    birServiceInstance = new BIRTaxService();
  }
  return birServiceInstance;
}
