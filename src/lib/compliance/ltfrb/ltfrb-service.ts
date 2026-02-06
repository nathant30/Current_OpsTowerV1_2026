/**
 * LTFRB Compliance Service
 *
 * Comprehensive service for LTFRB compliance:
 * - Driver verification
 * - Vehicle franchise validation
 * - Trip reporting
 *
 * @module lib/compliance/ltfrb/ltfrb-service
 */

import { query } from '@/lib/db';
import type {
  LTFRBDriver,
  LTFRBVehicle,
  LTFRBTripReport,
  LTFRBReportSubmission,
  DriverVerificationResponse,
  VehicleVerificationResponse,
  TripReportResponse,
  ReportGenerationResponse,
  LTFRBStatistics,
} from './types';

// =====================================================
// LTFRB COMPLIANCE SERVICE
// =====================================================

export class LTFRBComplianceService {
  // =====================================================
  // DRIVER VERIFICATION METHODS
  // =====================================================

  /**
   * Verify driver against LTFRB database
   */
  async verifyDriver(
    driverId: string,
    licenseNumber: string
  ): Promise<DriverVerificationResponse> {
    try {
      // Check if driver already verified
      const existing = await query<LTFRBDriver>(
        `SELECT * FROM ltfrb_drivers WHERE driver_id = $1`,
        [driverId]
      );

      if (existing.rowCount === 0) {
        // Create new verification record
        const result = await query<LTFRBDriver>(
          `INSERT INTO ltfrb_drivers (
            driver_id,
            license_number,
            license_type,
            verification_status,
            license_expiry_date
          ) VALUES ($1, $2, 'professional', 'pending', CURRENT_DATE + INTERVAL '5 years')
          RETURNING *`,
          [driverId, licenseNumber]
        );

        const driver = this.mapDriver(result.rows[0]);

        return {
          success: true,
          driver,
          compliant: driver.ltfrbCompliant,
          issues: this.extractIssues(driver.complianceIssues),
        };
      }

      const driver = this.mapDriver(existing.rows[0]);

      return {
        success: true,
        driver,
        compliant: driver.ltfrbCompliant,
        issues: this.extractIssues(driver.complianceIssues),
      };
    } catch (error) {
      console.error('Error verifying driver:', error);
      return {
        success: false,
        compliant: false,
        error: error instanceof Error ? error.message : 'Failed to verify driver',
      };
    }
  }

