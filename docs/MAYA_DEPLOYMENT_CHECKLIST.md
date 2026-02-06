# Maya Payment Gateway - Production Deployment Checklist

**Project**: OpsTower V1 2026
**Integration**: Maya (PayMaya) Payment Gateway
**Issue**: #18
**Status**: Ready for Production Deployment
**Date**: 2026-02-07

---

## Pre-Deployment Requirements

### 1. Maya Merchant Account Setup

- [ ] **Maya Business Account Applied**
  - Application URL: https://www.maya.ph/business
  - Business documents submitted
  - Bank account verified
  - Status: ⬜ Pending / ⬜ Approved

- [ ] **Production API Keys Generated**
  - Login to Maya Manager Production: https://manager.paymaya.com/
  - Navigate to API Keys section
  - Generate Public Key (pk-live-xxx): ⬜
  - Generate Secret Key (sk-live-xxx): ⬜
  - Keys saved securely: ⬜

- [ ] **Webhook Configuration**
  - Webhook secret generated: ⬜
  - Webhook secret saved securely: ⬜
  - Production webhook URL configured: ⬜
  - Events enabled:
    - ☑️ PAYMENT_SUCCESS
    - ☑️ PAYMENT_FAILED
    - ☑️ PAYMENT_EXPIRED

### 2. Database Setup

- [ ] **Migration 046 Executed**
  ```bash
  psql -d opstower -f database/migrations/046_payment_transactions.sql
  ```
  - Tables created:
    - ☑️ `payments`
    - ☑️ `transaction_logs`
    - ☑️ `webhook_events`
    - ☑️ `refunds`
    - ☑️ `payment_reconciliation`
  - Indexes verified: ⬜
  - Triggers active: ⬜

- [ ] **Database Encryption Key Generated**
  ```bash
  openssl rand -hex 32
  ```
  - Key generated: ⬜
  - Key stored in secrets manager: ⬜
  - Backup key stored securely: ⬜

### 3. Infrastructure Requirements

