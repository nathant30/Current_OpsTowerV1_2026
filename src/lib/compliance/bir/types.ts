/**
 * BIR Tax Compliance Type Definitions
 *
 * Bureau of Internal Revenue (Philippines) compliance types
 *
 * @module lib/compliance/bir/types
 */

// =====================================================
// RECEIPT TYPES
// =====================================================

export type ReceiptType = 'official_receipt' | 'sales_invoice' | 'acknowledgment';
export type ReceiptStatus = 'draft' | 'issued' | 'cancelled' | 'voided';

export interface BIRReceipt {
  id: string;
  receiptNumber: string;
  receiptType: ReceiptType;
  seriesPrefix: string;
  seriesYear: number;
  sequenceNumber: number;
  paymentId?: string;
  transactionId?: string;
  rideId?: string;
  customerName: string;
  customerTin?: string;
  customerAddress?: string;
  customerBusinessStyle?: string;
  grossAmount: number;
  vatExemptAmount: number;
  vatZeroRatedAmount: number;
  vatAbleAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatRate: number;
  isVatInclusive: boolean;
  paymentMethod?: string;
  paymentDate: Date;
  paymentReference?: string;
  description: string;
  serviceType?: 'ride_service' | 'delivery_service' | 'subscription' | 'commission' | 'other';
  birPermitNumber?: string;
  permitIssueDate?: Date;
  permitValidUntil?: Date;
  status: ReceiptStatus;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  replacesReceiptId?: string;
  replacedByReceiptId?: string;
  printed: boolean;
  printedAt?: Date;
  emailed: boolean;
  emailedAt?: Date;
  emailRecipient?: string;
  pdfUrl?: string;
  pdfHash?: string;
  issuedBy?: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// TAX CALCULATION TYPES
// =====================================================

export type WithholdingTaxType = 'compensation' | 'expanded' | 'final' | 'none';

export interface BIRTaxCalculation {
  id: string;
  receiptId?: string;
  paymentId?: string;
  calculationDate: Date;
  grossSales: number;
  discounts: number;
  netSales: number;
  vatAbleSales: number;
  vatExemptSales: number;
  vatZeroRatedSales: number;
  outputVat: number;
  subjectToWithholding: boolean;
  withholdingTaxRate?: number;
  withholdingTaxAmount: number;
  withholdingTaxType: WithholdingTaxType;
  netAmountAfterTax: number;
  driverId?: string;
  driverEarnings?: number;
  driverTaxWithheld?: number;
  platformCommission?: number;
  platformCommissionRate?: number;
  calculationDetails?: Record<string, any>;
  calculationVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// MONTHLY REPORT TYPES
// =====================================================

export type MonthlyReportStatus = 'draft' | 'generated' | 'reviewed' | 'filed' | 'acknowledged';

export interface BIRMonthlyReport {
  id: string;
  reportMonth: number;
  reportYear: number;
  periodStart: Date;
  periodEnd: Date;
  totalGrossSales: number;
  totalVatAbleSales: number;
  totalVatExemptSales: number;
  totalVatZeroRatedSales: number;
  totalOutputVat: number;
  totalTransactions: number;
  totalReceiptsIssued: number;
  cancelledReceipts: number;
  cashSales: number;
  gcashSales: number;
  mayaSales: number;
  otherEwalletSales: number;
  totalWithholdingTax: number;
  totalDriverEarnings: number;
  totalDriverTaxWithheld: number;
  totalPlatformCommission: number;
  form2550mData?: Record<string, any>;
  form2550qData?: Record<string, any>;
  status: MonthlyReportStatus;
  filingDeadline?: Date;
  filedAt?: Date;
  filedBy?: string;
  birReferenceNumber?: string;
  birAcknowledgmentDate?: Date;
  reportFileUrl?: string;
  alphalistFileUrl?: string;
  generatedBy?: string;
  generatedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// DRIVER INCOME TYPES
// =====================================================

export type EmploymentType = 'employee' | 'professional' | 'business' | 'mixed';
export type DriverIncomeStatus = 'draft' | 'calculated' | 'issued' | 'filed';

export interface BIRDriverIncome {
  id: string;
  driverId: string;
  driverName: string;
  driverTin?: string;
  driverAddress?: string;
  incomeYear: number;
  incomeMonth?: number;
  periodStart: Date;
  periodEnd: Date;
  grossEarnings: number;
  platformCommission: number;
  netEarnings: number;
  totalTrips: number;
  totalDistanceKm?: number;
  withholdingTaxRate?: number;
  withholdingTaxAmount: number;
  nonTaxableAmount: number;
  taxableAmount: number;
  employmentType: EmploymentType;
  form2316Data?: Record<string, any>;
  status: DriverIncomeStatus;
  certificateIssued: boolean;
  certificateIssuedAt?: Date;
  certificateNumber?: string;
  certificatePdfUrl?: string;
  generatedBy?: string;
  generatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// RECEIPT SERIES TYPES
// =====================================================

export interface BIRReceiptSeries {
  id: string;
  seriesName: string;
  seriesPrefix: string;
  seriesYear: number;
  startNumber: number;
  endNumber: number;
  currentNumber: number;
  atpNumber?: string;
  atpIssueDate?: Date;
  atpValidUntil?: Date;
  printerName?: string;
  printerTin?: string;
  printerAddress?: string;
  isActive: boolean;
  isDepleted: boolean;
  totalIssued: number;
  totalCancelled: number;
  remainingNumbers?: number;
  activatedAt?: Date;
  depletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// SERVICE RESPONSE TYPES
// =====================================================

export interface ReceiptGenerationResponse {
  success: boolean;
  receipt?: BIRReceipt;
  receiptNumber?: string;
  pdfUrl?: string;
  error?: string;
}

export interface TaxCalculationResponse {
  success: boolean;
  calculation?: BIRTaxCalculation;
  vatAmount?: number;
  totalAmount?: number;
  error?: string;
}

export interface MonthlyReportResponse {
  success: boolean;
  report?: BIRMonthlyReport;
  reportId?: string;
  filePath?: string;
  error?: string;
}

export interface DriverIncomeResponse {
  success: boolean;
  income?: BIRDriverIncome;
  certificateUrl?: string;
  error?: string;
}

// =====================================================
// STATISTICS TYPES
// =====================================================

export interface BIRStatistics {
  receipts: {
    totalIssued: number;
    totalCancelled: number;
    todayIssued: number;
    thisMonthIssued: number;
  };
  vat: {
    totalVatAble: number;
    totalOutputVat: number;
    averageVatRate: number;
  };
  reports: {
    pendingReports: number;
    filedReports: number;
    overdueReports: number;
  };
}

// =====================================================
// CONSTANTS
// =====================================================

export const BIR_VAT_RATE = 0.12; // 12% VAT rate in Philippines
export const BIR_WITHHOLDING_TAX_RATES = {
  professional: 0.10, // 10% for professional fees
  employee: 0.15, // 15% for compensation
  business: 0.05, // 5% for business income
};
