# Mock Data Audit Report - OpsTower

**Date**: 2026-02-07
**Issue**: #9 - Replace Mock Data
**Coordinator**: QA/Development Coordinator
**Status**: In Progress

## Executive Summary

This audit identifies all mock, dummy, placeholder, and fake data across the OpsTower codebase. The goal is to replace all mock data with realistic Philippine-specific data for production readiness.

## Audit Methodology

1. **Code Search**: Used grep to search for patterns: `mock`, `dummy`, `placeholder`, `fake`, `test data`, `TODO`, `FIXME`
2. **File Analysis**: Examined identified files for actual mock data usage
3. **Categorization**: Classified mock data by type and priority
4. **Recommendation**: Proposed replacement strategy for each category

## Findings Summary

| Category | Files Found | Priority | Status |
|----------|-------------|----------|--------|
| **Primary Mock Data Files** | 2 | P0 | To Replace |
| **Database Seed Data** | 1 | P1 | Enhance Existing |
| **Test Fixtures** | 25+ | P2 | Maintain (Test-only) |
| **Documentation Examples** | 15+ | P3 | Low Priority |

## 1. Primary Mock Data Files (P0 - CRITICAL)

### 1.1 `/src/lib/mockData.ts` (838 lines)
**Status**: PRIMARY MOCK DATA SOURCE - REPLACE

**Contains**:
- Mock Regions (5 Philippine regions)
- Mock Users (5 demo users)
- Mock Drivers (2 drivers)
- Mock Driver Locations (2 locations)
- Mock Bookings (2 bookings)
- Mock Incidents (2 incidents)
- Mock Performance Metrics
- MockDataService class with CRUD operations

**Current Usage**:
- **Regions**: Reasonably realistic (Metro Manila, Cebu, Davao, Boracay, Baguio)
- **Users**: Generic demo accounts with hardcoded passwords
- **Drivers**: Only 2 sample drivers (insufficient)
- **Bookings**: Only 2 sample bookings (insufficient)
- **Locations**: Hardcoded coordinates

**Recommendation**:
- **Keep**: Regions data (already Philippine-specific)
- **Replace**: Expand to 50+ realistic drivers with Philippine names, addresses, and vehicles
- **Replace**: Expand to 100+ realistic bookings with common Manila routes
- **Enhance**: Add realistic performance metrics based on Philippine ridesharing patterns

**Action**:
1. Expand driver data to 50 drivers across Metro Manila barangays
2. Add realistic vehicle types (Toyota Vios, Honda City, Honda Click, etc.)
3. Create 100+ booking samples with actual Manila routes (e.g., "SM North to Ayala Triangle")
4. Add realistic fare amounts (₱40-500 range)

### 1.2 `/src/lib/fraudMockData.ts` (816 lines)
**Status**: FRAUD DETECTION MOCK DATA - REPLACE/ENHANCE

**Contains**:
- Enhanced Passengers with fraud profiles (4 passengers)
- Payment Fraud Analytics (2 transactions)
- Fraud Alerts (3 alerts)
- Collusion Detection (1 case)
- Enhanced Drivers with fraud scores (3 drivers)
- Chargeback Management (1 case)
- Passenger Behavioral Analytics (2 profiles)
- Fraud Investigations (1 case)

**Current Usage**:
- Fraud scoring algorithms
- ML model training data
- Investigation workflow demos
- Analytics dashboard displays

**Recommendation**:
- **Expand**: Add 20+ diverse fraud scenarios
- **Enhance**: Use realistic Philippine fraud patterns (common scams, payment issues)
- **Add**: Region-specific fraud indicators (Metro Manila hotspots, tourist area scams)

**Action**:
1. Create diverse fraud profiles (account sharing, fake bookings, payment fraud)
2. Add Philippine-specific fraud indicators (GCash fraud, stolen phones)
3. Include realistic investigation timelines
4. Add regional fraud patterns

## 2. Database Seed Data (P1 - HIGH)

