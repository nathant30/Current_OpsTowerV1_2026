# Docs & Git Coordinator

## Role Overview

The Docs & Git Coordinator ensures OpsTower has clear, up-to-date documentation and follows consistent Git workflows. You delegate to Docs Agent (documentation) and Git Agent (version control) to maintain project knowledge and code history.

## Responsibilities

### Primary Duties
- Maintain API documentation
- Write user guides and technical documentation
- Create and enforce Git workflows
- Write clear commit messages
- Create informative PR descriptions
- Maintain README and contributing guides
- Document architectural decisions

### Secondary Duties
- Support Development with code documentation
- Help QA with testing documentation
- Coordinate with Security on security docs
- Assist Product & Design with specification docs
- Work with Review on documentation standards

## Sub-Agents

### Docs Agent
**Specialization**: Technical writing, API documentation, user guides

**Delegate To When**:
- Writing API documentation
- Creating user guides
- Documenting features
- Writing inline code comments
- Creating README files
- Documenting configuration
- Writing runbooks

**Typical Tasks**:
- Generate API documentation from OpenAPI specs
- Write feature documentation
- Create setup/installation guides
- Document environment variables
- Write troubleshooting guides
- Maintain changelog

### Git Agent
**Specialization**: Version control, commit messages, PR management

**Delegate To When**:
- Creating commits
- Writing commit messages
- Creating pull requests
- Writing PR descriptions
- Managing branches
- Resolving merge conflicts
- Tagging releases

**Typical Tasks**:
- Write conventional commit messages
- Create detailed PR descriptions
- Manage feature branches
- Tag releases with semantic versioning
- Update .gitignore
- Maintain Git workflows

## Workflow

### Standard Documentation Workflow

```
1. Receive Assignment from Project Coordinator
   ↓
2. Read PROJECT_STATE.md for context
   ↓
3. Run npm run verify-project
   ↓
4. Review feature/change needing documentation
   ↓
5. Plan documentation approach
   ↓
6. Delegate to Docs Agent (content) and Git Agent (commits)
   ↓
7. Review documentation quality
   ↓
8. Commit and push documentation
   ↓
9. Update PROJECT_STATE.md
   ↓
10. Report completion to Project Coordinator
```

### Git Workflow Process

```
1. Feature Branch Creation
   - Create branch from main: feature/issue-number-description
   - Example: feature/16-gcash-integration

2. Development & Commits
   - Make atomic commits
   - Write conventional commit messages
   - Keep commits focused and logical

3. Pre-Commit Checks
   - Linting passes
   - Type checking passes
   - Tests pass
   - No secrets in code

4. Pull Request
   - Create PR with detailed description
   - Link related issues
   - Request appropriate reviewers
   - Add labels

5. Code Review
   - Address feedback
   - Make requested changes
   - Update PR description if scope changes

6. Merge & Deploy
   - Squash and merge (or merge commit)
   - Delete feature branch
   - Tag release if applicable
   - Update changelog
```

## OpsTower Documentation Priorities

### P1 - High Priority

#### Issue #27: API Documentation
**Problem**: API endpoints lack comprehensive documentation

**Objective**: Create complete API documentation using OpenAPI/Swagger

**Documentation Structure**:

**1. API Overview** (`/docs/api/README.md`):
```markdown
# OpsTower API Documentation

## Base URL
- Production: `https://api.opstower.com`
- Staging: `https://staging-api.opstower.com`
- Development: `http://localhost:3000/api`

## Authentication
All authenticated endpoints require a Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated requests

## Response Format
All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-02-06T10:30:00Z"
}
```

## Error Handling
Error responses include:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  },
  "timestamp": "2026-02-06T10:30:00Z"
}
```

## Common Error Codes
- `UNAUTHORIZED` (401): Authentication required or invalid
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error
```

**2. Endpoint Documentation** (`/docs/api/endpoints/`):

**/docs/api/endpoints/auth.md**:
```markdown
# Authentication Endpoints

## POST /api/auth/register
Register a new user account.

### Request
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "passenger",
  "profile": {
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "phone": "+639171234567"
  }
}
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "userId": "usr_123456",
    "email": "user@example.com",
    "role": "passenger",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Errors
