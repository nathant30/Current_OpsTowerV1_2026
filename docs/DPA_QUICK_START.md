# DPA Compliance Quick Start Guide

## For Developers

### Registration with Consent Recording

```typescript
// User registration automatically records DPA consent
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'passenger',
    acceptedTerms: true,        // Required
    acceptedPrivacyPolicy: true  // Required
  })
});

// Consent is automatically recorded to dpa_consents table:
// - terms_of_service consent
// - privacy_policy consent
// - With IP address and user agent
// - With consent version 1.0.0
```

### Submit Data Subject Rights Request

```typescript
// User submits request via form at /settings/privacy/request
const response = await fetch('/api/compliance/dpa/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'current-user-id',
    requestType: 'access',  // or 'erasure', 'rectification', 'portability'
    requestReason: 'I want to review my personal data',
    specificDataRequested: []
  })
});

// Returns: { success: true, data: { requestId: 'DPA-...' } }
// Deadline automatically set to 30 days from submission
```

### Admin: Manage Requests

```typescript
// Get all requests
const response = await fetch('/api/compliance/dpa/requests?status=submitted');
const { requests } = await response.json();

// Update request status
await fetch('/api/compliance/dpa/requests', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: 'DPA-1707384600-ABC123',
    status: 'approved',
    notes: 'Request approved for processing'
  })
});
```

## Key URLs

- User Request Form: `/settings/privacy/request`
- Admin Dashboard: `/compliance/dpa/requests`
- Registration API: `POST /api/auth/register`
- Requests API: `GET|POST|PATCH /api/compliance/dpa/requests`

## Database Tables

```sql
-- Check consents
SELECT * FROM dpa_consents WHERE user_id = 'user-id';

-- Check requests
SELECT * FROM dpa_data_requests WHERE user_id = 'user-id';

-- Check overdue requests
SELECT * FROM dpa_data_requests
WHERE deadline_date < NOW()
  AND status NOT IN ('completed', 'rejected', 'cancelled');
```

## Request Types

1. `access` - Export all personal data
2. `erasure` - Delete my data (right to be forgotten)
3. `rectification` - Correct inaccurate data
4. `portability` - Export data in portable format
5. `restriction` - Restrict data processing
6. `objection` - Object to certain processing
7. `automated_decision` - Review automated decisions

## Status Workflow

```
submitted → under_review → approved → processing → completed
                 ↓
              rejected
```

## 30-Day Deadline Compliance

- Deadline automatically calculated on submission
- Overdue requests highlighted in RED
- Urgent requests (≤7 days) in ORANGE
- Admin dashboard shows days remaining/overdue

## Testing

```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","firstName":"John","lastName":"Doe","userType":"passenger","acceptedTerms":true,"acceptedPrivacyPolicy":true}'

# Test request submission
curl -X POST http://localhost:3000/api/compliance/dpa/requests \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","requestType":"access","requestReason":"Testing"}'
```

## Common Issues

**Issue:** Consent not recorded
- Check user was created successfully
- Verify `dpa_consents` table exists (migration 049)
- Check application logs for errors

**Issue:** Deadline not calculated
- Verify trigger `set_data_request_deadline()` exists
- Check database permissions
- Manual fix: `UPDATE dpa_data_requests SET deadline_date = submitted_at + INTERVAL '30 days'`

**Issue:** UI components not found
- Install dependencies: `npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-select`
- Verify component files exist in `src/components/ui/`

## Need Help?

- See full documentation: `/docs/DPA_IMPLEMENTATION_COMPLETE.md`
- Check service code: `/src/lib/compliance/dpa/`
- Review API routes: `/src/app/api/compliance/dpa/`
