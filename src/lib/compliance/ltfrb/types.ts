/**
 * LTFRB Compliance Type Definitions
 *
 * Land Transportation Franchising and Regulatory Board compliance types
 *
 * @module lib/compliance/ltfrb/types
 */

// =====================================================
// DRIVER VERIFICATION TYPES
// =====================================================

export type LicenseType = 'professional' | 'non_professional' | 'student_permit' | 'conductor';

export type DriverVerificationStatus =
  | 'pending'
  | 'verified'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'unverified';

export interface LTFRBDriver {
  id: string;
  driverId: string;
  licenseNumber: string;
  licenseType: LicenseType;
  ltfrbDriverId?: string;
  tnvsAccreditationNumber?: string;
  verificationStatus: DriverVerificationStatus;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationMethod?: 'api' | 'manual' | 'document_upload' | 'third_party';
  licenseIssueDate?: Date;
  licenseExpiryDate: Date;
  accreditationExpiryDate?: Date;
  licenseRestrictions: string[];
  drivingRecordViolations: number;
  lastViolationDate?: Date;
  hasValidProfessionalLicense: boolean;
  hasTnvsAccreditation: boolean;
  hasCleanDrivingRecord: boolean;
  meetsAgeRequirement: boolean;
  ltfrbCompliant: boolean;
  complianceIssues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detectedAt: Date;
  }>;
  lastLtfrbSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// VEHICLE FRANCHISE TYPES
// =====================================================

export type FranchiseType = 'tnvs' | 'taxi' | 'puv' | 'none';
export type FranchiseStatus = 'pending' | 'approved' | 'expired' | 'suspended' | 'revoked' | 'none';
export type VehicleType = 'sedan' | 'suv' | 'van' | 'hatchback';

export interface LTFRBVehicle {
  id: string;
  vehicleId: string;
  plateNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  franchiseNumber?: string;
  franchiseType?: FranchiseType;
  ltfrbCaseNumber?: string;
  franchiseStatus: FranchiseStatus;
  franchiseIssueDate?: Date;
  franchiseExpiryDate?: Date;
  vehicleType?: VehicleType;
  yearModel?: number;
  vehicleAgeYears?: number;
  meetsAgeRequirement: boolean;
  meetsEmissionStandards: boolean;
  hasValidOrCr: boolean;
  hasComprehensiveInsurance: boolean;
  hasLtfrbSticker: boolean;
  verificationStatus: 'pending' | 'verified' | 'expired' | 'rejected';
  verifiedAt?: Date;
  verifiedBy?: string;
  orCrExpiryDate?: Date;
  emissionTestExpiryDate?: Date;
  insuranceExpiryDate?: Date;
  ltfrbCompliant: boolean;
  complianceIssues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detectedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// TRIP REPORTING TYPES
// =====================================================

export type TripStatus = 'completed' | 'cancelled' | 'no_show' | 'disputed';

export interface LTFRBTripReport {
  id: string;
  rideId: string;
  tripNumber?: string;
  tripDate: Date;
  tripStartTime: Date;
  tripEndTime?: Date;
  tripDurationMinutes?: number;
  driverId: string;
  driverName?: string;
  licenseNumber?: string;
  vehicleId: string;
  plateNumber: string;
  franchiseNumber?: string;
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupCity?: string;
  dropoffAddress?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  dropoffCity?: string;
  distanceKm?: number;
  passengerId: string;
  passengerName?: string;
  passengerPhone?: string;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  surgeMultiplier: number;
  totalFare: number;
  paymentMethod?: string;
  tripStatus: TripStatus;
  cancellationReason?: string;
  reportedToLtfrb: boolean;
  ltfrbReportId?: string;
  reportedAt?: Date;
  reportBatchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// REPORT TYPES
// =====================================================

export type ReportType =
  | 'daily_trips'
  | 'weekly_summary'
  | 'monthly_reconciliation'
  | 'quarterly_summary'
  | 'incident_report'
  | 'compliance_report';

export type ReportStatus =
  | 'draft'
  | 'generated'
  | 'validated'
  | 'submitted'
  | 'acknowledged'
  | 'rejected'
  | 'resubmitted';

export interface LTFRBReportSubmission {
  id: string;
  reportId: string;
  reportType: ReportType;
  periodStart: Date;
  periodEnd: Date;
  reportingYear: number;
  reportingMonth?: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalDistanceKm: number;
  totalFareAmount: number;
  uniqueDrivers: number;
  uniqueVehicles: number;
  uniquePassengers: number;
  incidentsCount: number;
  complianceViolations: number;
  filePath?: string;
  fileFormat: 'csv' | 'xlsx' | 'pdf' | 'xml';
  fileSizeBytes?: number;
  fileHash?: string;
  status: ReportStatus;
  ltfrbReferenceNumber?: string;
  ltfrbAcknowledgmentDate?: Date;
  ltfrbNotes?: string;
  generatedBy: string;
  submittedBy?: string;
  validatedBy?: string;
  generatedAt: Date;
  validatedAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// SERVICE RESPONSE TYPES
// =====================================================

export interface DriverVerificationResponse {
  success: boolean;
  driver?: LTFRBDriver;
  compliant: boolean;
  issues?: string[];
  error?: string;
}

export interface VehicleVerificationResponse {
  success: boolean;
  vehicle?: LTFRBVehicle;
  compliant: boolean;
  issues?: string[];
  error?: string;
}

export interface TripReportResponse {
  success: boolean;
  report?: LTFRBTripReport;
  error?: string;
}

export interface ReportGenerationResponse {
  success: boolean;
  report?: LTFRBReportSubmission;
  reportId?: string;
  filePath?: string;
  error?: string;
}

// =====================================================
// STATISTICS TYPES
// =====================================================

export interface LTFRBStatistics {
  drivers: {
    total: number;
    compliant: number;
    verified: number;
    expiringSoon: number;
    expired: number;
  };
  vehicles: {
    total: number;
    compliant: number;
    verified: number;
    expiringSoon: number;
    expired: number;
  };
  trips: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    reported: number;
    unreported: number;
  };
}