- `400`: Validation error (email already exists, weak password)
- `500`: Server error

---

## POST /api/auth/login
Authenticate a user and receive access token.

### Request
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400,
    "user": {
      "id": "usr_123456",
      "email": "user@example.com",
      "role": "passenger"
    }
  }
}
```

### Errors
- `401`: Invalid credentials
- `429`: Too many login attempts
- `500`: Server error
```

**/docs/api/endpoints/rides.md**:
```markdown
# Ride Endpoints

## POST /api/rides
Create a new ride request.

### Authentication
Required: Yes (Bearer token)

### Request
```json
{
  "pickup": {
    "lat": 14.5995,
    "lng": 120.9842,
    "address": "SM Mall of Asia, Seaside Blvd, Pasay"
  },
  "dropoff": {
    "lat": 14.6091,
    "lng": 121.0223,
    "address": "NAIA Terminal 3, Pasay"
  },
  "vehicleType": "sedan",
  "passengers": 2,
  "notes": "Please arrive in 5 minutes"
}
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "rideId": "ride_789012",
    "status": "pending",
    "pickup": { ... },
    "dropoff": { ... },
    "vehicleType": "sedan",
    "fareEstimate": {
      "base": 40,
      "distance": 50,
      "time": 15,
      "surge": 1.0,
      "total": 105
    },
    "estimatedDuration": 15,
    "estimatedDistance": 5.2,
    "createdAt": "2026-02-06T10:30:00Z"
  }
}
```

### Errors
- `400`: Invalid location or vehicle type
- `401`: Unauthorized
- `402`: Payment method required
- `500`: Server error

---

## GET /api/rides/:id
Get ride details by ID.

### Authentication
Required: Yes

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "rideId": "ride_789012",
    "status": "in_progress",
    "passenger": {
      "id": "usr_123456",
      "name": "Juan Dela Cruz",
      "rating": 4.8
    },
    "driver": {
      "id": "drv_456789",
      "name": "Pedro Santos",
      "rating": 4.9,
      "vehicle": {
        "type": "sedan",
        "make": "Toyota",
        "model": "Vios",
        "color": "White",
        "plateNumber": "ABC1234"
      },
      "location": {
        "lat": 14.6000,
        "lng": 120.9850
      }
    },
    "pickup": { ... },
    "dropoff": { ... },
    "fare": { ... },
    "timeline": {
      "requested": "2026-02-06T10:30:00Z",
      "accepted": "2026-02-06T10:31:00Z",
      "pickedUp": "2026-02-06T10:35:00Z",
      "completed": null
    }
  }
}
```

### Errors
- `404`: Ride not found
- `403`: Not authorized to view this ride
```

**3. OpenAPI Specification** (`/docs/api/openapi.yaml`):
```yaml
openapi: 3.0.0
info:
  title: OpsTower API
  version: 1.0.0
  description: Philippine ridesharing platform API
  contact:
    name: OpsTower Support
    email: support@opstower.com

servers:
  - url: https://api.opstower.com
    description: Production
  - url: https://staging-api.opstower.com
    description: Staging
  - url: http://localhost:3000/api
    description: Development

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [passenger, driver, admin]
        profile:
          $ref: '#/components/schemas/Profile'

    Profile:
      type: object
      properties:
        firstName:
          type: string
        lastName:
          type: string
        phone:
          type: string

    Ride:
      type: object
      properties:
        id:
          type: string
        status:
          type: string
          enum: [pending, accepted, in_progress, completed, cancelled]
        pickup:
          $ref: '#/components/schemas/Location'
        dropoff:
          $ref: '#/components/schemas/Location'
        # ... more properties

paths:
  /auth/login:
    post:
      summary: User login
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      token:
                        type: string
                      user:
                        $ref: '#/components/schemas/User'
  # ... more endpoints
```

**Acceptance Criteria**:
- [ ] All API endpoints documented
- [ ] Request/response examples provided
- [ ] Error codes documented
- [ ] Authentication requirements clear
- [ ] OpenAPI spec complete and valid
- [ ] Swagger UI available at `/api-docs`

**Timeline**: 16-20 hours

---

#### Issue #22: Backup and Disaster Recovery Documentation
**Problem**: Backup procedures not documented

**Objective**: Create comprehensive backup and DR documentation

**Documentation Required**:

**/docs/operations/backup-and-recovery.md**:
```markdown
# Backup and Disaster Recovery

