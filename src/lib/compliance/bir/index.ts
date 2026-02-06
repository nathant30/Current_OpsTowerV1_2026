/**
 * BIR Tax Compliance Module
 *
 * Central export for BIR (Bureau of Internal Revenue) compliance
 * VAT calculation, Official Receipt generation, and tax reporting
 *
 * @module lib/compliance/bir
 */

// Services
export { BIRTaxService, getBIRTaxService } from './bir-service';

// Types
export * from './types';

// Constants
export { BIR_VAT_RATE, BIR_WITHHOLDING_TAX_RATES } from './types';
