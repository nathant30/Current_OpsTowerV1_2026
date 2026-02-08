/**
 * LTFRB Document Expiry Check
 *
 * Automated job that checks for expiring driver licenses and vehicle franchises
 * Runs daily to identify documents expiring within 30 days
 */

import { getLTFRBComplianceService } from '@/lib/compliance/ltfrb/ltfrb-service';
import { logger } from '@/lib/security/productionLogger';

interface ExpiryCheckResult {
  success: boolean;
  expiringDrivers: number;
  expiredDrivers: number;
  expiringVehicles: number;
  expiredVehicles: number;
  notifications?: {
    sent: number;
    failed: number;
  };
  duration: number;
}

/**
 * Check for expiring driver documents and send notifications
 */
export async function checkDriverDocumentExpiry(
  daysBeforeExpiry: number = 30
): Promise<ExpiryCheckResult> {
  const startTime = Date.now();

  try {
    logger.info('Starting driver document expiry check', { daysBeforeExpiry });

    const ltfrbService = getLTFRBComplianceService();
    const expiringDocs = await ltfrbService.checkDriverDocumentExpiry(daysBeforeExpiry);

    // Separate expiring vs already expired
    const now = new Date();
    const expiredDrivers = expiringDocs.filter(
      (d) =>
        (d.licenseExpiryDate && new Date(d.licenseExpiryDate) < now) ||
        (d.accreditationExpiryDate && new Date(d.accreditationExpiryDate) < now)
    );
    const expiringDrivers = expiringDocs.filter(
      (d) => !expiredDrivers.some((e) => e.id === d.id)
    );

    const duration = Date.now() - startTime;

    logger.info('Driver document expiry check completed', {
      totalChecked: expiringDocs.length,
      expiringCount: expiringDrivers.length,
      expiredCount: expiredDrivers.length,
      duration: `${duration}ms`,
    });

    // Log critical issues for expired documents
    if (expiredDrivers.length > 0) {
      logger.warn('Drivers with expired documents detected', {
        count: expiredDrivers.length,
        driverIds: expiredDrivers.map((d) => d.driverId),
      });
    }

    // In production, this would send notifications to drivers and admin
    // For now, just log the alerts
    const notifications = await sendExpiryNotifications(expiringDrivers, expiredDrivers);

    return {
      success: true,
      expiringDrivers: expiringDrivers.length,
      expiredDrivers: expiredDrivers.length,
      expiringVehicles: 0, // Will be implemented in vehicle check
      expiredVehicles: 0,
      notifications,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to check driver document expiry', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    return {
      success: false,
      expiringDrivers: 0,
      expiredDrivers: 0,
      expiringVehicles: 0,
      expiredVehicles: 0,
      duration,
    };
  }
}

/**
 * Check for expiring vehicle franchises
 */
export async function checkVehicleFranchiseExpiry(
  daysBeforeExpiry: number = 30
): Promise<ExpiryCheckResult> {
  const startTime = Date.now();

  try {
    logger.info('Starting vehicle franchise expiry check', { daysBeforeExpiry });

    const ltfrbService = getLTFRBComplianceService();
    const expiringVehicles = await ltfrbService.trackFranchiseExpiry(daysBeforeExpiry);

    // Separate expiring vs already expired
    const now = new Date();
    const expiredVehicles = expiringVehicles.filter(
      (v) => v.franchiseExpiryDate && new Date(v.franchiseExpiryDate) < now
    );
    const stillValidVehicles = expiringVehicles.filter(
      (v) => !expiredVehicles.some((e) => e.id === v.id)
    );

    const duration = Date.now() - startTime;

    logger.info('Vehicle franchise expiry check completed', {
      totalChecked: expiringVehicles.length,
      expiringCount: stillValidVehicles.length,
      expiredCount: expiredVehicles.length,
      duration: `${duration}ms`,
    });

    // Log critical issues for expired franchises
    if (expiredVehicles.length > 0) {
      logger.warn('Vehicles with expired franchises detected', {
        count: expiredVehicles.length,
        vehicleIds: expiredVehicles.map((v) => v.vehicleId),
        plateNumbers: expiredVehicles.map((v) => v.plateNumber),
      });
    }

    return {
      success: true,
      expiringDrivers: 0,
      expiredDrivers: 0,
      expiringVehicles: stillValidVehicles.length,
      expiredVehicles: expiredVehicles.length,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to check vehicle franchise expiry', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    return {
      success: false,
      expiringDrivers: 0,
      expiredDrivers: 0,
      expiringVehicles: 0,
      expiredVehicles: 0,
      duration,
    };
  }
}

/**
 * Run comprehensive document expiry check (drivers + vehicles)
 */
export async function checkAllDocumentExpiry(
  daysBeforeExpiry: number = 30
): Promise<ExpiryCheckResult> {
  const startTime = Date.now();

  try {
    logger.info('Starting comprehensive document expiry check');

    const [driverResults, vehicleResults] = await Promise.all([
      checkDriverDocumentExpiry(daysBeforeExpiry),
      checkVehicleFranchiseExpiry(daysBeforeExpiry),
    ]);

    const duration = Date.now() - startTime;

    const combinedResult: ExpiryCheckResult = {
      success: driverResults.success && vehicleResults.success,
      expiringDrivers: driverResults.expiringDrivers,
      expiredDrivers: driverResults.expiredDrivers,
      expiringVehicles: vehicleResults.expiringVehicles,
      expiredVehicles: vehicleResults.expiredVehicles,
      notifications: driverResults.notifications,
      duration,
    };

    logger.info('Comprehensive document expiry check completed', {
      totalExpiring:
        combinedResult.expiringDrivers + combinedResult.expiringVehicles,
      totalExpired: combinedResult.expiredDrivers + combinedResult.expiredVehicles,
      duration: `${duration}ms`,
    });

    return combinedResult;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to run comprehensive document expiry check', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
    });

    return {
      success: false,
      expiringDrivers: 0,
      expiredDrivers: 0,
      expiringVehicles: 0,
      expiredVehicles: 0,
      duration,
    };
  }
}

/**
 * Send expiry notifications to drivers and administrators
 * In production, this would integrate with email/SMS service
 */
async function sendExpiryNotifications(
  expiringDrivers: any[],
  expiredDrivers: any[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  try {
    // Log notifications for expiring documents
    for (const driver of expiringDrivers) {
      try {
        logger.info('Document expiring soon notification', {
          driverId: driver.driverId,
          licenseNumber: driver.licenseNumber,
          licenseExpiryDate: driver.licenseExpiryDate,
          accreditationExpiryDate: driver.accreditationExpiryDate,
        });
        sent++;
        // In production: await emailService.send(...)
        // In production: await smsService.send(...)
      } catch (error) {
        logger.error('Failed to send expiring notification', {
          driverId: driver.driverId,
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    // Log critical notifications for expired documents
    for (const driver of expiredDrivers) {
      try {
        logger.warn('Document expired notification (CRITICAL)', {
          driverId: driver.driverId,
          licenseNumber: driver.licenseNumber,
          licenseExpiryDate: driver.licenseExpiryDate,
          accreditationExpiryDate: driver.accreditationExpiryDate,
        });
        sent++;
        // In production: await emailService.send(...) with high priority
        // In production: await smsService.send(...) with urgent flag
      } catch (error) {
        logger.error('Failed to send expired notification', {
          driverId: driver.driverId,
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    logger.error('Failed to send expiry notifications', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent, failed };
  }
}