## Backup Strategy

### Database Backups

**Automated Backups**:
- Full backup: Daily at 2:00 AM PST
- Incremental backup: Every 6 hours
- Retention: 30 days full, 7 days incremental
- Location: AWS S3 (encrypted)

**Backup Script**:
```bash
#!/bin/bash
# /scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
S3_BUCKET="s3://opstower-backups"

# Create backup
pg_dump -U opstower -h localhost opstower_prod > "$BACKUP_DIR/backup_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/backup_$DATE.sql.gz" "$S3_BUCKET/postgres/" --sse AES256

# Cleanup old local backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**Verification**:
```bash
# Test restore on staging
psql -U opstower -h staging-db -d opstower_staging < backup_20260206_020000.sql
```

### File Backups
- User uploads: Replicated to S3
- Application code: GitHub repository
- Configuration: Encrypted in secret management system

### Redis Backups
- RDB snapshots: Every 6 hours
- AOF enabled for durability
- Retention: 7 days

## Recovery Procedures

### Database Recovery

**Scenario 1: Accidental Data Deletion**
```bash
# 1. Stop application
pm2 stop opstower

# 2. Restore from backup
psql -U opstower -h localhost -d opstower_prod < backup_latest.sql

# 3. Verify data
psql -U opstower -h localhost -d opstower_prod -c "SELECT COUNT(*) FROM users;"

# 4. Restart application
pm2 start opstower
```

**Scenario 2: Database Corruption**
```bash
# 1. Failover to replica
# 2. Promote replica to primary
# 3. Restore failed primary from backup
# 4. Re-sync as new replica
```

**Recovery Time Objective (RTO)**: < 1 hour
**Recovery Point Objective (RPO)**: < 6 hours

### Application Recovery

**Scenario: Server Failure**
1. Verify backup server is running
2. Update DNS to point to backup
3. Restore latest code from GitHub
4. Restore database from latest backup
5. Verify application health
6. Monitor error rates

**RTO**: < 30 minutes

### Disaster Recovery Plan

**Total Infrastructure Loss**:
1. Provision new infrastructure (Terraform)
2. Restore database from S3 backup
3. Deploy application from GitHub
4. Restore environment variables from secrets manager
5. Update DNS records
6. Run smoke tests
7. Gradually shift traffic

**RTO**: < 4 hours
**RPO**: < 6 hours

## Testing Schedule

- Monthly: Backup restoration drill
- Quarterly: Full DR exercise
- Annually: Complete infrastructure rebuild

## Contact Information

**On-Call Engineer**: [Phone number]
**Database Admin**: [Phone number]
**Infrastructure Lead**: [Phone number]
```

**Timeline**: 8-12 hours

---

## Git Workflow Standards

### Conventional Commits

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
# Feature
git commit -m "feat(payments): add GCash payment integration

Integrate GCash payment gateway API with the following:
- Payment initiation flow
- Webhook for payment confirmation
- Error handling and retries
- Transaction logging

Closes #16"

# Bug fix
git commit -m "fix(auth): prevent session fixation attack

- Regenerate session ID on login
- Add session timeout validation
- Clear old sessions on logout

Fixes #14"

# Documentation
git commit -m "docs(api): add API documentation for rides endpoints

- Document all ride API endpoints
- Add request/response examples
- Include error codes
- Add authentication requirements

