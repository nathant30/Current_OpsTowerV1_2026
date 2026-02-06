/**
 * DPA Compliance Type Definitions
 *
 * Data Privacy Act (Philippines) compliance types
 *
 * @module lib/compliance/dpa/types
 */

// =====================================================
// CONSENT TYPES
// =====================================================

export type ConsentType =
  | 'essential'
  | 'analytics'
  | 'marketing'
  | 'data_sharing'
  | 'location_tracking'
  | 'profile_visibility'
  | 'notifications'
  | 'terms_of_service'
  | 'privacy_policy';

export type ConsentMethod =
  | 'explicit'
  | 'implicit'
  | 'mandatory'
  | 'opt_in'
  | 'opt_out';

export interface DPAConsent {
  id: string;
  userId: string;
  userType: 'passenger' | 'driver' | 'operator' | 'admin';
  consentType: ConsentType;
  consentGiven: boolean;
  consentVersion: string;
  purpose: string;
  scope: {
    dataTypes?: string[];
    retentionDays?: number;
    [key: string]: any;
  };
  consentMethod: ConsentMethod;
  sourcePage?: string;
  sourceAction?: string;
  userAgent?: string;
  ipAddress?: string;
  withdrawn: boolean;
  withdrawnAt?: Date;
  withdrawalReason?: string;
  consentProof?: Record<string, any>;
  expiresAt?: Date;
  autoRenew: boolean;
  consentedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRequest {
  userId: string;
  userType: 'passenger' | 'driver' | 'operator' | 'admin';
  consentType: ConsentType;
  consentGiven: boolean;
  consentVersion: string;
  purpose: string;
  scope?: Record<string, any>;
  consentMethod: ConsentMethod;
  sourcePage?: string;
  sourceAction?: string;
  userAgent?: string;
  ipAddress?: string;
}

// =====================================================
// DATA SUBJECT REQUEST TYPES
// =====================================================

export type DataRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'portability'
  | 'restriction'
  | 'objection'
  | 'automated_decision';

export type DataRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'identity_verification'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type DataRequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface DPADataRequest {
  id: string;
  requestId: string;
  userId: string;
  userType: 'passenger' | 'driver' | 'operator' | 'admin';
  userEmail?: string;
  userPhone?: string;
  requestType: DataRequestType;
  requestReason?: string;
  specificDataRequested: string[];
  status: DataRequestStatus;
  assignedTo?: string;
  priority: DataRequestPriority;
  identityVerified: boolean;
  verificationMethod?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  responseData?: Record<string, any>;
  responseFilePath?: string;
  responseNotes?: string;
  deadlineDate: Date;
  completedWithinDeadline?: boolean;
  rejectionReason?: string;
  rejectionLegalBasis?: string;
  actionsTaken: Array<{
    action: string;
    timestamp: Date;
    by: string;
  }>;
  submittedAt: Date;
  reviewedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataRequestSubmission {
  userId: string;
  userType: 'passenger' | 'driver' | 'operator' | 'admin';
  userEmail?: string;
  userPhone?: string;
  requestType: DataRequestType;
  requestReason?: string;
  specificDataRequested?: string[];
}

// =====================================================
// PROCESSING ACTIVITY TYPES
// =====================================================

export type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_interest'
  | 'legitimate_interests';

export interface ProcessingActivity {
  id: string;
  activityName: string;
  activityCode: string;
  purpose: string;
  legalBasis: LegalBasis;
  dataCategories: string[];
  dataSubjectCategories: string[];
  recipients: string[];
  internationalTransfers: boolean;
  transferCountries: string[];
  transferSafeguards?: string;
  retentionPeriodDays?: number;
  retentionCriteria?: string;
  securityMeasures: string[];
  dpoReviewed: boolean;
  dpoReviewDate?: Date;
  dpoNotes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// PRIVACY NOTICE TYPES
// =====================================================

export type NoticeType =
  | 'privacy_policy'
  | 'cookie_policy'
  | 'terms_of_service'
  | 'data_sharing_notice'
  | 'privacy_notice';

export interface PrivacyNotice {
  id: string;
  noticeType: NoticeType;
  version: string;
  title: string;
  content: string;
  contentHtml?: string;
  summary?: string;
  language: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  isCurrent: boolean;
  isPublished: boolean;
  changesFromPrevious?: string;
  changeSummary: Array<{
    section: string;
    change: string;
  }>;
  approvedBy?: string;
  approvedAt?: Date;
  requiresAcceptance: boolean;
  acceptanceRequiredFor?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// INSURANCE VERIFICATION TYPES
// =====================================================

export type InsuranceType =
  | 'vehicle_comprehensive'
  | 'vehicle_third_party'
  | 'passenger_liability'
  | 'driver_personal'
  | 'compulsory_tpl';

export type VerificationStatus = 'pending' | 'verified' | 'expired' | 'invalid' | 'cancelled';

export interface InsuranceVerification {
  id: string;
  policyNumber: string;
  providerName: string;
  insuranceType: InsuranceType;
  driverId?: string;
  vehicleId?: string;
  coverageAmount: number;
  currency: string;
  coverageScope: {
    bodilyInjury?: number;
    propertyDamage?: number;
    medical?: number;
    [key: string]: any;
  };
  effectiveDate: Date;
  expiryDate: Date;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: Date;
  policyDocumentUrl?: string;
  documentHash?: string;
  renewalReminderSent: boolean;
  renewalReminderSentAt?: Date;
  autoRenew: boolean;
  claimsCount: number;
  lastClaimDate?: Date;
  meetsLtfrbRequirements: boolean;
  complianceNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// RETENTION POLICY TYPES
// =====================================================

export type ExpiryAction = 'delete' | 'archive' | 'anonymize' | 'flag';

export interface RetentionPolicy {
  id: string;
  policyName: string;
  policyCode: string;
  tableName: string;
  dataCategory: string;
  retentionPeriodDays: number;
  retentionStartField: string;
  expiryAction: ExpiryAction;
  legalBasis: string;
  regulationReference?: string;
  exceptionConditions: Array<{
    condition: string;
    extendDays: number;
  }>;
  isActive: boolean;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  executionLog: Array<{
    executedAt: Date;
    recordsProcessed: number;
    recordsDeleted?: number;
    recordsArchived?: number;
    status: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// SERVICE RESPONSE TYPES
// =====================================================

export interface ConsentResponse {
  success: boolean;
  consent?: DPAConsent;
  error?: string;
}

export interface DataRequestResponse {
  success: boolean;
  request?: DPADataRequest;
  requestId?: string;
  error?: string;
}

export interface DataExportResponse {
  success: boolean;
  data?: {
    personalInfo: any;
    tripHistory: any[];
    paymentHistory: any[];
    preferences: any;
    consents: any[];
    documents: any[];
    exportedAt: Date;
  };
  filePath?: string;
  error?: string;
}

export interface DataDeletionResponse {
  success: boolean;
  deletedEntities?: {
    personalInfo: boolean;
    tripHistory: number;
    paymentHistory: number;
    documents: number;
    consents: number;
  };
  retainedData?: {
    legalHoldRecords: number;
    archivedRecords: number;
    reason: string;
  };
  error?: string;
}

// =====================================================
// STATISTICS TYPES
// =====================================================

export interface ConsentStatistics {
  totalConsents: number;
  activeConsents: number;
  withdrawnConsents: number;
  expiredConsents: number;
  consentsByType: Record<ConsentType, number>;
  acceptanceRate: number;
}

export interface DataRequestStatistics {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  averageCompletionDays: number;
  completionRate: number;
  overdueRequests: number;
  requestsByType: Record<DataRequestType, number>;
}