  /**
   * Update driver verification status
   */
  async updateDriverStatus(
    driverId: string,
    status: string,
    tnvsAccreditation?: string
  ): Promise<DriverVerificationResponse> {
    try {
      const result = await query<LTFRBDriver>(
        `UPDATE ltfrb_drivers
         SET verification_status = $2,
             tnvs_accreditation_number = COALESCE($3, tnvs_accreditation_number),
             verified_at = NOW(),
             updated_at = NOW()
         WHERE driver_id = $1
         RETURNING *`,
        [driverId, status, tnvsAccreditation]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          compliant: false,
          error: 'Driver not found',
        };
      }

      const driver = this.mapDriver(result.rows[0]);

      return {
        success: true,
        driver,
        compliant: driver.ltfrbCompliant,
      };
    } catch (error) {
      console.error('Error updating driver status:', error);
      return {
        success: false,
        compliant: false,
        error: error instanceof Error ? error.message : 'Failed to update driver status',
      };
    }
  }

  /**
   * Check for expiring driver documents
   */
  async checkDriverDocumentExpiry(daysBeforeExpiry: number = 30): Promise<LTFRBDriver[]> {
    try {
      const result = await query<LTFRBDriver>(
        `SELECT * FROM ltfrb_drivers
         WHERE verification_status = 'verified'
           AND (
             license_expiry_date <= CURRENT_DATE + INTERVAL '${daysBeforeExpiry} days'
             OR accreditation_expiry_date <= CURRENT_DATE + INTERVAL '${daysBeforeExpiry} days'
           )
         ORDER BY license_expiry_date ASC`
      );

      return result.rows.map(this.mapDriver);
    } catch (error) {
      console.error('Error checking driver document expiry:', error);
      return [];
    }
  }

  // =====================================================
  // VEHICLE FRANCHISE METHODS
  // =====================================================

  /**
   * Validate vehicle franchise
   */
  async validateFranchise(
    vehicleId: string,
    plateNumber: string
  ): Promise<VehicleVerificationResponse> {
    try {
      const existing = await query<LTFRBVehicle>(
        `SELECT * FROM ltfrb_vehicles WHERE vehicle_id = $1`,
        [vehicleId]
      );

      if (existing.rowCount === 0) {
        // Create new vehicle record
        const result = await query<LTFRBVehicle>(
          `INSERT INTO ltfrb_vehicles (
            vehicle_id,
            plate_number,
            franchise_status,
            verification_status
          ) VALUES ($1, $2, 'pending', 'pending')
          RETURNING *`,
          [vehicleId, plateNumber]
        );

        const vehicle = this.mapVehicle(result.rows[0]);

        return {
          success: true,
          vehicle,
          compliant: vehicle.ltfrbCompliant,
          issues: this.extractIssues(vehicle.complianceIssues),
        };
      }

      const vehicle = this.mapVehicle(existing.rows[0]);

      return {
        success: true,
        vehicle,
        compliant: vehicle.ltfrbCompliant,
        issues: this.extractIssues(vehicle.complianceIssues),
      };
    } catch (error) {
      console.error('Error validating franchise:', error);
      return {
        success: false,
        compliant: false,
        error: error instanceof Error ? error.message : 'Failed to validate franchise',
      };
    }
  }

  /**
   * Track franchise expiry
   */
  async trackFranchiseExpiry(daysBeforeExpiry: number = 30): Promise<LTFRBVehicle[]> {
    try {
      const result = await query<LTFRBVehicle>(
        `SELECT * FROM ltfrb_vehicles
         WHERE franchise_status = 'approved'
           AND franchise_expiry_date <= CURRENT_DATE + INTERVAL '${daysBeforeExpiry} days'
         ORDER BY franchise_expiry_date ASC`
      );

      return result.rows.map(this.mapVehicle);
    } catch (error) {
      console.error('Error tracking franchise expiry:', error);
      return [];
    }
  }

  // =====================================================
  // TRIP REPORTING METHODS
  // =====================================================

  /**
   * Log trip for LTFRB reporting
   */
  async logTripForLTFRB(tripData: Partial<LTFRBTripReport>): Promise<TripReportResponse> {
    try {
      const result = await query<LTFRBTripReport>(
        `INSERT INTO ltfrb_trip_reports (
          ride_id,
          trip_date,
          trip_start_time,
          trip_end_time,
          driver_id,
          vehicle_id,
          plate_number,
          passenger_id,
          total_fare,
          trip_status,
          distance_km,
          surge_multiplier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          tripData.rideId,
          tripData.tripDate || new Date(),
          tripData.tripStartTime,
          tripData.tripEndTime,
          tripData.driverId,
          tripData.vehicleId,
          tripData.plateNumber,
          tripData.passengerId,
          tripData.totalFare,
          tripData.tripStatus || 'completed',
          tripData.distanceKm || 0,
          tripData.surgeMultiplier || 1.0,
        ]
      );

      return {
        success: true,
        report: this.mapTripReport(result.rows[0]),
      };
    } catch (error) {
      console.error('Error logging trip for LTFRB:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log trip',
      };
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(reportDate: Date): Promise<ReportGenerationResponse> {
    try {
      const reportId = `LTFRB-DAILY-${reportDate.toISOString().split('T')[0]}`;

      // Get trip statistics for the day
      const stats = await query<any>(
        `SELECT
          COUNT(*) as total_trips,
          COUNT(*) FILTER (WHERE trip_status = 'completed') as completed_trips,
          COUNT(*) FILTER (WHERE trip_status = 'cancelled') as cancelled_trips,
          SUM(distance_km) as total_distance_km,
          SUM(total_fare) as total_fare_amount,
          COUNT(DISTINCT driver_id) as unique_drivers,
          COUNT(DISTINCT vehicle_id) as unique_vehicles,
          COUNT(DISTINCT passenger_id) as unique_passengers
         FROM ltfrb_trip_reports
         WHERE trip_date = $1`,
        [reportDate]
      );

      const row = stats.rows[0];

      // Create report submission
      const result = await query<LTFRBReportSubmission>(
        `INSERT INTO ltfrb_report_submissions (
          report_id,
          report_type,
          period_start,
          period_end,
          reporting_year,
          reporting_month,
          total_trips,
          completed_trips,
          cancelled_trips,
          total_distance_km,
          total_fare_amount,
          unique_drivers,
          unique_vehicles,
          unique_passengers,
          file_format,
          status,
          generated_by
        ) VALUES ($1, 'daily_trips', $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'csv', 'generated', $13)
        RETURNING *`,
        [
          reportId,
          reportDate,
          reportDate.getFullYear(),
          reportDate.getMonth() + 1,
          row.total_trips || 0,
          row.completed_trips || 0,
          row.cancelled_trips || 0,
          row.total_distance_km || 0,
          row.total_fare_amount || 0,
          row.unique_drivers || 0,
          row.unique_vehicles || 0,
          row.unique_passengers || 0,
          'system',
        ]
      );

      return {
        success: true,
        report: this.mapReportSubmission(result.rows[0]),
        reportId,
      };
    } catch (error) {
      console.error('Error generating daily report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      };
    }
  }

  /**
   * Generate monthly report
   */
  async generateMonthlyReport(year: number, month: number): Promise<ReportGenerationResponse> {
    try {
      const reportId = `LTFRB-MONTHLY-${year}-${month.toString().padStart(2, '0')}`;
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      // Get monthly statistics
      const stats = await query<any>(
        `SELECT
          COUNT(*) as total_trips,
          COUNT(*) FILTER (WHERE trip_status = 'completed') as completed_trips,
          COUNT(*) FILTER (WHERE trip_status = 'cancelled') as cancelled_trips,
          SUM(distance_km) as total_distance_km,
          SUM(total_fare) as total_fare_amount,
          COUNT(DISTINCT driver_id) as unique_drivers,
          COUNT(DISTINCT vehicle_id) as unique_vehicles,
          COUNT(DISTINCT passenger_id) as unique_passengers
         FROM ltfrb_trip_reports
         WHERE trip_date >= $1 AND trip_date <= $2`,
        [periodStart, periodEnd]
      );

      const row = stats.rows[0];

      const result = await query<LTFRBReportSubmission>(
        `INSERT INTO ltfrb_report_submissions (
          report_id,
          report_type,
          period_start,
          period_end,
          reporting_year,
          reporting_month,
          total_trips,
          completed_trips,
          cancelled_trips,
          total_distance_km,
          total_fare_amount,
          unique_drivers,
          unique_vehicles,
          unique_passengers,
          file_format,
          status,
          generated_by
        ) VALUES ($1, 'monthly_reconciliation', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'csv', 'generated', $14)
        RETURNING *`,
        [
          reportId,
          periodStart,
          periodEnd,
          year,
          month,
          row.total_trips || 0,
          row.completed_trips || 0,
          row.cancelled_trips || 0,
          row.total_distance_km || 0,
          row.total_fare_amount || 0,
          row.unique_drivers || 0,
          row.unique_vehicles || 0,
          row.unique_passengers || 0,
          'system',
        ]
      );

      return {
        success: true,
        report: this.mapReportSubmission(result.rows[0]),
        reportId,
      };
    } catch (error) {
      console.error('Error generating monthly report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      };
    }
  }

  // =====================================================
  // STATISTICS METHODS
  // =====================================================

  /**
   * Get LTFRB compliance statistics
   */
  async getStatistics(): Promise<LTFRBStatistics> {
    try {
      const [driverStats, vehicleStats, tripStats] = await Promise.all([
        this.getDriverStatistics(),
        this.getVehicleStatistics(),
        this.getTripStatistics(),
      ]);

      return {
        drivers: driverStats,
        vehicles: vehicleStats,
        trips: tripStats,
      };
    } catch (error) {
      console.error('Error fetching LTFRB statistics:', error);
      return {
        drivers: {
          total: 0,
          compliant: 0,
          verified: 0,
          expiringSoon: 0,
          expired: 0,
        },
        vehicles: {
          total: 0,
          compliant: 0,
          verified: 0,
          expiringSoon: 0,
          expired: 0,
        },
        trips: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          reported: 0,
          unreported: 0,
        },
      };
    }
  }

  private async getDriverStatistics() {
    const result = await query<any>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ltfrb_compliant = true) as compliant,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
        COUNT(*) FILTER (WHERE license_expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND license_expiry_date > CURRENT_DATE) as expiring_soon,
        COUNT(*) FILTER (WHERE license_expiry_date < CURRENT_DATE) as expired
       FROM ltfrb_drivers`
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      compliant: parseInt(row.compliant),
      verified: parseInt(row.verified),
      expiringSoon: parseInt(row.expiring_soon),
      expired: parseInt(row.expired),
    };
  }

  private async getVehicleStatistics() {
    const result = await query<any>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ltfrb_compliant = true) as compliant,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
        COUNT(*) FILTER (WHERE franchise_expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND franchise_expiry_date > CURRENT_DATE) as expiring_soon,
        COUNT(*) FILTER (WHERE franchise_expiry_date < CURRENT_DATE) as expired
       FROM ltfrb_vehicles`
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      compliant: parseInt(row.compliant),
      verified: parseInt(row.verified),
      expiringSoon: parseInt(row.expiring_soon),
      expired: parseInt(row.expired),
    };
  }

  private async getTripStatistics() {
    const result = await query<any>(
      `SELECT
        COUNT(*) FILTER (WHERE trip_date = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE trip_date >= CURRENT_DATE - INTERVAL '7 days') as this_week,
        COUNT(*) FILTER (WHERE DATE_TRUNC('month', trip_date) = DATE_TRUNC('month', CURRENT_DATE)) as this_month,
        COUNT(*) FILTER (WHERE reported_to_ltfrb = true) as reported,
        COUNT(*) FILTER (WHERE reported_to_ltfrb = false) as unreported
       FROM ltfrb_trip_reports`
    );

    const row = result.rows[0];
    return {
      today: parseInt(row.today),
      thisWeek: parseInt(row.this_week),
      thisMonth: parseInt(row.this_month),
      reported: parseInt(row.reported),
      unreported: parseInt(row.unreported),
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private mapDriver(row: any): LTFRBDriver {
    return {
      id: row.id,
      driverId: row.driver_id,
      licenseNumber: row.license_number,
      licenseType: row.license_type,
      ltfrbDriverId: row.ltfrb_driver_id,
      tnvsAccreditationNumber: row.tnvs_accreditation_number,
      verificationStatus: row.verification_status,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      verifiedBy: row.verified_by,
      verificationMethod: row.verification_method,
      licenseIssueDate: row.license_issue_date ? new Date(row.license_issue_date) : undefined,
      licenseExpiryDate: new Date(row.license_expiry_date),
      accreditationExpiryDate: row.accreditation_expiry_date
        ? new Date(row.accreditation_expiry_date)
        : undefined,
      licenseRestrictions:
        typeof row.license_restrictions === 'string'
          ? JSON.parse(row.license_restrictions)
          : row.license_restrictions,
      drivingRecordViolations: row.driving_record_violations,
      lastViolationDate: row.last_violation_date ? new Date(row.last_violation_date) : undefined,
      hasValidProfessionalLicense: row.has_valid_professional_license,
      hasTnvsAccreditation: row.has_tnvs_accreditation,
      hasCleanDrivingRecord: row.has_clean_driving_record,
      meetsAgeRequirement: row.meets_age_requirement,
      ltfrbCompliant: row.ltfrb_compliant,
      complianceIssues:
        typeof row.compliance_issues === 'string'
          ? JSON.parse(row.compliance_issues)
          : row.compliance_issues,
      lastLtfrbSync: row.last_ltfrb_sync ? new Date(row.last_ltfrb_sync) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapVehicle(row: any): LTFRBVehicle {
    return {
      id: row.id,
      vehicleId: row.vehicle_id,
      plateNumber: row.plate_number,
      chassisNumber: row.chassis_number,
      engineNumber: row.engine_number,
      franchiseNumber: row.franchise_number,
      franchiseType: row.franchise_type,
      ltfrbCaseNumber: row.ltfrb_case_number,
      franchiseStatus: row.franchise_status,
      franchiseIssueDate: row.franchise_issue_date ? new Date(row.franchise_issue_date) : undefined,
      franchiseExpiryDate: row.franchise_expiry_date
        ? new Date(row.franchise_expiry_date)
        : undefined,
      vehicleType: row.vehicle_type,
      yearModel: row.year_model,
      vehicleAgeYears: row.vehicle_age_years,
      meetsAgeRequirement: row.meets_age_requirement,
      meetsEmissionStandards: row.meets_emission_standards,
      hasValidOrCr: row.has_valid_or_cr,
      hasComprehensiveInsurance: row.has_comprehensive_insurance,
      hasLtfrbSticker: row.has_ltfrb_sticker,
      verificationStatus: row.verification_status,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      verifiedBy: row.verified_by,
      orCrExpiryDate: row.or_cr_expiry_date ? new Date(row.or_cr_expiry_date) : undefined,
      emissionTestExpiryDate: row.emission_test_expiry_date
        ? new Date(row.emission_test_expiry_date)
        : undefined,
      insuranceExpiryDate: row.insurance_expiry_date
        ? new Date(row.insurance_expiry_date)
        : undefined,
      ltfrbCompliant: row.ltfrb_compliant,
      complianceIssues:
        typeof row.compliance_issues === 'string'
          ? JSON.parse(row.compliance_issues)
          : row.compliance_issues,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTripReport(row: any): LTFRBTripReport {
    return {
      id: row.id,
      rideId: row.ride_id,
      tripNumber: row.trip_number,
      tripDate: new Date(row.trip_date),
      tripStartTime: new Date(row.trip_start_time),
      tripEndTime: row.trip_end_time ? new Date(row.trip_end_time) : undefined,
      tripDurationMinutes: row.trip_duration_minutes,
      driverId: row.driver_id,
      driverName: row.driver_name,
      licenseNumber: row.license_number,
      vehicleId: row.vehicle_id,
      plateNumber: row.plate_number,
      franchiseNumber: row.franchise_number,
      pickupAddress: row.pickup_address,
      pickupLatitude: row.pickup_latitude,
      pickupLongitude: row.pickup_longitude,
      pickupCity: row.pickup_city,
      dropoffAddress: row.dropoff_address,
      dropoffLatitude: row.dropoff_latitude,
      dropoffLongitude: row.dropoff_longitude,
      dropoffCity: row.dropoff_city,
      distanceKm: row.distance_km,
      passengerId: row.passenger_id,
      passengerName: row.passenger_name,
      passengerPhone: row.passenger_phone,
      baseFare: row.base_fare,
      distanceFare: row.distance_fare,
      timeFare: row.time_fare,
      surgeMultiplier: row.surge_multiplier,
      totalFare: row.total_fare,
      paymentMethod: row.payment_method,
      tripStatus: row.trip_status,
      cancellationReason: row.cancellation_reason,
      reportedToLtfrb: row.reported_to_ltfrb,
      ltfrbReportId: row.ltfrb_report_id,
      reportedAt: row.reported_at ? new Date(row.reported_at) : undefined,
      reportBatchId: row.report_batch_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapReportSubmission(row: any): LTFRBReportSubmission {
    return {
      id: row.id,
      reportId: row.report_id,
      reportType: row.report_type,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      reportingYear: row.reporting_year,
      reportingMonth: row.reporting_month,
      totalTrips: row.total_trips,
      completedTrips: row.completed_trips,
      cancelledTrips: row.cancelled_trips,
      totalDistanceKm: parseFloat(row.total_distance_km),
      totalFareAmount: parseFloat(row.total_fare_amount),
      uniqueDrivers: row.unique_drivers,
      uniqueVehicles: row.unique_vehicles,
      uniquePassengers: row.unique_passengers,
      incidentsCount: row.incidents_count,
      complianceViolations: row.compliance_violations,
      filePath: row.file_path,
      fileFormat: row.file_format,
      fileSizeBytes: row.file_size_bytes,
      fileHash: row.file_hash,
      status: row.status,
      ltfrbReferenceNumber: row.ltfrb_reference_number,
      ltfrbAcknowledgmentDate: row.ltfrb_acknowledgment_date
        ? new Date(row.ltfrb_acknowledgment_date)
        : undefined,
      ltfrbNotes: row.ltfrb_notes,
      generatedBy: row.generated_by,
      submittedBy: row.submitted_by,
      validatedBy: row.validated_by,
      generatedAt: new Date(row.generated_at),
      validatedAt: row.validated_at ? new Date(row.validated_at) : undefined,
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private extractIssues(complianceIssues: any[]): string[] {
    return complianceIssues.map((issue) => issue.issue);
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let ltfrbServiceInstance: LTFRBComplianceService | null = null;

export function getLTFRBComplianceService(): LTFRBComplianceService {
  if (!ltfrbServiceInstance) {
    ltfrbServiceInstance = new LTFRBComplianceService();
  }
  return ltfrbServiceInstance;
}