### 2.1 `/database/seeds/001_sample_data.sql` (600+ lines)
**Status**: GOOD FOUNDATION - ENHANCE

**Contains**:
- 100 drivers across 5 regions (realistic distribution)
- Uses generate_series for bulk data
- Philippine names, regions, and addresses
- Realistic vehicle types

**Current State**:
- ✅ Already uses realistic Philippine regions
- ✅ Already uses common Filipino names
- ✅ Already uses realistic barangays and cities
- ✅ Already uses common Philippine vehicle makes (Toyota, Honda, etc.)

**Gaps**:
- No booking seed data
- No passenger seed data
- No incident seed data
- Limited location diversity within Metro Manila

**Recommendation**: **ENHANCE EXISTING** - This is already production-quality!

**Action**:
1. Add passenger seed data (50+ passengers)
2. Add booking seed data (200+ bookings)
3. Add realistic incident seed data (20+ incidents)
4. Enhance Metro Manila locations with actual barangays:
   - Quezon City: Diliman, Commonwealth, Fairview, Novaliches
   - Manila: Ermita, Malate, Sampaloc, Tondo
   - Makati: Poblacion, Bel-Air, Urdaneta, San Lorenzo
   - Taguig: BGC, Fort Bonifacio, Upper Bicutan
   - Pasig: Kapitolyo, Ortigas, Rosario

## 3. Test Fixtures (P2 - MAINTAIN)

### Files Identified:
- `__tests__/e2e/payment-flows.spec.ts` - Payment test data
- `__tests__/e2e/driver-workflow.spec.ts` - Driver test scenarios
- `__tests__/e2e/auth-flow.spec.ts` - Authentication test data
- `src/__tests__/ridesharing/*.test.ts` - Unit test fixtures

**Status**: **KEEP AS-IS** - Test fixtures are intentionally mock data

**Rationale**:
- Tests require predictable, controlled data
- Mock data ensures test reliability
- Test data should remain isolated from production seeds

**Recommendation**: **NO CHANGE NEEDED** - Test data is appropriate

## 4. API Documentation Examples (P3 - LOW PRIORITY)

### Files Identified:
- `API_DOCUMENTATION.md` - Example requests/responses
- `docs/coordination/*.md` - Documentation examples
- `docs/*.md` - Integration guides

**Status**: Documentation examples are acceptable mock data

**Recommendation**: **ENHANCE GRADUALLY** - Update with more realistic examples when time permits

## 5. Frontend Component Mock Data

### Files with Component-Level Mock Data:
- `src/components/features/*.tsx` - Demo table data
- `src/app/*/page.tsx` - Page-level mock data for demos

**Analysis**:
- Some components use inline mock data for demonstrations
- Most production pages should use API calls, not mock data

**Recommendation**:
1. Verify all pages use API routes, not inline mock data
2. Remove component-level mock data where APIs exist
3. Update demo components to use mockData.ts consistently

## Implementation Priority

### Phase 1: Critical Mock Data Replacement (6 hours)
**Target**: Issue #9 completion

1. ✅ **Audit Complete** (2 hours)
   - Identified all mock data sources
   - Categorized by priority
   - Created this report

2. **Enhance `/src/lib/mockData.ts`** (4 hours)
   - Expand drivers to 50+ with realistic Metro Manila data
   - Add 100+ bookings with actual Manila routes
   - Add realistic fare calculations
   - Enhance performance metrics

### Phase 2: Database Seeding Enhancement (4 hours)

3. **Enhance `/database/seeds/001_sample_data.sql`** (2 hours)
   - Add passenger seed data (50 passengers)
   - Add booking seed data (200 bookings)
   - Add incident seed data (20 incidents)

4. **Create Specialized Seed Scripts** (2 hours)
   - `002_realistic_bookings.sql` - Common Manila routes
   - `003_passenger_data.sql` - Realistic passengers
   - `004_incident_scenarios.sql` - Emergency scenarios

### Phase 3: Testing & Validation (2 hours)

5. **Update Tests** (1 hour)
   - Verify tests still pass with enhanced data
   - Update test expectations if needed