- [ ] **SSL/HTTPS Configuration** (Issue #14)
  - SSL certificate valid: ⬜
  - Certificate expiry > 30 days: ⬜
  - HTTPS redirect configured: ⬜
  - TLS 1.2+ enabled: ⬜

- [ ] **Domain Configuration**
  - Production domain: opstower.com
  - DNS records configured: ⬜
  - Domain verified: ⬜

- [ ] **Server Requirements**
  - Node.js >= 18.x: ⬜
  - PostgreSQL >= 14.x: ⬜
  - Redis (optional): ⬜
  - Memory >= 2GB: ⬜
  - Disk space >= 20GB: ⬜

### 4. Environment Variables

- [ ] **Production Environment Variables Set**

Create/verify these in your deployment platform (Railway/Vercel/etc):

```bash
# Maya Configuration
MAYA_PUBLIC_KEY=pk-live-xxx
MAYA_SECRET_KEY=sk-live-xxx
MAYA_BASE_URL=https://pg.paymaya.com
MAYA_WEBHOOK_SECRET=live-webhook-secret
MAYA_SANDBOX_MODE=false

# Webhook URL
NEXT_PUBLIC_MAYA_WEBHOOK_URL=https://opstower.com/api/payments/maya/webhook

# Database
DATABASE_URL=postgresql://user:pass@host:5432/opstower
DATABASE_ENCRYPTION_KEY=32-byte-hex-key

# Application
NODE_ENV=production
```

**Verification**:
- [ ] All environment variables set
- [ ] No sandbox credentials in production
- [ ] Secrets stored in secure vault
- [ ] Environment variables encrypted at rest

---

## Deployment Steps

### Phase 1: Pre-Deployment Testing (Sandbox)

- [ ] **1.1 Sandbox Testing Complete**
  - Payment initiation tested: ⬜
  - Checkout redirect tested: ⬜
  - Payment completion tested: ⬜
  - Webhook received and processed: ⬜
  - Payment status synchronized: ⬜
  - Refund flow tested: ⬜
  - Timeout handling tested: ⬜
  - Error scenarios tested: ⬜

- [ ] **1.2 Integration Tests Passed**
  ```bash
  npm test -- --testPathPattern=maya
  ```
  - Client tests passed: ⬜
  - Service tests passed: ⬜
  - API route tests passed: ⬜
  - Webhook tests passed: ⬜

- [ ] **1.3 Build Verification**
  ```bash
  npm run build
  ```
  - Build successful: ⬜
  - No TypeScript errors: ⬜
  - No ESLint errors: ⬜
  - Bundle size acceptable: ⬜

### Phase 2: Production Deployment

- [ ] **2.1 Deploy Code**
  ```bash
  git checkout main
  git pull origin main
  git push production main
  ```
  - Code deployed: ⬜
  - Deployment successful: ⬜
  - Health checks passed: ⬜

- [ ] **2.2 Verify Deployment**
  - Application accessible: https://opstower.com ⬜
  - Database connection verified: ⬜
  - Redis connection verified (if used): ⬜
  - Logs accessible: ⬜

- [ ] **2.3 Webhook Endpoint Verification**
  ```bash
  curl https://opstower.com/api/payments/maya/webhook
  ```
  - Expected response: `{"success":true,"message":"Maya webhook endpoint is active"}`
  - Endpoint responding: ⬜
  - HTTPS verified: ⬜

- [ ] **2.4 Configure Maya Webhook**
  - Login to Maya Manager Production
  - Navigate to Webhooks section
  - Add webhook: `https://opstower.com/api/payments/maya/webhook`
  - Enable events: PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_EXPIRED
  - Test webhook connection: ⬜
  - Webhook active: ⬜

### Phase 3: Production Verification

- [ ] **3.1 Test Payment (Small Amount)**
  - Create test payment (PHP 10.00): ⬜
  - Verify checkout URL generated: ⬜
  - Complete payment in Maya: ⬜
  - Verify webhook received: ⬜
  - Verify status updated to "completed": ⬜
  - Verify transaction logged: ⬜
  - Verify audit trail complete: ⬜

- [ ] **3.2 Database Verification**
  ```sql
  -- Check payment created
  SELECT * FROM payments WHERE provider = 'maya' ORDER BY created_at DESC LIMIT 1;

  -- Check transaction logs
  SELECT * FROM transaction_logs WHERE transaction_id = 'TXN-MAYA-xxx';

  -- Check webhook event
  SELECT * FROM webhook_events WHERE provider = 'maya' ORDER BY received_at DESC LIMIT 1;
  ```
  - Payment record exists: ⬜
  - Transaction logs complete: ⬜
  - Webhook event stored: ⬜

- [ ] **3.3 Test Refund Flow**
  - Request refund for test payment: ⬜
  - Verify refund record created: ⬜
  - Verify refund logged: ⬜

- [ ] **3.4 Test Status Query**
  ```bash
  curl https://opstower.com/api/payments/maya/status/TXN-MAYA-xxx?sync=true
  ```
  - Status query working: ⬜
  - Sync with Maya working: ⬜
  - Response correct: ⬜

### Phase 4: Monitoring & Alerts Setup

- [ ] **4.1 Configure Monitoring**
  - Application metrics tracking: ⬜
  - Payment success rate monitoring: ⬜
  - Webhook failure alerts: ⬜
  - Database query performance: ⬜
  - API response times: ⬜

- [ ] **4.2 Set Up Alerts**
  - Slack webhook configured: ⬜
  - Alert channels:
    - ☑️ Payment failures
    - ☑️ Webhook signature failures
    - ☑️ High error rate
    - ☑️ Slow API response
    - ☑️ Database connection issues

- [ ] **4.3 Configure Logging**
  - Application logs centralized: ⬜
  - Log retention policy set: ⬜
  - Sensitive data redacted: ⬜
  - Log levels configured: ⬜

### Phase 5: Compliance & Security

- [ ] **5.1 BSP Compliance**
  - Transaction audit trail verified: ⬜
  - Webhook logging complete: ⬜
  - Daily reconciliation configured: ⬜
  - Encryption verified: ⬜

- [ ] **5.2 Security Audit**
  - API keys not exposed in logs: ⬜
  - Database credentials secured: ⬜
  - Webhook signature verification active: ⬜
  - HTTPS enforced: ⬜
  - Rate limiting configured: ⬜

- [ ] **5.3 Data Encryption**
  - Sensitive fields encrypted: ⬜
  - Encryption key rotated: ⬜
  - Key backup stored securely: ⬜

### Phase 6: Documentation & Training

- [ ] **6.1 Documentation Complete**
  - Integration guide: `docs/MAYA_INTEGRATION.md` ⬜
  - API documentation: ⬜
  - Deployment checklist: `docs/MAYA_DEPLOYMENT_CHECKLIST.md` ⬜
  - Troubleshooting guide: ⬜

- [ ] **6.2 Team Training**
  - Development team trained: ⬜
  - Operations team trained: ⬜
  - Support team trained: ⬜
  - Escalation procedures documented: ⬜

- [ ] **6.3 Runbooks Created**
  - Payment failure runbook: ⬜
  - Webhook failure runbook: ⬜
  - Refund process runbook: ⬜
  - Incident response runbook: ⬜

---

## Post-Deployment

### Day 1 Monitoring

- [ ] **Monitor First 24 Hours**
  - Payment success rate: ⬜
  - Webhook delivery rate: ⬜
  - Average response time: ⬜
  - Error rate: ⬜
  - Database performance: ⬜

- [ ] **Review Transaction Logs**
  - All payments logged: ⬜
  - No errors in logs: ⬜
  - Audit trail complete: ⬜

### Week 1 Review

- [ ] **Performance Review**
  - API response times acceptable: ⬜
  - Payment success rate > 95%: ⬜
  - Webhook delivery rate > 99%: ⬜
  - No incidents: ⬜

- [ ] **Financial Reconciliation**
  - Daily reconciliation running: ⬜
  - Reconciliation reports generated: ⬜
  - Discrepancies resolved: ⬜

### Ongoing Maintenance

- [ ] **Scheduled Tasks**
  - Daily reconciliation cron job: ⬜
  - Weekly audit log review: ⬜
  - Monthly security review: ⬜
  - Quarterly disaster recovery test: ⬜

- [ ] **Update Schedule**
  - API key rotation schedule (annually): ⬜
  - Database encryption key rotation (annually): ⬜
  - SSL certificate renewal (before expiry): ⬜

---

## Rollback Plan

If deployment issues occur, follow this rollback procedure:

### Immediate Rollback (Emergency)

1. **Revert deployment**:
   ```bash
   git revert HEAD
   git push production main
   ```

2. **Disable Maya webhooks** (in Maya Manager)

3. **Switch to maintenance mode**

4. **Notify users** via status page

### Post-Rollback Actions

- [ ] Investigate issue
- [ ] Document root cause
- [ ] Fix issue in staging
- [ ] Test fix thoroughly
- [ ] Schedule re-deployment

---

## Success Criteria

Deployment is considered successful when:

✅ All checklist items completed
✅ Test payment processed successfully
✅ Webhook received and processed
✅ Payment status synchronized
✅ Refund flow working
✅ No errors in logs (24 hours)
✅ Payment success rate > 95%
✅ Webhook delivery rate > 99%
✅ API response time < 500ms
✅ BSP compliance verified
✅ Security audit passed
✅ Team training completed
✅ Documentation finalized

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Development Lead | __________ | __________ | ______ |
| DevOps Engineer | __________ | __________ | ______ |
| Security Officer | __________ | __________ | ______ |
| Product Manager | __________ | __________ | ______ |

---

## Support Contacts

| Issue Type | Contact | Email | Phone |
|------------|---------|-------|-------|
| Maya Technical Support | Maya Developer Support | support@maya.ph | +63 2 xxx xxxx |
| OpsTower Development | Development Team | dev@opstower.com | - |
| OpsTower Operations | Operations Team | ops@opstower.com | - |
| Emergency Escalation | On-Call Engineer | oncall@opstower.com | - |

---

**Checklist Version**: 1.0
**Last Updated**: 2026-02-07
**Next Review**: 2026-03-07
