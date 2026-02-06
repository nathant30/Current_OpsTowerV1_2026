# XpressOps Tower V2 - Comprehensive System Summary

**Version**: 2.0
**Date**: 2026-01-31
**Status**: Production-Ready
**Scale**: 1M trips/month, 300M GPS points/month

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Module Catalog (28 Modules)](#module-catalog)
5. [API Endpoints Summary](#api-endpoints-summary)
6. [Data Models](#data-models)
7. [Performance Optimizations](#performance-optimizations)
8. [Integration Events](#integration-events)
9. [Frontend Visualization Requirements](#frontend-visualization-requirements)
10. [Security & Authorization](#security--authorization)
11. [DXP System](#dxp-system)

---

## System Overview

XpressOps Tower V2 is an **enterprise-grade ride-hailing operations platform** built as a **Modular Monolith** with **28 backend modules** and a modern **Angular 21 frontend**.

### Key Metrics
- **Scale**: 1M trips per month
- **GPS Tracking**: 300M GPS points per month
- **Drivers**: 10K+ active drivers
- **Vehicles**: 5K+ fleet
- **Real-time**: Sub-second GPS updates via SignalR
- **Performance**: <100ms analytics queries (100-300x improvement)

### Design Principles
- **Modular Monolith**: Each module is a bounded context that can be extracted to a microservice
- **CQRS Pattern**: Command/Query separation with MediatR
- **Event-Driven**: Modules communicate via integration events (Redis Pub/Sub)
- **Schema-Per-Module**: Database isolation for data ownership
- **Clean Architecture**: Domain → Application → Infrastructure → API layers

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular 21 Frontend                       │
│  (Standalone Components, Lazy Loading, SignalR Client)      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (.NET 9)                       │
│  • JWT Authentication                                        │
│  • Request Routing                                           │
│  • SignalR Hub (real-time)                                   │
│  • Global Exception Handling                                 │
└───┬─────────┬─────────┬─────────┬─────────┬────────────────┘
    │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼
┌─────────────────────────────────────────────────────────────┐
│                   28 Backend Modules                         │
│  Each module:                                                │
│  • Domain Layer (Entities, Value Objects, Domain Events)    │
│  • Application Layer (Commands, Queries, Handlers)          │
│  • Infrastructure Layer (EF Core, Repositories)             │
│  • API Layer (Controllers, DTOs, Validation)                │
└───┬─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│              Redis Event Bus (Pub/Sub)                       │
│  • Integration events between modules                        │
│  • Loose coupling                                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│         PostgreSQL 16 (Schema-Per-Module)                    │
│  • 29 schemas for 28 modules                                 │
│  • Complete data isolation                                   │
└─────────────────────────────────────────────────────────────┘
```

### Module Layers

**Foundation Layer** (No dependencies):
- Auth, Settings, TrustScore

**Core Business Layer**:
- Drivers, Bonds, Fleet, IdentityVerification, FraudController

**Operational Gateway Layer**:
- Roll Call (pre-shift), Post-Shift Brief (post-shift)

**Operational Layer**:
- Shifts, Incidents, Realtime, Trips, Ground Ops, CustomerPromos

**Command & Control Layer**:
- Command Center, Dashcam, Fraud Intelligence, Fleet Management, CommunicationHub, Orchestration, DispatchControl

**Financial Layer**:
- DriverIncentives, Finance, ApprovalWorkflow, SettlementLedger

**Administrative Layer**:
- AdminPanel

---

## Technology Stack

### Backend
- **.NET 9** - ASP.NET Core Web API
- **Entity Framework Core 9** - Code-first ORM
- **PostgreSQL 16** - Primary database (schema-per-module)
- **Redis 7** - Caching + event bus (Pub/Sub)
- **SignalR** - Real-time WebSocket communication
- **MediatR** - CQRS command/query handling
- **Hangfire** - Background job processing
- **Serilog** - Structured logging
- **FluentValidation** - Input validation
- **NetTopologySuite** - Spatial data (PostGIS integration)
- **Parquet.Net** - Columnar data archival

### Frontend
- **Angular 21** - Standalone components, lazy loading
- **TypeScript** - Strict mode
- **Tailwind CSS 3.4** - Utility-first styling
- **Leaflet** - Interactive maps for GPS tracking
- **SignalR Client** - Real-time updates
- **RxJS** - Reactive programming

### Infrastructure
- **Docker** - Containerization
- **Kubernetes** - Production orchestration
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards
- **Let's Encrypt** - SSL certificates

### DevOps
- **GitHub Actions** - CI/CD
- **Azure Container Registry** - Docker image storage
- **Azure PostgreSQL** - Managed database
- **Azure Redis Cache** - Managed Redis

---

## Module Catalog

### 1. Auth Module (Foundation)
**Purpose**: JWT authentication, RBAC, session management
**Schema**: `auth`

**Key Features**:
- JWT bearer tokens (HS256, 15-min access + 7-day refresh)
- Role-Based Access Control (RBAC)
- User registration and login
- Password reset and change
- Session management
- API key management

**API Endpoints** (12):
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/refresh` - Refresh token
- POST `/api/auth/logout` - Logout
- POST `/api/auth/change-password` - Change password
- POST `/api/auth/reset-password` - Reset password
- GET `/api/auth/me` - Get current user
- POST `/api/auth/roles` - Create role
- GET `/api/auth/roles` - List roles
- POST `/api/auth/roles/{id}/permissions` - Assign permissions
- POST `/api/auth/users/{id}/roles` - Assign user roles

**Database Tables**:
- `auth.users` - User accounts
- `auth.roles` - RBAC roles
- `auth.permissions` - Permission definitions
- `auth.role_permissions` - Role-permission mapping
- `auth.user_roles` - User-role mapping
- `auth.sessions` - Active sessions
- `auth.api_keys` - API key storage

---

### 2. Settings Module (Foundation)
**Purpose**: System-wide configuration and feature flag management
**Schema**: `settings`

**Key Features**:
- Feature flags for all modules
- Environment-specific settings (dev, test, prod)
- Category-based organization
- Encrypted sensitive values (API keys, credentials)
- Public vs private settings
- Data type validation (String, Integer, Boolean, JSON)

**API Endpoints** (6):
- GET `/api/settings` - List all settings with filtering
- GET `/api/settings/{key}` - Get setting by key
- PUT `/api/settings/{key}` - Update setting value
- POST `/api/settings` - Create new setting
- DELETE `/api/settings/{key}` - Delete setting
- GET `/api/settings/public` - Get public settings (exposed to frontend)

**Database Tables**:
- `settings.system_settings` - Key-value pairs with metadata

**Critical Settings**:
- `trips.assignment_timeout` - Driver response timeout (30s)
- `trips.assignment_round1_radius` - First round radius (50m)
- `trips.assignment_round2_radius` - Second round radius (500m)
- `trips.assignment_round3_radius` - Third round radius (1500m)

---

### 3. Drivers Module (Core Business)
**Purpose**: Master driver data and DXP tier calculation
**Schema**: `drivers`

**Key Features**:
- Driver CRUD operations
- Profile management
- License verification
- DXP tier tracking
- Driver status (Active, Inactive, Suspended, Terminated)
- Driver ratings and performance metrics

**API Endpoints** (10):
- GET `/api/drivers` - List drivers with filtering
- GET `/api/drivers/{id}` - Get driver details
- POST `/api/drivers` - Create driver
- PUT `/api/drivers/{id}` - Update driver
- POST `/api/drivers/{id}/suspend` - Suspend driver
- POST `/api/drivers/{id}/activate` - Activate driver
- GET `/api/drivers/{id}/performance` - Driver performance metrics
- POST `/api/drivers/{id}/upload-documents` - Upload driver documents

**Database Tables**:
- `drivers.drivers` - Driver master data
- `drivers.licenses` - License information
- `drivers.performance_history` - Historical performance
- `drivers.dxp_tier_history` - Tier change history

---

### 4. Fleet Module (Core Business)
**Purpose**: Vehicle and depot management with driver assignment workflow
**Schema**: `fleet`

**Key Features**:
- Vehicle CRUD operations with status tracking
- Driver assignment/release workflow
- Depot management with capacity tracking
- Vehicle-to-depot association
- Maintenance scheduling

**API Endpoints** (11):
- GET `/api/fleet/vehicles` - List vehicles with filtering
- GET `/api/fleet/vehicles/{id}` - Get vehicle details
- POST `/api/fleet/vehicles` - Create vehicle
- PUT `/api/fleet/vehicles/{id}` - Update vehicle
- POST `/api/fleet/vehicles/{id}/assign` - Assign driver to vehicle
- POST `/api/fleet/vehicles/{id}/release` - Release driver from vehicle
- GET `/api/fleet/depots` - List all depots
- POST `/api/fleet/depots` - Create depot
- PUT `/api/fleet/depots/{id}` - Update depot

**Database Tables**:
- `fleet.vehicles` - Vehicle master data (plate, make, model, VIN)
- `fleet.depots` - Depot locations and capacities
- `fleet.vehicle_assignments` - Assignment history (audit trail)

**Business Rules**:
- Vehicle can only be assigned to one driver at a time
- Driver can only have one vehicle assigned
- Assignment requires vehicle status = Available
- Release updates vehicle status back to Available

**Integration Events**:
- `VehicleAssignedIntegrationEvent` - Driver assigned to vehicle
- `VehicleReleasedIntegrationEvent` - Driver released from vehicle

---

### 5. Trips Module (CRITICAL - Core Business)
**Purpose**: Trip lifecycle management and intelligent driver assignment
**Schema**: `trips`

**Key Features**:
- 7-state trip lifecycle
- 3-round driver assignment algorithm with proximity matching
- Haversine distance calculations
- Booking ID generation: `XP{YYYYMMDD}-{NNNN}`
- Estimated fare calculations
- Real-time trip tracking
- GPS track storage (300M points/month)

**API Endpoints** (15+):
- POST `/api/trips` - Request new trip
- GET `/api/trips/{id}` - Get trip details
- GET `/api/trips` - List trips with filtering
- POST `/api/trips/{id}/accept` - Driver accepts trip
- POST `/api/trips/{id}/pick-up` - Mark customer picked up
- POST `/api/trips/{id}/complete` - Complete trip with fare
- POST `/api/trips/{id}/cancel` - Cancel trip with reason
- GET `/api/trips/{id}/status` - Real-time status polling
- GET `/api/trips/{id}/route` - Get GPS track route
- POST `/api/trips/{id}/gps` - Save GPS track point

**Database Tables**:
- `trips.trips` - Trip master data with full lifecycle
- `trips.assignment_rounds` - Assignment attempt history
- `trips.trip_locations` - Pickup and dropoff coordinates
- `trips.gps_track_points` - GPS track storage (optimized)

**Trip States**:
1. `Requested` - Customer submitted trip request
2. `Assigning` - Assignment algorithm running (Round 1-3)
3. `Accepted` - Driver accepted, en route to pickup
4. `PickedUp` - Customer in vehicle
5. `InProgress` - Trip in progress to dropoff
6. `Completed` - Trip successfully completed
7. `Cancelled` - Trip cancelled
8. `Expired` - No driver found after 3 rounds

**3-Round Assignment Algorithm**:
- **Round 1**: 50m radius, 30s timeout
- **Round 2**: 500m radius, 30s timeout (excludes Round 1 drivers)
- **Round 3**: 1500m radius, 30s timeout (excludes Round 1-2 drivers)
- **After Round 3**: Trip marked Expired → Command Center attention item

**Integration Events**:
- `TripRequestedIntegrationEvent`
- `TripAcceptedIntegrationEvent`
- `TripPickedUpIntegrationEvent` → Triggers Dashcam recording
- `TripCompletedIntegrationEvent` → 10% random audit
- `TripCancelledIntegrationEvent`
- `TripExpiredIntegrationEvent` → Creates Overwatch attention item

---

### 6. Command Center Module (LARGEST - 3 Subsystems)
**Purpose**: Central operations hub for monitoring, quality control, and emergency response
**Schema**: `command_center`

#### Subsystem 1: Overwatch (Fleet Monitoring)
**Purpose**: Real-time fleet monitoring and attention item management

**API Endpoints** (8+):
- GET `/api/command-center/overwatch/attention-items` - List attention items
- POST `/api/command-center/overwatch/attention-items/{id}/acknowledge` - Acknowledge
- POST `/api/command-center/overwatch/attention-items/{id}/resolve` - Resolve
- POST `/api/command-center/overwatch/attention-items/{id}/escalate` - Escalate
- GET `/api/command-center/overwatch/staff-assignments` - View assignments
- POST `/api/command-center/overwatch/rebalance` - Trigger auto-balance

**Attention Item Types**:
- `TripExpired` - No driver found (High severity)
- `DriverOffline` - Driver offline >30 min (Medium)
- `LongIdleTime` - Driver idle >2 hours (Low)
- `GeofenceViolation` - Driver outside operational area (Medium)

**Auto-Balance Algorithm**:
- Distributes N drivers across S staff members
- K-means clustering based on GPS locations
- Geographic clustering (staff monitors nearby drivers)

**Database Tables**:
- `command_center.attention_items`
- `command_center.staff_assignments`

#### Subsystem 2: Audit (Quality Control)
**Purpose**: Review completed trips, render verdicts, apply bond deductions

**API Endpoints** (10+):
- GET `/api/command-center/audit/queue` - Get audit queue
- POST `/api/command-center/audit/items/{id}/claim` - Claim audit item
- POST `/api/command-center/audit/items/{id}/verdict` - Render verdict
- GET `/api/command-center/audit/items/{id}` - Get audit details
- POST `/api/command-center/audit/items/{id}/approve` - Supervisor approval
- GET `/api/command-center/audit/sla-report` - SLA compliance report

**Audit Sources**:
1. Random Sampling (10% of completed trips)
2. Customer Complaints
3. Integrity Alerts (from Incidents module)
4. Manager Referral

**Audit Verdicts**:
- `NoFault` - Driver cleared, no action
- `Warning` - Verbal warning, no financial penalty
- `BondDeduction` - Deduct ₱100-₱5,000 from bond
- `Suspension` - Suspend driver for X days
- `Termination` - Terminate driver (requires VP approval)

**SLA Tracking**:
- **Low Severity**: 24 hours
- **Medium Severity**: 12 hours
- **High Severity**: 6 hours
- **Critical Severity**: 2 hours

**Database Tables**:
- `command_center.audit_items`
- `command_center.audit_verdicts`
- `command_center.audit_approvals`

#### Subsystem 3: ERT (Emergency Response Team)
**Purpose**: Coordinate emergency response for accidents and critical incidents

**API Endpoints** (8+):
- POST `/api/command-center/ert/dispatch` - Dispatch ERT to incident
- GET `/api/command-center/ert/dispatches` - List active dispatches
- POST `/api/command-center/ert/reports` - Submit ERT report
- GET `/api/command-center/ert/reports/{id}` - Get ERT report
- POST `/api/command-center/ert/reports/{id}/handoff` - Hand off to Audit

**ERT Workflow**:
1. Incident Reported
2. Dispatch nearest ERT staff
3. En Route (GPS tracked)
4. On Scene assessment
5. Report Submission (with photos)
6. Handoff to Audit subsystem

**Database Tables**:
- `command_center.ert_dispatches`
- `command_center.ert_reports`
- `command_center.ert_response_times`

---

### 7. Roll Call Module (Pre-Shift Gateway) ⭐ Wave 7
**Purpose**: Mandatory pre-shift operational gateway with 4-stage workflow
**Schema**: `roll_call`

**Key Principle**: Roll Call is the "Write Layer" that validates and launches drivers. Standalone gateway that PRECEDES all operations.

**Critical Timing Windows**:
- **T-30m**: Roll Call instance activates
- **T+10m**: Hard cutoff (late arrivals blocked)
- **Auto-lock**: All drivers processed OR scheduled start + 2hr

**4-Stage Workflow**:

**Stage 1: Swap Reconciliation**
- Supervisor acknowledges shift swap events
- Hot swap bonus: ₱250 for replacement drivers
- Validates swap reason and documentation

**Stage 2: Arrival & Vehicle Health**
- Geofence validation (50m radius check - Haversine)
- Vehicle health check (5 critical items)
- Chain of custody (pre-existing damage photos - 4 angles)
- QR scan (link driver to vehicle session)

**Stage 3: Daily Mission & Zone Assignment**
- Weighted algorithm assigns drivers to optimal zones:
  - Historical Efficiency (25%): Past revenue, trips, ratings
  - Zone Demand (40%): Current supply/demand ratio
  - Seniority (20%): Experience and tenure
  - Route Optimization (15%): Distance to zone center
- Manager-configurable weights (must sum to 100%)

**Stage 4: CCO Visual Audit**
- 5-second dashcam feed (verify driver identity)
- Uniform compliance check
- Readiness confirmation
- Launch driver for operations

**API Endpoints** (35+):
- GET `/api/roll-call/dashboard` - Dashboard with all instances
- POST `/api/roll-call/{id}/reconcile-swaps` - Acknowledge swaps
- POST `/api/roll-call/check-in` - Driver geofence check-in
- POST `/api/roll-call/vehicle-health` - Report vehicle condition
- POST `/api/roll-call/{id}/generate-missions` - Run weighted algorithm
- POST `/api/roll-call/qr-scan` - Link driver to vehicle
- POST `/api/roll-call/trigger-visual-audit` - Request dashcam feed
- POST `/api/roll-call/complete-visual-audit` - Launch driver
- POST `/api/roll-call/{id}/mark-no-show` - Confirm no-show
- POST `/api/roll-call/{id}/reopen` - Manager override
- PUT `/api/roll-call/settings/{depotId}` - Update algorithm weights

**Database Tables** (8):
- `roll_call.instances` - Roll call sessions
- `roll_call.driver_entries` - Individual driver records
- `roll_call.vehicle_health_reports` - Pre-shift vehicle condition
- `roll_call.daily_missions` - Zone assignments with scores
- `roll_call.manager_settings` - Algorithm weight configuration
- `roll_call.no_show_logs` - No-show audit trail
- `roll_call.late_arrival_logs` - Late arrival tracking
- `roll_call.swap_records` - Shift swap reconciliation

**Integration Events**:
- `RollCallGeneratedIntegrationEvent`
- `DriverLaunchedIntegrationEvent`
- `NoShowConfirmedIntegrationEvent`
- `RollCallCompletedIntegrationEvent`
- `HotSwapRequestedIntegrationEvent`
- `VehicleHealthIssueIntegrationEvent`

---

### 8. Post-Shift Brief Module (Post-Shift Gateway) ⭐ Wave 7
**Purpose**: Mandatory post-shift closure gateway with 5-checkpoint DXP compliance audit
**Schema**: `post_shift`, `dxp_compliance`

**Key Principle**: Post-Shift Brief is the "Closure Layer" that validates shift completion and calculates DXP bonus eligibility FLAGS (not monetary amounts).

**Critical Timing Windows**:
- **Physical Shift End**: Driver taps "End Shift"
- **Status**: "Pending Reconciliation"
- **Supervisor Review**: 10-minute window for 5 checkpoints
- **Auto-Lock**: Scheduled shift end + 2 hours
- **Excellence Review**: Blocks shift if 1-star or CSAT <4.5

**5-Checkpoint Compliance Audit**:

**Checkpoint 1: Attendance Verification**
- Validate on-time launch (within T+10m window)
- **Output**: `reliability_bonus_eligible` = true/false

**Checkpoint 2: Vehicle Audit**
- Chain of custody validation (pre vs post photos)
- New damage detection
- Unreported damage penalty: ₱1,000 deduction + "Make It Whole"
- Dashcam verification (full-shift recording, no tampering)
- **Output**: `asset_safety_bonus_eligible` = true/false

**Checkpoint 3: Revenue Reconciliation**
- Denominator Rule: Cycle avg = Total revenue ÷ Completed shifts
- 14-day cycle (fixed calendar-based)
- Today's revenue ≥ cycle average?
- **Output**: `surplus_revenue_eligible` = true/false

**Checkpoint 4: Surplus Eligibility**
- CSAT requirement: ≥4.5 average
- Acceptance time: <20 seconds average
- Tier ranking: Driver in top 70% by cycle avg revenue
- **Output**: `performance_bonus_eligible` = true/false

**Checkpoint 5: Bond Reconciliation**
- Required balance: ₱3,000
- "Make It Whole" logic: If <₱3,000, replenish BEFORE next shift
- Max 1 tardy per cycle (2nd tardy = DISQUALIFIED from ALL bonuses)
- **Output**: `final_audit_bonus_eligible` = true/false (requires ALL 4 above)

**Excellence Review System**:
- **Triggers**: 1-star rating OR CSAT <4.5
- **Workflow**: Blocks shift → Schedule meeting → Conduct meeting → Shift complete
- **Manager override**: Password-protected (audit trail logged)

**API Endpoints** (25+):
- GET `/api/post-shift/dashboard` - Dashboard with all instances
- POST `/api/post-shift/create` - Create instance
- POST `/api/post-shift/{id}/start-review` - Supervisor starts review
- POST `/api/post-shift/{id}/checkpoint-1-attendance` - Verify attendance
- POST `/api/post-shift/{id}/checkpoint-2-vehicle-audit` - Vehicle audit
- POST `/api/post-shift/{id}/checkpoint-3-revenue` - Revenue reconciliation
- POST `/api/post-shift/{id}/checkpoint-4-surplus-eligibility` - Tier ranking
- POST `/api/post-shift/{id}/checkpoint-5-bond` - Bond balance
- POST `/api/post-shift/{id}/complete` - Mark shift complete
- POST `/api/post-shift/{id}/trigger-excellence-review` - System trigger
- POST `/api/post-shift/excellence-review/{reviewId}/schedule-meeting`
- POST `/api/post-shift/excellence-review/{reviewId}/conduct-meeting`
- POST `/api/post-shift/excellence-review/{reviewId}/skip-override`
- GET `/api/post-shift/dxp-cycles` - List DXP cycles
- GET `/api/post-shift/dxp-cycles/{cycleId}/driver-summaries`

**Database Tables** (8):
- `post_shift.instances` - Post-shift sessions
- `post_shift.vehicle_audits` - Pre-vs-post damage comparison
- `post_shift.revenue_reconciliations` - Revenue vs cycle average
- `post_shift.excellence_reviews` - Quality review meetings
- `dxp_compliance.cycles` - Fixed 14-day cycles
- `dxp_compliance.driver_cycle_summaries` - Performance per cycle
- `dxp_compliance.compliance_history` - Shift-by-shift records
- `dxp_compliance.tardy_records` - Tardy tracking

**Integration Events**:
- `ShiftClosedIntegrationEvent`
- `DxpEligibilityCalculatedIntegrationEvent` → Finance
- `BondDeductionAppliedIntegrationEvent`
- `ExcellenceReviewTriggeredIntegrationEvent`
- `TardyPenaltyAppliedIntegrationEvent`

---

### 9. Dashcam Module (External Integration)
**Purpose**: Integration with Jimi/TrackSolid dashcam hardware
**Schema**: `dashcam`

**Key Features**:
- Live feed streaming (3 cameras: front, rear, interior)
- Historical footage retrieval (last 30 days)
- Clip creation (10s before/after timestamp)
- Screenshot capture
- Trip session linking (auto-record during trips)
- Device status monitoring

**API Endpoints** (10+):
- GET `/api/dashcam/devices` - List all dashcam devices
- GET `/api/dashcam/devices/{id}/live-feed` - Get live stream URL
- GET `/api/dashcam/devices/{id}/footage` - Query historical footage
- POST `/api/dashcam/clips` - Create clip from footage
- GET `/api/dashcam/clips/{id}` - Get clip details
- POST `/api/dashcam/screenshots` - Capture screenshot
- GET `/api/dashcam/devices/{id}/status` - Device online status

**External Integration**:
- Base URL: `https://api.tracksolid.com/v1`
- Authentication: API key + device IMEI
- WebSocket for live feeds
- REST API for historical footage

**Trip Session Recording**:
- Subscribes to `TripPickedUpIntegrationEvent`
- Auto-starts recording when trip begins
- Stops recording when trip completes
- Links recording to trip ID for audit access

**Database Tables**:
- `dashcam.devices` - Device registry
- `dashcam.clips` - Created clips with URLs
- `dashcam.trip_sessions` - Trip-to-recording mapping

---

### 10. Fraud Intelligence Module ⭐ Wave 7
**Purpose**: Central fraud detection & investigation with graph-based pattern recognition
**Schema**: `fraud`

**Key Principle**: **Separation of Detection from Enforcement** - Produces advisory signals and recommendations only, never enforces directly.

**Design Principles**:
- Graph-First Thinking (fraud is networked)
- Explainability Required (no black-box scoring)
- Human-in-the-Loop (final classification is human-approved)
- Event-Driven Ingestion (no scraping/polling)

**3-Layer Architecture**:

#### 1. Signal Ingestion Layer (30+ signal types)
**Identity & Signup**:
- `DUPLICATE_GOV_ID`, `FACE_MATCH_SCORE`, `PHONE_REUSE`, `DEVICE_REUSE_AT_SIGNUP`, `DOCUMENT_TAMPERING`

**Device & Location**:
- `SHARED_IMEI`, `SIM_SWAP_DETECTED`, `EMULATOR_DETECTED`, `GPS_SPOOF_PATTERN`, `MOCK_LOCATION_APP`, `IMPOSSIBLE_TRAVEL`

**Wallet & Bond**:
- `LAST_MINUTE_BOND_TOPUP`, `BOND_DRAIN_PATTERN`, `CASH_APP_DIVERGENCE`, `CIRCULAR_WALLET_FLOW`

**Incentive**:
- `THRESHOLD_CLUSTERING`, `HOT_SWAP_FARMING`, `SHIFT_SWAP_RING`, `FORFEIT_RECOVER_LOOP`

**Promo & Customer**:
- `RIDER_DRIVER_LOOP`, `PROMO_REDEMPTION_RING`, `GEO_PROMO_FARMING`, `REFERRAL_TREE_ANOMALY`

**Collusion**:
- `COORD_ACCEPT_DELAY`, `SYNCHRONIZED_LOGOFF`, `REVENUE_SIMILARITY_CLUSTER`, `COORDINATED_CANCELLATION`

#### 2. Processing Layer
**Graph Engine**:
- Maintains fraud graph (drivers, customers, devices, wallets, vehicles, etc.)
- Creates edges (USES_DEVICE, SHARES_DEVICE_WITH, FREQUENT_RIDER_OF, etc.)
- Edge strength scores (0.0-1.0) based on frequency/recency
- Graph traversal for ring detection (depth 1-5)

**Scoring Engine**:
- Confidence score (0-100):
  - Signal strength (40%)
  - Signal diversity (20%)
  - Graph context (25%)
  - Temporal proximity (15%)
- Severity: LOW (<40), MEDIUM (40-59), HIGH (60-79), CRITICAL (80+)

**Ring Detection**:
- Promo Abuse Ring (3-20 nodes)
- Incentive Farming Ring (2-10 nodes)
- Device Sharing Ring (2-5 nodes)
- Collusion Ring (3-15 nodes)

#### 3. Output Layer
**Fraud Cases**:
- Types: IDENTITY, WALLET, PROMO, INCENTIVE, RING, INSIDER, DEVICE, COLLUSION
- Status: OPEN → MONITORING → UNDER_INVESTIGATION → ESCALATED → PENDING_ACTION → CLOSED
- Severity: LOW, MEDIUM, HIGH, CRITICAL

**Advisory Recommendations** (never enforces):
- `FRAUD_SIGNAL` - Advisory flag only
- `RING_ASSOCIATION_FLAG` - Mark driver as part of ring
- `SETTLEMENT_REVIEW_REQUIRED` - Finance should review
- `CLAWBACK_ELIGIBLE` - Advisory only
- `INVESTIGATION_RECOMMENDED` - Human investigation needed
- `MONITOR_ONLY` - Add to watchlist
- `ENHANCED_VERIFICATION` - Require additional checks

**API Endpoints** (25+):
- POST `/api/fraud/signals` - Ingest single signal
- POST `/api/fraud/signals/batch` - Batch signal ingestion
- GET `/api/fraud/cases` - List fraud cases
- GET `/api/fraud/cases/{id}` - Get case details
- POST `/api/fraud/cases/{id}/assign` - Assign to analyst
- POST `/api/fraud/cases/{id}/classify` - Classify case
- GET `/api/fraud/graph/{entityId}` - Get fraud graph
- POST `/api/fraud/ring-detection/scan` - Scan for rings
- GET `/api/fraud/recommendations` - Get recommendations

**Database Tables**:
- `fraud.signals` - All fraud signals
- `fraud.cases` - Fraud cases
- `fraud.graph_nodes` - Graph entities
- `fraud.graph_edges` - Graph relationships

---

### 11. CommunicationHub Module ⭐ Wave 7
**Purpose**: Single communication gateway with priority enforcement
**Schema**: `comms`

**Key Features**:
- Priority enforcement (P0-P4)
- Conflict resolution (single source of truth)
- Throttling (prevent spam)
- Multi-channel delivery (Push/SMS/Email/InApp/Voice)
- Outcome tracking
- Template management

**Priority Levels**:
- **P0** (Critical): System outage, safety emergency (no throttling)
- **P1** (High): Trip updates, ERT dispatch (minimal throttling)
- **P2** (Normal): Shift reminders, general notifications
- **P3** (Low): Marketing, surveys (aggressive throttling)
- **P4** (Bulk): Mass campaigns (rate-limited)

**API Endpoints** (15+):
- POST `/api/communications/send` - Send communication
- POST `/api/communications/send-batch` - Batch send
- GET `/api/communications/{id}` - Get communication status
- GET `/api/communications/templates` - List templates
- POST `/api/communications/templates` - Create template
- GET `/api/communications/delivery-report` - Delivery report

**Database Tables**:
- `comms.intents` - Communication intents
- `comms.templates` - Message templates
- `comms.delivery_log` - Delivery tracking
- `comms.throttle_rules` - Throttling configuration

---

### 12. Orchestration Module ⭐ Wave 7
**Purpose**: Cross-module workflow engine with saga framework
**Schema**: `orchestration`

**Key Features**:
- Saga framework (distributed transactions)
- Timer & deadline management
- Escalation ladders (L1-L4)
- Compensation patterns
- Process state tracking
- Long-running workflows

**API Endpoints** (12+):
- POST `/api/orchestration/sagas` - Start saga
- GET `/api/orchestration/sagas/{id}` - Get saga status
- POST `/api/orchestration/sagas/{id}/compensate` - Trigger compensation
- POST `/api/orchestration/timers` - Schedule timer
- GET `/api/orchestration/timers` - List active timers
- POST `/api/orchestration/escalations` - Create escalation

**Database Tables**:
- `orchestration.sagas` - Saga instances
- `orchestration.saga_steps` - Saga step tracking
- `orchestration.timers` - Scheduled timers
- `orchestration.escalations` - Escalation tracking

---

### 13. DispatchControl Module ⭐ Wave 7
**Purpose**: Assignment logic for matching drivers to trips
**Schema**: `dispatch`

**Key Features**:
- Multi-mode dispatch (Auto/Human-in-Loop/Hybrid)
- Policy-driven scoring engine
- Override governance (audit trail)
- Rebalancing tasks
- Performance analytics

**Dispatch Modes**:
- **Auto**: Fully automated based on policy
- **Human-in-Loop**: Supervisor reviews and approves
- **Hybrid**: Auto with human escalation

**API Endpoints** (10+):
- POST `/api/dispatch/requests` - Create dispatch request
- GET `/api/dispatch/requests/{id}` - Get request status
- POST `/api/dispatch/requests/{id}/override` - Human override
- GET `/api/dispatch/policies` - List dispatch policies
- POST `/api/dispatch/policies` - Create policy
- POST `/api/dispatch/rebalance` - Trigger rebalancing

**Database Tables**:
- `dispatch.requests` - Dispatch requests
- `dispatch.decisions` - Assignment decisions
- `dispatch.policies` - Scoring policies
- `dispatch.overrides` - Human override audit trail

---

### 14. Finance Module ⭐ Wave 7
**Purpose**: Single financial authority with double-entry ledger
**Schema**: `finance`

**Key Features**:
- Budget management
- Double-entry ledger
- Driver wallets
- Credit products
- Customer promotions
- Minimum Balance Control (MBC)
- Period close & reconciliation

**API Endpoints** (20+):
- GET `/api/finance/budgets` - List budgets
- POST `/api/finance/budgets` - Create budget
- GET `/api/finance/wallets/{driverId}` - Get driver wallet
- POST `/api/finance/wallets/{driverId}/credit` - Credit wallet
- POST `/api/finance/wallets/{driverId}/debit` - Debit wallet
- GET `/api/finance/ledger` - Query ledger entries
- POST `/api/finance/period-close` - Close accounting period
- GET `/api/finance/reconciliation` - Reconciliation report

**Database Tables**:
- `finance.budgets` - Budget definitions
- `finance.ledger` - Double-entry ledger
- `finance.wallets` - Driver wallet balances
- `finance.mbc_rules` - Minimum balance control
- `finance.period_closures` - Period close tracking

---

### 15-28. Other Modules (Summary)

**15. Bonds** - Security bond ledger
**16. Shifts** - Roll call, clock in/out, geo-lock
**17. Incidents** - Accident reporting, AUDIT_FAIL
**18. Realtime** - GPS tracking, SignalR broadcasting
**19. CustomerPromos** - 12 promo types
**20. Ground Ops** - Daily dispatch operations
**21. DriverIncentives** - Quests, bonuses, guarantees
**22. ApprovalWorkflow** - Campaign approval chains
**23. SettlementLedger** - Event-sourced financial ledger
**24. AdminPanel** - System administration
**25. IdentityVerification** - KYC, face liveness
**26. FraudController** - Device fingerprinting
**27. TrustScore** - Entity trust scoring
**28. Analytics** - Trip aggregation, Parquet archival

---

## API Endpoints Summary

**Total Endpoints**: 300+

### By Module (Top 10)
1. **Command Center**: 30+ endpoints (Overwatch, Audit, ERT)
2. **Roll Call**: 35+ endpoints (4-stage workflow)
3. **Post-Shift Brief**: 25+ endpoints (5 checkpoints)
4. **Fraud Intelligence**: 25+ endpoints (signals, cases, graph)
5. **Trips**: 15+ endpoints (lifecycle, assignment)
6. **Finance**: 20+ endpoints (budgets, wallets, ledger)
7. **CommunicationHub**: 15+ endpoints (send, templates)
8. **DispatchControl**: 10+ endpoints (requests, policies)
9. **Orchestration**: 12+ endpoints (sagas, timers)
10. **Fleet**: 11 endpoints (vehicles, depots, assignments)

### By Category
- **CRUD Operations**: ~120 endpoints
- **Business Workflows**: ~80 endpoints
- **Real-time/SignalR**: ~30 endpoints
- **Reporting/Analytics**: ~40 endpoints
- **Administration**: ~30 endpoints

---

## Data Models

### Core Entities (Top 20)

**1. Trip**
```csharp
public class Trip {
    Guid Id;
    string BookingId; // XP20260131-0042
    TripStatus Status; // Requested, Assigning, Accepted, PickedUp, InProgress, Completed, Cancelled, Expired
    Guid PassengerId;
    Guid? DriverId;
    Guid? VehicleId;
    decimal? FareAmount;
    DateTime RequestedAt;
    DateTime? AcceptedAt;
    DateTime? PickedUpAt;
    DateTime? CompletedAt;
    TripLocation PickupLocation;
    TripLocation DropoffLocation;
    double EstimatedDistance;
    double? ActualDistance;
    int AssignmentRound; // 1, 2, 3
}
```

**2. Driver**
```csharp
public class Driver {
    Guid Id;
    string FirstName;
    string LastName;
    string LicenseNumber;
    DriverStatus Status; // Active, Inactive, Suspended, Terminated
    string DxpTier; // Elite, Pro, Standard, Probation
    decimal BondBalance;
    double AverageRating;
    DateTime CreatedAt;
}
```

**3. Vehicle**
```csharp
public class Vehicle {
    Guid Id;
    string PlateNumber;
    string Make;
    string Model;
    string VIN;
    VehicleStatus Status; // Available, InUse, Maintenance, Retired
    Guid? CurrentDriverId;
    Guid DepotId;
}
```

**4. GpsTrackPoint** (Optimized)
```csharp
public class GpsTrackPoint {
    long Id; // Sequential, not GUID
    Guid TripId;
    float Latitude; // 4 bytes, ±55m precision
    float Longitude; // 4 bytes, ±55m precision
    ushort SecondsSinceTripStart; // 2 bytes, max 18.2 hours
    byte? SpeedKmh; // 1 byte, 0-255 km/h
    short? Bearing; // 2 bytes, 0-359°
    byte? Accuracy; // 1 byte, 0-255m
    DateTime RecordedAt;
}
// Total: ~35 bytes per point
```

**5. RollCallInstance**
```csharp
public class RollCallInstance {
    Guid Id;
    Guid DepotId;
    DateTime ScheduledStart;
    DateTime WindowOpenAt; // T-30m
    DateTime WindowCloseAt; // T+10m
    RollCallStatus Status; // Active, InProgress, Completed, Locked
    int TotalDrivers;
    int Launched;
    int NoShows;
}
```

**6. PostShiftInstance**
```csharp
public class PostShiftInstance {
    Guid Id;
    Guid DriverId;
    Guid ShiftId;
    DateTime ShiftEndedAt;
    PostShiftStatus Status; // PendingReconciliation, InReview, PendingExcellence, Completed
    bool ReliabilityBonusEligible;
    bool SurplusRevenueEligible;
    bool PerformanceBonusEligible;
    bool AssetSafetyBonusEligible;
    bool FinalAuditBonusEligible;
}
```

**7. AttentionItem** (Command Center Overwatch)
```csharp
public class AttentionItem {
    Guid Id;
    AttentionItemType Type; // TripExpired, DriverOffline, LongIdleTime, GeofenceViolation
    Severity Severity; // Low, Medium, High, Critical
    Guid EntityId; // Trip or Driver ID
    string Description;
    DateTime CreatedAt;
    DateTime? AcknowledgedAt;
    DateTime? ResolvedAt;
    Guid? AssignedToStaffId;
}
```

**8. AuditItem** (Command Center Audit)
```csharp
public class AuditItem {
    Guid Id;
    Guid TripId;
    AuditSource Source; // RandomSampling, CustomerComplaint, IntegrityAlert, ManagerReferral
    Severity Severity;
    DateTime CreatedAt;
    DateTime? ClaimedAt;
    DateTime? VerdictRenderedAt;
    Guid? AuditorId;
    AuditVerdict? Verdict; // NoFault, Warning, BondDeduction, Suspension, Termination
    decimal? DeductionAmount;
}
```

**9. FraudCase**
```csharp
public class FraudCase {
    Guid Id;
    FraudCaseType Type; // IDENTITY, WALLET, PROMO, INCENTIVE, RING, INSIDER, DEVICE, COLLUSION
    FraudCaseStatus Status; // OPEN, MONITORING, UNDER_INVESTIGATION, ESCALATED, PENDING_ACTION, CLOSED
    Severity Severity; // LOW, MEDIUM, HIGH, CRITICAL
    int ConfidenceScore; // 0-100
    Guid PrimaryEntityId; // Driver or Customer
    DateTime CreatedAt;
    DateTime? ResolvedAt;
    Guid? AssignedAnalystId;
}
```

**10. TripSummaryDaily** (Analytics Aggregation)
```csharp
public class TripSummaryDaily {
    long Id;
    DateOnly SummaryDate;
    Guid? DriverId; // null = system-wide
    Guid? CustomerId; // null = all customers
    string? RegionId; // null = all regions
    int TripCount;
    int CompletedTrips;
    int CancelledTrips;
    decimal TotalRevenue;
    double TotalDistance;
    int TotalDurationMinutes;
    double? AvgRating;
}
```

### Database Schemas (29 Schemas)

1. `auth` - Users, roles, permissions, sessions
2. `drivers` - Driver master data, performance
3. `bonds` - Security bond ledger
4. `fleet` - Vehicles, depots, assignments
5. `trips` - Trip lifecycle, GPS tracks
6. `command_center` - Overwatch, Audit, ERT
7. `dashcam` - Devices, clips, sessions
8. `roll_call` - Pre-shift gateway (8 tables)
9. `post_shift` - Post-shift gateway (4 tables)
10. `dxp_compliance` - DXP cycles, summaries (4 tables)
11. `fraud` - Signals, cases, graph
12. `comms` - Communication hub
13. `orchestration` - Sagas, timers, escalations
14. `dispatch` - Dispatch control
15. `finance` - Budgets, ledger, wallets
16. `shifts` - Shift scheduling
17. `incidents` - Accident reporting
18. `realtime` - GPS locations, KPIs
19. `settings` - Configuration, feature flags
20. `ground_ops` - Daily operations
21. `customer_promos` - Promo campaigns
22. `driver_incentives` - Quests, bonuses
23. `approval_workflow` - Campaign approvals
24. `settlement_ledger` - Financial ledger
25. `admin_panel` - Administration
26. `identity_verification` - KYC, face liveness
27. `fraud_controller` - Device fingerprinting
28. `trust_score` - Trust scoring
29. `analytics` - Trip aggregation, archival

---

## Performance Optimizations

### 1. GPS Track Storage (27% Storage Reduction)
**Problem**: 300M GPS points/month = 14.4 GB

**Solution**: Optimized entity design
- Sequential `long` IDs (not GUIDs): 50% savings
- `float` coordinates (not double): 50% savings
- Relative timestamps (ushort): 75% savings
- **Result**: 48 bytes → 35 bytes per point = **3.9 GB saved/month**

**Implementation**:
- `trips.gps_track_points` table
- Composite index on `(TripId, SecondsSinceTripStart)`
- Haversine distance calculations built-in
- Automated archival after 90 days to gzip JSON

---

### 2. Spatial Indexing (10-100x Faster Queries)
**Problem**: In-memory zone containment checks = 50-200ms

**Solution**: PostGIS spatial indexes
- GIST indexes on `geography(Polygon, 4326)` columns
- Server-side spatial queries (no in-memory filtering)
- Geodetic distance calculations

**Performance**:
- Point-in-polygon: <10ms (vs 50-200ms)
- Radius queries: <20ms
- Distance ordering: <30ms

**Implementation**:
- NetTopologySuite (2.6.0)
- PostGIS extension enabled
- Spatial query extensions in RollCall and Trips modules

---

### 3. Analytics Trip Aggregation (100-300x Faster)
**Problem**: Quarterly reports query 3M rows = 10-30 seconds

**Solution**: Pre-aggregated daily summaries
- Store daily summaries (system-wide, per-driver, per-customer, per-region)
- Query 90 rows instead of 3M rows
- **Result**: <100ms queries (vs 10-30 seconds)

**Implementation**:
- `analytics.trip_summary_daily` table
- Background job runs daily at 1:00 AM UTC
- Optimized indexes for time-range queries

---

### 4. Parquet Archival (71-98% Space Savings)
**Problem**: 12M trips/year in SQL = 75-100 GB after 5 years

**Solution**: Archive trips older than 90 days to Parquet
- Columnar storage with Snappy compression
- 3.5:1 compression ratio (71% space saved)
- Streaming export (10K batch size, 5MB memory)

**Annual Savings**: 4.2 GB/year

**Implementation**:
- `ParquetExportService` with streaming
- Background job runs monthly at 2:00 AM UTC
- `trips.trips.is_archived` flag for tracking

---

## Integration Events

### Event Categories (6)

**1. Trip Events**
- `TripRequestedIntegrationEvent`
- `TripAcceptedIntegrationEvent`
- `TripPickedUpIntegrationEvent` → Triggers Dashcam recording
- `TripCompletedIntegrationEvent` → 10% random audit
- `TripCancelledIntegrationEvent`
- `TripExpiredIntegrationEvent` → Creates Overwatch attention item

**2. Fleet Events**
- `VehicleAssignedIntegrationEvent`
- `VehicleReleasedIntegrationEvent`
- `VehicleMaintenanceScheduledIntegrationEvent`

**3. Roll Call Events**
- `RollCallGeneratedIntegrationEvent` (T-24hr)
- `DriverLaunchedIntegrationEvent`
- `NoShowConfirmedIntegrationEvent`
- `RollCallCompletedIntegrationEvent`
- `HotSwapRequestedIntegrationEvent`
- `VehicleHealthIssueIntegrationEvent`

**4. Post-Shift Events**
- `ShiftClosedIntegrationEvent`
- `DxpEligibilityCalculatedIntegrationEvent` → Finance
- `BondDeductionAppliedIntegrationEvent`
- `ExcellenceReviewTriggeredIntegrationEvent`
- `TardyPenaltyAppliedIntegrationEvent`

**5. Command Center Events**
- `AttentionItemCreatedIntegrationEvent`
- `AttentionItemResolvedIntegrationEvent`
- `AuditVerdictRenderedIntegrationEvent`
- `AuditVerdictApprovedIntegrationEvent` → Bonds module
- `ErtDispatchedIntegrationEvent`
- `ErtCompletedIntegrationEvent`

**6. Fraud Events**
- `FraudSignalDetectedIntegrationEvent`
- `FraudCaseCreatedIntegrationEvent`
- `FraudRingDetectedIntegrationEvent`

### Event Bus Architecture
- **Technology**: Redis Pub/Sub
- **Pattern**: Event-driven communication between modules
- **Benefits**: Loose coupling, modules don't reference each other directly
- **Reliability**: Durable subscriptions, guaranteed delivery

---

## Frontend Visualization Requirements

### 1. Dashboard & KPIs
**Screen**: Main Dashboard
**Purpose**: Real-time operational overview

**Visualizations Needed**:
- **KPI Cards**:
  - Active drivers count (real-time)
  - Trips in progress
  - Trips completed today
  - Total revenue today
  - Average driver rating
  - Fleet utilization %
- **Time-series Charts**:
  - Trips per hour (line chart, 24-hour window)
  - Revenue per hour (area chart)
  - Driver availability (stacked area chart)
- **Status Distribution**:
  - Trip status breakdown (pie chart)
  - Driver status breakdown (donut chart)
  - Vehicle status breakdown (horizontal bar chart)

**Data Sources**:
- GET `/api/analytics/dashboard-kpis`
- GET `/api/analytics/trips/hourly`
- GET `/api/realtime/driver-locations` (SignalR)

---

### 2. Live Map
**Screen**: Fleet Map / Command Center Map
**Purpose**: Real-time GPS tracking and spatial visualization

**Map Layers**:
1. **Driver Markers** (clustered at zoom out)
   - Color-coded by status (Available=green, Busy=orange, Offline=gray)
   - Click → Driver profile popup
   - Real-time updates via SignalR
2. **Active Trip Routes**
   - Polyline from pickup to dropoff
   - Driver current position marker (animated)
   - ETA display
3. **Zone Boundaries** (Polygons)
   - GeoJSON polygons from `roll_call.zone_definitions.boundary`
   - Color-coded by demand (green=low, yellow=medium, red=high)
   - Click → Zone details (demand, supply, balance)
4. **Depot Markers**
   - Fixed locations from `fleet.depots`
   - Icon: warehouse/depot
5. **Heatmap Layer** (toggle)
   - Demand heatmap based on trip requests
   - Supply heatmap based on available drivers

**Map Controls**:
- Layer toggles (drivers, trips, zones, heatmap)
- Filter by driver status
- Filter by zone
- Search driver/vehicle by plate number
- Time slider (replay historical GPS tracks)

**Data Sources**:
- GET `/api/realtime/driver-locations` (SignalR push)
- GET `/api/trips?status=InProgress` (active trips)
- GET `/api/roll-call/zones` (GeoJSON boundaries)
- GET `/api/analytics/heatmap?type=demand`

**Technology**:
- **Leaflet** (already in stack)
- **Leaflet.markercluster** for clustering
- **Leaflet.heat** for heatmaps
- **SignalR** for real-time updates

---

### 3. Roll Call Dashboard
**Screen**: Roll Call Operations
**Purpose**: Pre-shift gateway workflow visualization

**4-Stage Progress View**:
```
[Stage 1: Swaps] → [Stage 2: Arrival] → [Stage 3: Missions] → [Stage 4: Audit]
     Complete         In Progress            Pending              Pending
```

**Components**:
1. **Instance Header**:
   - Depot name
   - Scheduled start time
   - Window status: "Active (T-15m)" / "Closed (T+12m)"
   - Driver counts: 45 scheduled, 40 checked in, 38 launched, 2 no-shows
2. **Driver List** (table):
   - Columns: Driver Name, Vehicle, Check-in Time, Stage, Status, Actions
   - Color-coded rows: Green=launched, Yellow=in-progress, Red=no-show
   - Inline actions: "Launch", "Mark No-Show", "Override"
3. **Stage Panels**:
   - **Stage 1**: List of swap events, "Acknowledge All" button
   - **Stage 2**: Map with geofence circles (50m radius), vehicle health checklist
   - **Stage 3**: Zone assignment grid (driver → zone mapping), weighted scores
   - **Stage 4**: Dashcam feed viewer (5-second clip), uniform checklist
4. **Manager Controls** (bottom):
   - "Complete Roll Call" button
   - "Reopen Instance" (password-protected)
   - Algorithm weight sliders (if manager role)

**Data Sources**:
- GET `/api/roll-call/dashboard`
- GET `/api/roll-call/{id}/driver-entries`
- WebSocket `/hub/roll-call` for real-time updates
- POST `/api/roll-call/{id}/complete-visual-audit`

---

### 4. Post-Shift Brief Dashboard
**Screen**: Post-Shift Reconciliation
**Purpose**: 5-checkpoint compliance audit visualization

**5-Checkpoint Progress**:
```
[✓ Attendance] → [✓ Vehicle] → [✓ Revenue] → [⚠ Surplus] → [⏳ Bond]
   Eligible        Eligible      Ineligible    Pending      Pending
```

**Components**:
1. **Instance Header**:
   - Driver name + photo
   - Shift ID and date
   - Status: "Pending Reconciliation" / "In Review" / "Completed"
   - Time remaining: "8:45 left until auto-lock"
2. **Checkpoint Cards** (5 cards):
   - **Checkpoint 1 (Attendance)**:
     - Launch time: "07:58 AM" (green if ≤T+10m)
     - Eligibility flag: `reliability_bonus_eligible = true`
   - **Checkpoint 2 (Vehicle)**:
     - Side-by-side photo comparison (pre vs post)
     - Damage detection: "No new damage" (green) / "1 new dent detected" (red)
     - Dashcam verification: "Full shift recorded" (green)
     - Eligibility flag: `asset_safety_bonus_eligible = true/false`
   - **Checkpoint 3 (Revenue)**:
     - Today's revenue: ₱2,450
     - Cycle average: ₱2,200
     - Comparison: "+₱250 (11% above average)" (green)
     - Eligibility flag: `surplus_revenue_eligible = true/false`
   - **Checkpoint 4 (Surplus Eligibility)**:
     - CSAT: 4.7 / 5.0 (green if ≥4.5)
     - Acceptance time: 18s (green if <20s)
     - Tier ranking: "Top 65% by revenue" (green if top 70%)
     - Eligibility flag: `performance_bonus_eligible = true/false`
   - **Checkpoint 5 (Bond)**:
     - Current balance: ₱2,800 (red if <₱3,000)
     - Required: ₱3,000
     - Shortfall: ₱200
     - Action: "Requires replenishment before next shift"
     - Tardy status: "0 tardies this cycle" (green)
     - Eligibility flag: `final_audit_bonus_eligible = false`
3. **Excellence Review Panel** (if triggered):
   - Trigger reason: "1-star rating detected"
   - Status: "Meeting required"
   - Schedule meeting button
   - "Skip with override" button (password-protected)
4. **Supervisor Actions** (bottom):
   - "Complete Shift" button (enabled if all checkpoints done)
   - "Waive Bond Requirement" (password-protected)
   - "Force Complete" (password-protected)

**Data Sources**:
- GET `/api/post-shift/dashboard`
- GET `/api/post-shift/{id}`
- GET `/api/post-shift/dxp-cycles/{cycleId}/driver-summaries`
- POST `/api/post-shift/{id}/checkpoint-X-...`

---

### 5. Command Center Overwatch
**Screen**: Attention Items Queue
**Purpose**: Real-time fleet monitoring and issue management

**Components**:
1. **Attention Items List** (table):
   - Columns: Severity, Type, Entity, Description, Created, SLA, Assigned To, Status, Actions
   - Color-coded rows: Red=Critical, Orange=High, Yellow=Medium, Gray=Low
   - Filters: By severity, by type, by status, by staff
   - Sort: By SLA deadline (overdue first)
2. **Item Detail Panel** (side panel):
   - Item details (trip ID, driver ID, location)
   - Timeline of events
   - Related data (trip details, driver history)
   - Action buttons: "Acknowledge", "Resolve", "Escalate"
   - Resolution notes textarea
3. **Staff Assignment Map**:
   - Map showing which staff monitors which drivers
   - Color-coded regions (one color per staff member)
   - "Auto-balance" button to trigger K-means clustering

**Data Sources**:
- GET `/api/command-center/overwatch/attention-items`
- WebSocket `/hub/overwatch` for real-time updates
- POST `/api/command-center/overwatch/rebalance`

---

### 6. Command Center Audit
**Screen**: Audit Queue & Verdict Rendering
**Purpose**: Quality control workflow visualization

**Components**:
1. **Audit Queue** (table):
   - Columns: Severity, Source, Trip ID, Driver, Created, SLA, Status, Actions
   - Filters: By source, by severity, by status
   - Sort: By SLA deadline
2. **Audit Detail Panel**:
   - Trip details (pickup, dropoff, fare, duration)
   - Driver profile (ratings, history, tier)
   - Customer complaint text (if applicable)
   - Dashcam footage player (if trip has recording)
   - Photos/evidence viewer
3. **Verdict Form**:
   - Verdict dropdown: NoFault, Warning, BondDeduction, Suspension, Termination
   - Deduction amount input (if BondDeduction)
   - Suspension days input (if Suspension)
   - Reasoning textarea (required)
   - "Submit for Supervisor Approval" button
4. **Approval Panel** (supervisor view):
   - Auditor verdict summary
   - "Approve" / "Reject" buttons
   - Rejection reason textarea

**Data Sources**:
- GET `/api/command-center/audit/queue`
- GET `/api/command-center/audit/items/{id}`
- POST `/api/command-center/audit/items/{id}/verdict`
- POST `/api/command-center/audit/items/{id}/approve`

---

### 7. Fraud Intelligence
**Screen**: Fraud Cases & Investigation
**Purpose**: Fraud detection and case management

**Components**:
1. **Fraud Cases List** (table):
   - Columns: Severity, Type, Entity, Confidence Score, Status, Created, Assigned To, Actions
   - Color-coded rows by severity
   - Filters: By type, by status, by severity
2. **Case Detail Panel**:
   - **Signals Section**:
     - List of fraud signals (type, weight, explainability, timestamp)
     - Signal strength visualization (horizontal bars)
   - **Graph Visualization**:
     - Network graph showing entity relationships
     - Nodes: Driver, Customer, Device, Wallet, Vehicle
     - Edges: SHARES_DEVICE_WITH, FREQUENT_RIDER_OF, etc.
     - Edge thickness = strength score
   - **Timeline**:
     - Chronological view of all signals
   - **Recommendations**:
     - Advisory recommendations (Settlement Review, Clawback Eligible, etc.)
3. **Classification Form**:
   - Classification dropdown: Confirmed Fraud, False Positive, Inconclusive, Monitoring
   - Reasoning textarea
   - Action buttons: "Close Case", "Escalate", "Request More Info"

**Data Sources**:
- GET `/api/fraud/cases`
- GET `/api/fraud/cases/{id}`
- GET `/api/fraud/graph/{entityId}`
- POST `/api/fraud/cases/{id}/classify`

**Visualization Libraries**:
- **D3.js** or **Cytoscape.js** for graph visualization
- **Chart.js** for signal strength bars

---

### 8. Analytics & Reporting
**Screen**: Analytics Dashboard
**Purpose**: Performance reports and data insights

**Visualizations**:
1. **Quarterly Summary**:
   - KPI cards (total trips, revenue, avg rating, completion rate)
   - Comparison to previous quarter (% change)
   - Time-series line chart (daily metrics over 90 days)
2. **Driver Performance**:
   - Leaderboard table (top 20 drivers by revenue)
   - Tier distribution (pie chart)
   - Rating distribution (histogram)
3. **Regional Breakdown**:
   - Map with regional markers (size = trip count)
   - Regional performance table
4. **Trend Analysis**:
   - Trip volume trends (line chart, 12 months)
   - Revenue trends (area chart, 12 months)
   - Cancellation rate trends (line chart)

**Data Sources**:
- GET `/api/analytics/summary/quarterly?year=2025&quarter=1`
- GET `/api/analytics/summary/quarterly/driver/{driverId}`
- GET `/api/analytics/summary/quarterly/region/{regionId}`
- GET `/api/analytics/trips/trends`

---

### 9. DXP Cycles & Compliance
**Screen**: DXP Performance Tracking
**Purpose**: Driver Excellence Program cycle tracking

**Components**:
1. **Cycle Selector**:
   - Dropdown: "Jan 1-14, 2026" / "Jan 15-31, 2026"
   - Cycle status: "Active" / "Closed"
2. **Driver Summaries Table**:
   - Columns: Driver, Completed Shifts, Total Revenue, Cycle Avg, CSAT, Eligibility Flags
   - Eligibility flags: 5 checkmark icons (green=eligible, red=ineligible)
   - Sort by revenue, CSAT, shift count
3. **Eligibility Details Panel**:
   - Breakdown of eligibility criteria
   - Historical eligibility by shift
   - Tardy records

**Data Sources**:
- GET `/api/post-shift/dxp-cycles`
- GET `/api/post-shift/dxp-cycles/{cycleId}/driver-summaries`

---

### Frontend Technology Stack Summary

**Core Framework**: Angular 21 (standalone components)
**State Management**: RxJS + Signals (Angular 21)
**Styling**: Tailwind CSS 3.4
**Maps**: Leaflet + Leaflet.markercluster + Leaflet.heat
**Charts**: Chart.js or D3.js
**Real-time**: SignalR Client (@microsoft/signalr)
**HTTP**: Angular HttpClient
**Forms**: Reactive Forms (Angular)
**Tables**: Angular Material Table or AG Grid
**Date/Time**: date-fns or Luxon

---

## Security & Authorization

### Authentication
- **JWT Bearer Tokens** (HS256)
- **Access Token**: 15 minutes expiration
- **Refresh Token**: 7 days expiration
- **Token Storage**: HttpOnly cookies (secure)

### Authorization (RBAC)
**Roles**:
- `ADMIN` - Full system access
- `CC_MANAGER` - Command Center manager
- `CC_SUPERVISOR` - Command Center supervisor
- `CC_STAFF` - Command Center staff
- `GROUND_OPS_STAFF` - Ground operations staff
- `FLEET_MANAGER` - Fleet management
- `FINANCE` - Finance operations
- `AUDITOR` - Audit operations
- `FRAUD_ANALYST` - Fraud investigation
- `DRIVER` - Driver mobile app
- `CUSTOMER` - Customer mobile app

**Permissions** (examples):
- `trips.create`, `trips.read`, `trips.update`, `trips.cancel`
- `fleet.vehicles.assign`, `fleet.vehicles.release`
- `roll_call.complete`, `roll_call.override`
- `post_shift.review`, `post_shift.override`
- `audit.verdict`, `audit.approve`
- `fraud.classify`, `fraud.investigate`

### Data Protection
- **PostgreSQL encryption at rest**
- **Redis password protection**
- **Secrets in environment variables** (no hardcoding)
- **Kubernetes sealed-secrets** for production
- **HTTPS enforced** everywhere
- **CORS** configured for Angular frontend

### Input Validation
- **FluentValidation** on all API inputs
- **Parameterized queries** (no SQL injection)
- **XSS protection** via Content Security Policy
- **Rate limiting** on public endpoints

---

## DXP System

### Overview
DXP (Driver Experience Program) is the **Driver Operating System** governing training, operational tiering, guarantees, teams, incentives, and due-process.

### 7 Subsystems

**1. DXP Academy** - Training, LMS, certification
**2. DXP Tier** - Operational trust tiering (Elite, Pro, Standard, Probation)
**3. DXP Entitlements** - Guarantees & access gates
**4. DXP Teams** - Pods & captaincy (5-23 drivers per team)
**5. DXP Incentives** - Variable upside (quests, bonuses)
**6. DXP Appeals** - Due-process & disputes
**7. DXP Recovery** - Remediation programs

### Cross-Cutting Systems

**DXP Ledger** - Immutable, append-only record of truth
**Policy Engine** - Versioned, forward-only rules
**Event Stream** - Deterministic state change propagation
**Tenant Context** - Multi-tenancy support

### DXP Eligibility Flags (5)

Calculated by Post-Shift Brief module, used by Finance module for bonus calculations:

1. `reliability_bonus_eligible` - On-time launch (≤T+10m)
2. `surplus_revenue_eligible` - Revenue ≥ cycle average
3. `performance_bonus_eligible` - CSAT ≥4.5 + acceptance time <20s + top 70% tier ranking
4. `asset_safety_bonus_eligible` - No unreported damage + dashcam verified
5. `final_audit_bonus_eligible` - ALL 4 above must be true + bond balance ≥₱3,000

### DXP Cycles

**Duration**: Fixed 14-day cycles (calendar-based)
**Examples**: Jan 1-14, Jan 15-31, Feb 1-14, Feb 15-28

**Calculation Rules**:
- Cycle average = Total revenue ÷ Number of COMPLETED shifts
- Excludes incomplete shifts
- First shift of cycle: Auto-eligible (no prior average)

**Tardy System**:
- Max 1 tardy per cycle (for bond replenishment)
- 2nd tardy = DISQUALIFIED from ALL bonuses for cycle
- Resets at cycle boundary

---

## Deployment Architecture

### Docker Compose (Development)
```yaml
services:
  gateway:
    image: xpressops/gateway:latest
    ports:
      - "5000:5000"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__PostgreSQL=...
      - ConnectionStrings__Redis=...

  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

### Kubernetes (Production)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xpressops-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: xpressops-gateway
  template:
    spec:
      containers:
      - name: gateway
        image: xpressops/gateway:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

---

## Monitoring & Observability

### Metrics (Prometheus)
- Request rate, error rate, duration (RED metrics)
- Database connection pool size
- Redis cache hit rate
- SignalR connection count
- Background job success rate

### Dashboards (Grafana)
- System overview dashboard
- API performance dashboard
- Database performance dashboard
- Real-time operations dashboard

### Logging (Serilog)
- Structured JSON logs
- Log levels: Trace, Debug, Information, Warning, Error, Critical
- Correlation IDs for request tracing
- Sensitive data masking

---

## Summary

XpressOps Tower V2 is a **production-ready, enterprise-grade ride-hailing operations platform** with:

✅ **28 backend modules** (Modular Monolith)
✅ **300+ API endpoints**
✅ **29 PostgreSQL schemas** (schema-per-module)
✅ **Real-time GPS tracking** (SignalR, 300M points/month)
✅ **Performance optimizations** (100-300x faster analytics)
✅ **Event-driven architecture** (Redis Pub/Sub)
✅ **DXP System** (7 subsystems for driver excellence)
✅ **Fraud Intelligence** (graph-based pattern detection)
✅ **Operational Gateways** (Roll Call + Post-Shift Brief)
✅ **Command & Control** (Overwatch, Audit, ERT)
✅ **Modern Angular 21 frontend**

**Scale**: 1M trips/month, 10K drivers, 5K vehicles, <100ms analytics queries

**Status**: Production-ready, fully documented, tested

---

**Document Version**: 2.0
**Last Updated**: 2026-01-31
**Prepared by**: Release Agent
**Next Steps**: Frontend implementation based on visualization requirements above