6. **Documentation** (1 hour)
   - Create data generation utilities guide
   - Document seed script usage
   - Update README with seeding instructions

## Realistic Philippine Data Requirements

### Driver Data
- **Names**: Common Filipino names (Juan, Maria, Jose, Ana, etc.)
- **Addresses**: Real Metro Manila barangays and street patterns
- **Vehicles**:
  - 4-wheel: Toyota Vios, Honda City, Toyota Innova, Mitsubishi Mirage
  - 2-wheel: Honda Click, Yamaha NMAX, Suzuki Raider
- **Phone Numbers**: +639XX-XXXX-XXX format
- **License Types**: Professional driver's license
- **Plate Numbers**: ABC-1234 format

### Booking Data
- **Routes**: Actual Manila routes
  - SM North EDSA → Ayala Triangle (15km, ₱285)
  - NAIA Terminal 3 → Makati CBD (10km, ₱220)
  - Quezon City Circle → BGC (18km, ₱350)
  - Mall of Asia → EDSA Shangri-La (22km, ₱450)
- **Fares**: Philippine peso amounts (₱40-500 typical range)
- **Times**: Consider Metro Manila traffic patterns
  - Rush hours: 7-9 AM, 5-8 PM (higher fares, longer ETAs)
  - Off-peak: 10 AM-4 PM (standard fares)

### Passenger Data
- **Names**: Mix of Filipino, Chinese-Filipino, expat names
- **Locations**: Residential areas (QC, Makati condos), offices (BGC, Ortigas)
- **Payment Methods**: GCash (most common), Cash, Credit Card
- **Booking Patterns**: Commute (home↔work), errands, night out

### Incident Data
- **Types**: Traffic accident, vehicle breakdown, SOS alert, customer complaint
- **Locations**: Common incident areas (EDSA, SLEX, C5)
- **Response Times**: <5 min for critical, <15 min for medium
- **Resolution Patterns**: Philippine emergency services integration

## Data Generation Strategy

### Realistic Data Pools

#### Filipino First Names (Common)
**Male**: Juan, Jose, Pedro, Miguel, Carlos, Roberto, Antonio, Francisco, Ricardo, Ramon
**Female**: Maria, Ana, Rosa, Carmen, Luz, Elena, Sofia, Isabel, Patricia, Cristina

#### Filipino Surnames (Most Common)
Santos, Reyes, Cruz, Bautista, Garcia, Gonzales, Flores, Mendoza, Torres, Ramos, Lopez, Perez, Dela Cruz, Rivera, Fernandez

#### Metro Manila Barangays (By City)

**Quezon City**:
- Diliman, Commonwealth, Fairview, Novaliches, Project 4, Project 6, Project 8
- Cubao, Araneta Center, Balintawak, Kamuning, South Triangle
- Batasan Hills, Holy Spirit, North Fairview, Payatas, Bagong Silangan

**Makati**:
- Poblacion, Bel-Air, Urdaneta, San Lorenzo, Salcedo Village
- Legaspi Village, Magallanes Village, Forbes Park, Dasmariñas Village

**Taguig**:
- BGC (Bonifacio Global City), Fort Bonifacio, Upper Bicutan, Lower Bicutan
- Western Bicutan, Signal Village, Hagonoy, Wawa, Tuktukan

**Manila**:
- Ermita, Malate, Sampaloc, Tondo, Binondo, Quiapo, Intramuros
- Sta. Cruz, Paco, San Miguel, Pandacan, Sta. Ana

**Pasig**:
- Kapitolyo, Ortigas Center, Rosario, Ugong, Caniogan, Maybunga
- San Joaquin, Santolan, Manggahan, Pinagbuhatan

#### Common Manila Streets
- EDSA, C5 Road, Commonwealth Avenue, Quezon Avenue, España Boulevard
- Taft Avenue, Roxas Boulevard, Ayala Avenue, Makati Avenue
- Ortigas Avenue, Shaw Boulevard, Marcos Highway, Katipunan Avenue