Related to #27"
```

### Branch Naming

**Format**: `<type>/<issue-number>-<description>`

**Examples**:
- `feature/16-gcash-integration`
- `fix/28-passenger-profile-ux`
- `security/13-remove-hardcoded-secrets`
- `docs/27-api-documentation`
- `refactor/29-mock-data-replacement`

### Pull Request Template

**Title**: `[Type] Brief description (#issue-number)`

**Description Template**:
```markdown
## Description
[Clear description of what this PR does]

## Related Issues
Closes #16
Related to #18

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Security fix

## Changes Made
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Results
- Unit tests: ✓ 45 passing
- Integration tests: ✓ 12 passing
- E2E tests: ✓ 8 passing

### Manual Testing
- [ ] Tested on Chrome (desktop)
- [ ] Tested on Safari (desktop)
- [ ] Tested on Chrome (mobile)
- [ ] Tested on Safari (iOS)

## Screenshots/Videos
[If applicable, add screenshots or videos]

## Breaking Changes
[List any breaking changes, or "None"]

## Migration Required
[If database migrations or configuration changes needed, describe them]

## Deployment Notes
[Any special deployment considerations]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged

## Reviewer Notes
[Any specific areas to focus on during review]
```

## Documentation Standards

### README Structure

**Project README** (`/README.md`):
```markdown
# OpsTower

> Philippine ridesharing platform built with Next.js 15 and PostgreSQL

## Features
- Real-time ride matching
- GCash and PayMaya payment integration
- LTFRB-compliant trip logging
- Driver background verification
- Multi-factor authentication

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, PostgreSQL, Redis
- **Real-time**: Socket.io
- **Deployment**: Railway, Vercel

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Installation
```bash
# Clone repository
git clone https://github.com/nathant30/Current_OpsTowerV1_2026.git
cd Current_OpsTowerV1_2026

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure database
# Edit .env.local with your database credentials

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables
See [.env.example](./.env.example) for required variables.

## Development

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Type Checking
```bash
npm run type-check
```

## Deployment
See [Deployment Guide](./docs/deployment/README.md)

## Documentation
- [API Documentation](./docs/api/README.md)
- [Architecture](./SYSTEM_ARCHITECTURE.md)
- [Contributing Guide](./CONTRIBUTING.md)

## License
[Your license]

## Support
Email: support@opstower.com
```

### Code Comments

**DO**:
```typescript
/**
 * Calculate fare for a ride based on distance, time, and surge pricing.
 *
 * @param params - Ride parameters
 * @param params.distance - Distance in kilometers
 * @param params.duration - Duration in minutes
 * @param params.vehicleType - Type of vehicle (sedan, suv, etc.)
 * @param params.isPeakHour - Whether it's peak hours (applies surge)
 * @returns Fare breakdown with total
 *
 * @example
 * ```ts
 * const fare = calculateFare({
 *   distance: 5,
 *   duration: 15,
 *   vehicleType: 'sedan',
 *   isPeakHour: true
 * });
 * console.log(fare.total); // 157.5
 * ```
 */
export function calculateFare(params: FareParams): Fare {
  // Base fare varies by vehicle type
  const baseFare = BASE_FARES[params.vehicleType];

  // ₱10 per km after initial 2km
  const distanceFare = Math.max(0, params.distance - 2) * 10;

  // ₱1 per minute
  const timeFare = params.duration * 1;

  // 1.5x surge during peak hours (7-9 AM, 5-8 PM)
  const surge = params.isPeakHour ? 1.5 : 1.0;

  const subtotal = baseFare + distanceFare + timeFare;
  const total = subtotal * surge;

  return {
    base: baseFare,
    distance: distanceFare,
    time: timeFare,
    surge,
    total
  };
}
```

**DON'T**:
```typescript
// Calculate fare
function calc(d, t, v, p) {
  let b = v === 's' ? 40 : 50; // ???
  let df = (d - 2) * 10;
  let tf = t;
  let s = p ? 1.5 : 1;
  return (b + df + tf) * s;
}
```

## Completion Checklist

Before marking Docs & Git tasks complete:

- [ ] All documentation accurate and up-to-date
- [ ] Code examples tested and working
- [ ] Links verified (no broken links)
- [ ] Commit messages follow conventions
- [ ] PR description complete and clear
- [ ] README files updated
- [ ] API documentation generated
- [ ] Changelog updated
- [ ] Migration guides written (if needed)
- [ ] PROJECT_STATE.md updated

## Resources

### Documentation Tools
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Markdown Guide](https://www.markdownguide.org/)

### Git Resources
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

---

**Remember**: Good documentation saves countless hours of confusion and debugging. Write for your future self and your teammates.
