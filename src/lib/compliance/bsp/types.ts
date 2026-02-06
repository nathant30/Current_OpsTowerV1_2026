/**
 * BSP Compliance Types
 *
 * Types for Bangko Sentral ng Pilipinas (Central Bank) compliance
 * AML monitoring, suspicious activity detection, and reporting
 *
 * @module lib/compliance/bsp/types
 */

// =====================================================
// AML MONITORING TYPES
// =====================================================

export type TransactionType = 'ride_payment' | 'wallet_topup' | 'refund' | 'withdrawal';
export type UserType = 'passenger' | 'driver' | 'operator';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AMLMonitoringRecord {
  id?: string;
  transactionId: string;
  paymentId?: string;

  // Transaction details
  amount: number;
  currency: string;
  transactionType: TransactionType;

  // User details
  userId: string;
  userType: UserType;
  userName?: string;
  userPhone?: string;
  userEmail?: string;

  // Threshold checks
  exceedsSingleThreshold: boolean; // ₱50,000
  exceedsDailyThreshold: boolean; // ₱100,000
  exceedsMonthlyThreshold: boolean; // ₱500,000

  dailyCumulativeAmount: number;
  monthlyCumulativeAmount: number;

  // Risk assessment
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  riskFactors: string[];

  // Flags
  flaggedForReview: boolean;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // BSP reporting
  reportedToBsp: boolean;
  bspReportId?: string;
  reportedAt?: Date;

  // Timestamps
  transactionDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AMLThresholds {
  singleTransaction: number; // ₱50,000
  dailyCumulative: number; // ₱100,000
  monthlyCumulative: number; // ₱500,000
}

export const BSP_AML_THRESHOLDS: AMLThresholds = {
  singleTransaction: 50000,
  dailyCumulative: 100000,
  monthlyCumulative: 500000,
};

// =====================================================
// SUSPICIOUS ACTIVITY TYPES
// =====================================================

export type SuspiciousActivityType =
  | 'structuring' // Breaking up transactions
  | 'rapid_succession' // Multiple transactions quickly
  | 'unusual_pattern' // Deviation from normal
  | 'high_velocity' // High frequency
  | 'round_amounts' // Suspicious round numbers
  | 'new_account_large' // Large transaction on new account
  | 'geographic_anomaly' // Unusual location
  | 'time_anomaly' // Unusual time
  | 'manual_flag'; // Manually flagged

export type DetectionMethod = 'automated' | 'manual' | 'ai_model';
export type SuspiciousSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SuspiciousStatus = 'detected' | 'under_review' | 'escalated' | 'cleared' | 'reported';

export interface RelatedTransaction {
  transactionId: string;
  amount: number;
  timestamp: string;
}

export interface SuspiciousActivityEvidence {
  transactionCount?: number;
  totalAmount?: number;
  timeSpanMinutes?: number;
  locations?: string[];
  deviceIds?: string[];
  [key: string]: any;
}

export interface SuspiciousActivity {
  id?: string;
  activityType: SuspiciousActivityType;

  // User reference
  userId: string;
  userType: UserType;
  userName?: string;

  // Related transactions
  relatedTransactions: RelatedTransaction[];

  // Detection
  detectionMethod: DetectionMethod;
  patternDescription: string;
  severity: SuspiciousSeverity;

  // Evidence
  evidence: SuspiciousActivityEvidence;

  // Status
  status: SuspiciousStatus;

  // Investigation
  assignedTo?: string;
  investigationNotes?: string;
  falsePositive: boolean;

  // BSP reporting
  reportedToBsp: boolean;
  bspSarId?: string; // Suspicious Activity Report ID
  reportedAt?: Date;

  // Timestamps
  detectedAt: Date;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// BSP REPORT TYPES
// =====================================================

export type BSPReportType =
  | 'daily_transactions'
  | 'monthly_reconciliation'
  | 'suspicious_activity'
  | 'aml_threshold_breach'
  | 'quarterly_summary'
  | 'annual_summary';

export type ReportStatus = 'draft' | 'generated' | 'submitted' | 'acknowledged' | 'rejected' | 'resubmitted';
export type ReportFormat = 'csv' | 'pdf' | 'xml' | 'json';

export interface BSPReportSubmission {
  id?: string;
  reportId: string;
  reportType: BSPReportType;

  // Report period
  periodStart: Date;
  periodEnd: Date;
  reportingYear: number;
  reportingMonth?: number;

  // Content summary
  totalTransactions: number;
  totalAmount: number;
  flaggedTransactions: number;
  suspiciousActivities: number;

  // File details
  filePath?: string;
  fileFormat: ReportFormat;
  fileSizeBytes?: number;
  fileHash?: string; // SHA-256

  // Status
  status: ReportStatus;

  // BSP tracking
  bspReferenceNumber?: string;
  bspAcknowledgmentDate?: Date;
  bspNotes?: string;

  // Metadata
  generatedBy: string;
  submittedBy?: string;
  approvedBy?: string;

  // Timestamps
  generatedAt: Date;
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// COMPLIANCE ALERT TYPES
// =====================================================

export type AlertType =
  | 'threshold_breach'
  | 'suspicious_pattern'
  | 'missing_report'
  | 'system_error'
  | 'manual_review_required';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export interface ComplianceAlert {
  id?: string;
  alertType: AlertType;
  severity: AlertSeverity;

  // Message
  title: string;
  description: string;

  // Related entities
  transactionId?: string;
  userId?: string;
  reportId?: string;

  // Alert data
  alertData: Record<string, any>;

  // Status
  status: AlertStatus;

  // Response
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;

  // Notifications
  notificationSent: boolean;
  notificationChannels: string[];

  // Timestamps
  triggeredAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// DAILY SUMMARY TYPES
// =====================================================

export interface DailySummary {
  id?: string;
  summaryDate: Date;

  // Transaction counts
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;

  // Amount aggregates
  totalAmount: number;
  totalCompleted: number;
  totalRefunded: number;
  averageTransaction: number;

  // Payment method breakdown
  gcashCount: number;
  gcashAmount: number;
  mayaCount: number;
  mayaAmount: number;
  cashCount: number;
  cashAmount: number;

  // AML monitoring
  highValueCount: number; // > ₱50,000
  highValueAmount: number;
  flaggedCount: number;
  suspiciousCount: number;

  // Report generation
  reportGenerated: boolean;
  reportId?: string;
  generatedAt?: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// =====================================================
// MONITORING & ANALYSIS TYPES
// =====================================================

export interface TransactionMonitoringRequest {
  transactionId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  transactionType: TransactionType;
  userId: string;
  userType: UserType;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  transactionDate: Date;
}

export interface MonitoringResult {
  monitored: boolean;
  amlRecord?: AMLMonitoringRecord;
  alertsTriggered: ComplianceAlert[];
  suspiciousActivitiesDetected: SuspiciousActivity[];
  requiresReview: boolean;
  reportedToBsp: boolean;
}

export interface RiskAssessmentResult {
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: string[];
  recommendations: string[];
}

export interface PatternDetectionResult {
  patternsDetected: SuspiciousActivity[];
  confidenceScore: number;
  falsePositiveProbability: number;
}

// =====================================================
// REPORT GENERATION TYPES
// =====================================================

export interface DailyReportRequest {
  reportDate: Date;
  includeHighValue?: boolean;
  includeFlagged?: boolean;
  format?: ReportFormat;
}

export interface MonthlyReportRequest {
  year: number;
  month: number;
  includeReconciliation?: boolean;
  includeSuspiciousActivity?: boolean;
  format?: ReportFormat;
}

export interface ReportGenerationResult {
  success: boolean;
  reportId: string;
  filePath: string;
  fileSize: number;
  recordCount: number;
  generatedAt: Date;
  error?: string;
}

// =====================================================
// DASHBOARD & ANALYTICS TYPES
// =====================================================

export interface AMLDashboardMetrics {
  date: Date;
  totalMonitored: number;
  singleThresholdBreaches: number;
  dailyThresholdBreaches: number;
  monthlyThresholdBreaches: number;
  flaggedCount: number;
  reviewedCount: number;
  reportedCount: number;
  totalAmount: number;
  averageAmount: number;
  maxAmount: number;
  uniqueUsers: number;
}

export interface ComplianceOverview {
  today: DailySummary;
  activeAlerts: number;
  pendingReviews: number;
  unresolvedSuspicious: number;
  lastReportSubmitted?: Date;
  nextReportDue?: Date;
  complianceScore: number; // 0-100
}

// =====================================================
// ERROR TYPES
// =====================================================

export class BSPComplianceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BSPComplianceError';
  }
}

export class AMLThresholdError extends BSPComplianceError {
  constructor(message: string, details?: any) {
    super(message, 'AML_THRESHOLD_ERROR', details);
    this.name = 'AMLThresholdError';
  }
}

export class ReportGenerationError extends BSPComplianceError {
  constructor(message: string, details?: any) {
    super(message, 'REPORT_GENERATION_ERROR', details);
    this.name = 'ReportGenerationError';
  }
}