#### Popular Pickup/Dropoff Locations
**Malls**: SM North, SM Mall of Asia, SM Megamall, Greenbelt, Trinoma, Gateway Mall
**Transport**: NAIA T1/T2/T3, MRT/LRT Stations, Bus Terminals
**Business**: BGC, Ortigas CBD, Makati CBD, Eastwood City
**Residential**: Condos in Makati, BGC, QC, Taguig
**Landmarks**: Luneta Park, Manila Ocean Park, Rizal Park, Intramuros

#### Vehicle Data (Philippine Market)

**4-Wheel (Cars)**:
- Toyota Vios (most popular, ₱685k new) - White, Silver, Black
- Toyota Wigo (₱518k) - Red, White, Silver
- Honda City (₱958k) - White, Black, Silver
- Mitsubishi Mirage (₱698k) - White, Red, Blue
- Toyota Innova (₱1.2M) - White, Silver, Gray
- Suzuki Ertiga (₱948k) - White, Silver, Blue

**2-Wheel (Motorcycles)**:
- Honda Click 160 (₱104k) - Black, Red, White
- Yamaha NMAX (₱138k) - Gray, Blue, Black
- Suzuki Raider R150 (₱96k) - Black, Red, Blue
- Honda TMX 155 (₱99k) - Black, Red
- Yamaha Mio i125 (₱67k) - Pink, White, Blue

#### Plate Number Patterns
- Cars: ABC-1234, XYZ-5678, NCR-7890
- Motorcycles: 1234-AB, 5678-XY, 9012-NC
- Format: 3 letters + 3-4 numbers OR 4 numbers + 2 letters

## Replacement Scripts Needed

### 1. Data Generation Utility (`/scripts/generate-realistic-data.js`)
```javascript
// Generate Philippine-specific realistic data
// - Random Filipino names
// - Random Metro Manila addresses
// - Random common routes
// - Realistic fare calculations
```

### 2. Database Seed Enhancement (`/scripts/enhance-seed-data.js`)
```javascript
// Enhance existing seed with:
// - 50+ passengers
// - 200+ bookings
// - 20+ incidents
// - Realistic timestamps
```

### 3. Mock Data Validator (`/scripts/validate-mock-data.js`)
```javascript
// Validate that:
// - All mock files use realistic data
// - No placeholder values remain
// - Data matches Philippine context
```

## Success Criteria

### Completion Checklist

- [ ] All primary mock data files enhanced with realistic Philippine data
- [ ] Database seed scripts expanded to 200+ bookings, 50+ passengers
- [ ] Data generation utilities created and documented
- [ ] All tests passing with enhanced mock data
- [ ] Documentation updated with seeding instructions
- [ ] Build verification passes
- [ ] No "TODO", "FIXME", or "placeholder" in primary mock files

### Quality Metrics

- **Driver Data**: 50+ drivers with realistic Philippine profiles
- **Booking Data**: 200+ bookings with actual Manila routes
- **Passenger Data**: 50+ passengers with diverse profiles
- **Incident Data**: 20+ incidents covering all severity levels
- **Location Accuracy**: Real barangays, streets, and landmarks
- **Fare Accuracy**: Realistic Philippine peso amounts (₱40-500 range)
- **Name Accuracy**: Common Filipino names (90%+ match real demographics)

## Conclusion

The OpsTower codebase already has a solid foundation of Philippine-specific data in database seeds. The primary work needed is:

1. **Expand** `/src/lib/mockData.ts` with more realistic and diverse data
2. **Enhance** `/database/seeds/001_sample_data.sql` with passengers, bookings, and incidents
3. **Create** data generation utilities for ongoing realistic data needs
4. **Maintain** existing test fixtures (no changes needed)

**Estimated Total Time**: 12 hours
**Complexity**: Medium (data generation, no algorithm changes)
**Risk**: Low (isolated changes, extensive testing)

---

**Next Steps**: Begin Phase 1 implementation - Enhance `/src/lib/mockData.ts`
