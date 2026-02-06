/**
 * BSP Compliance Module
 *
 * Central export for BSP (Bangko Sentral ng Pilipinas) compliance
 * AML monitoring, suspicious activity detection, and reporting
 *
 * @module lib/compliance/bsp
 */

// Services
export { AMLMonitoringService, getAMLMonitoringService } from './aml-monitoring';
export { BSPReportGenerationService, getBSPReportService } from './report-generation';

// Types
export * from './types';

// Constants
export { BSP_AML_THRESHOLDS } from './types';
