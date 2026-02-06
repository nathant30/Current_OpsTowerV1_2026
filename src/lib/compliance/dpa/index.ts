/**
 * DPA Compliance Module
 *
 * Central export for DPA (Data Privacy Act) compliance
 * Consent management, data subject rights, and privacy compliance
 *
 * @module lib/compliance/dpa
 */

// Services
export { DPAConsentService, getDPAConsentService } from './consent-management';
export {
  DataSubjectRightsService,
  getDataSubjectRightsService,
} from './data-subject-rights';

// Types
export * from './types';
