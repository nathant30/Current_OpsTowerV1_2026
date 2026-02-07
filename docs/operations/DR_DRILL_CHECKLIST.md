# OpsTower Disaster Recovery Drill Checklist

**Purpose**: Quarterly disaster recovery testing procedure
**Target RTO**: 4 hours
**Target RPO**: 1 hour
**Frequency**: Quarterly (Jan, Apr, Jul, Oct)
**Created**: 2026-02-07
**Issue**: #23 - Backup & DR Testing

---

## Overview

This checklist guides the execution of quarterly DR drills to:
- ✅ Validate backup and recovery procedures
- ✅ Measure actual RTO/RPO performance
- ✅ Train team on disaster response
- ✅ Identify and resolve gaps in documentation
- ✅ Ensure compliance with business continuity requirements

### DR Drill Schedule

| Quarter | Month | Preferred Date | Scenario |
|---------|-------|----------------|----------|
| Q1 | January | 3rd Sunday | Database Corruption |
| Q2 | April | 3rd Sunday | Server Failure |
| Q3 | July | 3rd Sunday | Data Deletion |
| Q4 | October | 3rd Sunday | Full Infrastructure Failure |

---

## Pre-Drill Preparation (1 Week Before)

### Planning Phase

- [ ] **Schedule Drill**
  - [ ] Select date and time (low-traffic period)
  - [ ] Duration: 4-6 hours
  - [ ] Confirm availability of all participants

- [ ] **Assign Roles**
  - [ ] Incident Commander: ______________________
  - [ ] Database Lead: ______________________
  - [ ] DevOps Lead: ______________________
  - [ ] Communications Lead: ______________________
  - [ ] Security Lead: ______________________
  - [ ] Observer/Timekeeper: ______________________

- [ ] **Prepare Environment**
  - [ ] Identify test/staging environment
  - [ ] Verify staging database is separate from production
  - [ ] Ensure adequate resources (CPU, RAM, disk)
  - [ ] Create test data snapshot (if needed)

- [ ] **Review Documentation**
  - [ ] DR Runbook: `docs/operations/DR_RUNBOOK.md`
  - [ ] Backup Guide: `docs/operations/BACKUP_RECOVERY.md`
  - [ ] Recent backup verification reports
  - [ ] System architecture diagrams

- [ ] **Communication Plan**
  - [ ] Create Slack channel: `#dr-drill-YYYY-MM-DD`
  - [ ] Prepare stakeholder notification templates
  - [ ] Configure incident tracking system
  - [ ] Set up video conference (if remote)

- [ ] **Tools & Access**
  - [ ] Verify all participants have required access
  - [ ] Test backup download from S3
  - [ ] Ensure AWS CLI configured
  - [ ] Verify database credentials
  - [ ] Confirm VPN access (if needed)

- [ ] **Documentation**
  - [ ] Print DR runbook (backup copy)
  - [ ] Prepare drill observation form
  - [ ] Create timing spreadsheet
  - [ ] Set up incident log document

---

## Drill Day - Pre-Execution (30 minutes before)

### Final Preparations

- [ ] **Team Assembly**
  - [ ] All participants joined Slack channel
  - [ ] Video conference running
  - [ ] Role assignments confirmed
  - [ ] Timekeeper ready

- [ ] **Environment Check**
  - [ ] Test environment accessible
  - [ ] Backup files available
  - [ ] Monitoring systems active
  - [ ] Communication channels tested

- [ ] **Briefing**
  - [ ] Review drill scenario
  - [ ] Clarify objectives
  - [ ] Remind team this is a TEST
  - [ ] Emphasize learning over perfection
  - [ ] Start incident log

- [ ] **Start Conditions**
  - [ ] Record start time: ____________ (HH:MM)
  - [ ] Take environment baseline snapshots
  - [ ] Document current system state
  - [ ] Begin recording (if applicable)

---

## Scenario 1: Database Corruption Recovery

**Drill Duration**: 2-3 hours
**Scenario**: Production database has corruption, must restore from backup

### Phase 1: Detection & Assessment (15 minutes)

**Target Time**: 15 minutes | **Actual Time**: ______

- [ ] **T+0:00 - Incident Trigger**
  - [ ] Simulate detection (monitoring alert OR manual discovery)
  - [ ] Record detection method: ________________________
  - [ ] Document initial symptoms: ________________________

- [ ] **T+0:02 - Initial Response**
  - [ ] Incident Commander activated
  - [ ] Create incident channel
  - [ ] Begin incident log
  - [ ] Assign roles

- [ ] **T+0:05 - Assessment**
  - [ ] Connect to database
  - [ ] Check PostgreSQL logs
  - [ ] Identify corruption extent
  - [ ] Estimate impact (% of tables affected)
  - [ ] Document findings

- [ ] **T+0:10 - Severity Classification**
  - [ ] Classify incident severity (P0/P1/P2/P3)
  - [ ] Determine if DR response required
  - [ ] Identify affected services
  - [ ] Estimate user impact

- [ ] **T+0:15 - Decision Point**
  - [ ] Confirm DR procedure required
  - [ ] Select recovery strategy
  - [ ] Communicate to stakeholders
  - [ ] Proceed to containment

**Phase 1 Observations**:
```
Time taken: _______ minutes
Issues encountered: _________________________________
What went well: _________________________________
What needs improvement: _________________________________
```

---

### Phase 2: Containment (15 minutes)

**Target Time**: 15 minutes | **Actual Time**: ______

- [ ] **T+0:15 - Service Shutdown**
  - [ ] Stop application services
    ```bash
    pm2 stop opstower
    # OR
    systemctl stop opstower
    ```
  - [ ] Verify services stopped
  - [ ] Update status page: "Major Outage - Investigating"

- [ ] **T+0:18 - Database Isolation**
  - [ ] Terminate existing connections
    ```sql
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'opstower' AND pid <> pg_backend_pid();
    ```
  - [ ] Prevent new connections
    ```sql
    ALTER DATABASE opstower ALLOW_CONNECTIONS false;
    ```

- [ ] **T+0:20 - Emergency Backup**
  - [ ] Attempt emergency backup of corrupted DB
    ```bash
    ./scripts/backup-database.sh --local-only
    ```
  - [ ] Note: May fail if corruption severe (acceptable)
  - [ ] Document backup attempt result

- [ ] **T+0:25 - Communication**
  - [ ] Notify stakeholders of downtime
  - [ ] Provide ETA (2 hours)
  - [ ] Update status page with details

- [ ] **T+0:30 - Checkpoint**
  - [ ] Containment complete
  - [ ] No further data corruption
  - [ ] Ready for recovery phase

**Phase 2 Observations**:
```
Time taken: _______ minutes
Issues encountered: _________________________________
Communication effectiveness: _________________________________
```

---

### Phase 3: Recovery (45 minutes)

**Target Time**: 45 minutes | **Actual Time**: ______

- [ ] **T+0:30 - Identify Backup**
  - [ ] List available backups
    ```bash
    ls -lth /var/backups/opstower/*.sql.gz | head -10
    ```
  - [ ] Check backup age
  - [ ] Calculate data loss (RPO impact)
  - [ ] Select backup to restore: ________________________

- [ ] **T+0:35 - Verify Backup Integrity**
  - [ ] Run verification script
    ```bash
    ./scripts/verify-backup.sh /var/backups/opstower/BACKUP_FILE.sql.gz
    ```
  - [ ] Confirm all tests pass
  - [ ] Review backup metadata

- [ ] **T+0:40 - Pre-Restore Preparation**
  - [ ] Download backup from S3 (if needed)
  - [ ] Verify disk space
  - [ ] Prepare restore environment
  - [ ] Document restore plan

- [ ] **T+0:45 - Execute Restore**
  - [ ] Start database restoration
    ```bash
    ./scripts/restore-database.sh /var/backups/opstower/BACKUP_FILE.sql.gz --force
    ```
  - [ ] Monitor restore progress
  - [ ] Watch for errors in log
  - [ ] Record restore start time

- [ ] **T+1:00 - Restoration Progress**
  - [ ] Check restoration status
  - [ ] Estimated completion time: ______
  - [ ] Any errors encountered: ______

- [ ] **T+1:15 - Restoration Complete**
  - [ ] Verify restore completion
  - [ ] Record restore end time
  - [ ] Review restore log
  - [ ] Document any warnings/errors

**Phase 3 Observations**:
```
Time taken: _______ minutes
Backup file used: _________________________
Data loss (minutes): _______
Issues encountered: _________________________________
```

---

### Phase 4: Verification (30 minutes)

**Target Time**: 30 minutes | **Actual Time**: ______

- [ ] **T+1:15 - Database Integrity Check**
  - [ ] Connect to restored database
    ```bash
    psql -h localhost -U opstower_user -d opstower
    ```
  - [ ] Check table count
    ```sql
    SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
    ```
  - [ ] Verify database size
    ```sql
    SELECT pg_size_pretty(pg_database_size('opstower'));
    ```

- [ ] **T+1:20 - Data Validation**
  - [ ] Check critical tables
    ```sql
    SELECT COUNT(*) FROM bookings;
    SELECT COUNT(*) FROM payments;
    SELECT COUNT(*) FROM users;
    SELECT COUNT(*) FROM drivers;
    ```
  - [ ] Verify recent data
    ```sql
    SELECT MAX(created_at) FROM bookings;
    SELECT MAX(created_at) FROM payments;
    ```
  - [ ] Run data integrity queries
  - [ ] Document any missing data

- [ ] **T+1:25 - Application Testing**
  - [ ] Start application services
    ```bash
    pm2 start opstower
    ```
  - [ ] Wait for startup (2 minutes)
  - [ ] Check application logs

- [ ] **T+1:30 - Health Checks**
  - [ ] API health endpoint
    ```bash
    curl http://localhost:4000/api/health
    ```
  - [ ] Database connection test
    ```bash
    curl http://localhost:4000/api/database/performance
    ```
  - [ ] Test critical endpoints
    ```bash
    curl http://localhost:4000/api/v1/bookings
    curl http://localhost:4000/api/payments/methods
    ```

- [ ] **T+1:35 - Smoke Testing**
  - [ ] Test user login flow
  - [ ] Test booking creation
  - [ ] Test payment processing
  - [ ] Test driver assignment
  - [ ] Verify dashboard loads
  - [ ] Check real-time features

- [ ] **T+1:45 - Performance Check**
  - [ ] Monitor response times
  - [ ] Check database query performance
  - [ ] Verify no errors in logs
  - [ ] Monitor system resources

**Phase 4 Observations**:
```
Time taken: _______ minutes
All systems operational: Yes / No
Performance issues: _________________________________
Data integrity confirmed: Yes / No
```

---

### Phase 5: Service Restoration (15 minutes)

**Target Time**: 15 minutes | **Actual Time**: ______

- [ ] **T+1:45 - Production Cutover Decision**
  - [ ] Review all verification results
  - [ ] Confirm system stability
  - [ ] Get approval from Incident Commander
  - [ ] Decision: Proceed / Abort

- [ ] **T+1:50 - Public Communication**
  - [ ] Update status page: "Resolved"
  - [ ] Send user notification
  - [ ] Communicate data loss (if any)
  - [ ] Provide incident summary

- [ ] **T+1:55 - Monitoring Setup**
  - [ ] Enable enhanced monitoring
  - [ ] Watch for anomalies (30 minutes)
  - [ ] Monitor user feedback
  - [ ] Check error rates

- [ ] **T+2:00 - Drill Complete**
  - [ ] Record end time
  - [ ] **Total Recovery Time**: _______ hours _______ minutes
  - [ ] Incident Commander declares resolution
  - [ ] Begin post-mortem process

**Phase 5 Observations**:
```
Time taken: _______ minutes
Communication clarity: _________________________________
Team coordination: _________________________________
```

---

## Scenario 2: Complete Server Failure

**Drill Duration**: 3-4 hours
**Scenario**: Primary server unresponsive, must provision new infrastructure

### Execution Checklist

- [ ] **Phase 1: Assessment (10 min)**
  - [ ] Confirm server failure
  - [ ] Check cloud provider status
  - [ ] Verify other systems
  - [ ] Activate DR plan

- [ ] **Phase 2: Infrastructure Provisioning (60 min)**
  - [ ] Launch new server instance (EC2/Droplet/VM)
  - [ ] Configure OS and dependencies
  - [ ] Install PostgreSQL
  - [ ] Install Node.js and dependencies
  - [ ] Configure networking and security groups

- [ ] **Phase 3: Data Restoration (45 min)**
  - [ ] Download latest backup from S3
  - [ ] Verify backup integrity
  - [ ] Restore database to new server
  - [ ] Verify database restoration

- [ ] **Phase 4: Application Deployment (30 min)**
  - [ ] Clone repository
  - [ ] Install dependencies (`npm ci`)
  - [ ] Configure environment variables
  - [ ] Build application (`npm run build`)
  - [ ] Start services

- [ ] **Phase 5: DNS Cutover (15 min)**
  - [ ] Update DNS records
  - [ ] Verify DNS propagation
  - [ ] Test external access
  - [ ] Monitor traffic switch

- [ ] **Phase 6: Verification (20 min)**
  - [ ] Run full test suite
  - [ ] Verify all functionality
  - [ ] Monitor for errors
  - [ ] Decommission old server

**Total Time**: _______ hours _______ minutes

---

## Scenario 3: Accidental Data Deletion

**Drill Duration**: 1 hour
**Scenario**: Critical data accidentally deleted, need point-in-time recovery

### Execution Checklist

- [ ] **Phase 1: Assess Damage (10 min)**
  - [ ] Identify deleted data
  - [ ] Determine deletion timestamp
  - [ ] Calculate impact (rows affected)
  - [ ] Stop ongoing operations

- [ ] **Phase 2: Select Recovery Point (5 min)**
  - [ ] Find backup before deletion
  - [ ] Verify backup contains data
  - [ ] Calculate data loss window

- [ ] **Phase 3: Partial Restore (40 min)**
  - [ ] Extract specific tables from backup
  - [ ] Restore to temporary database
  - [ ] Identify missing records
  - [ ] Merge data back to production

- [ ] **Phase 4: Verification (5 min)**
  - [ ] Verify data restored
  - [ ] Check data consistency
  - [ ] Test application functionality

**Total Time**: _______ minutes

---

## Post-Drill Activities (Within 1 Week)

### Immediate Post-Drill (Day 1)

- [ ] **Team Debrief (30 minutes)**
  - [ ] Gather team feedback
  - [ ] Discuss what went well
  - [ ] Identify pain points
  - [ ] Collect improvement suggestions

- [ ] **Metrics Collection**
  - [ ] Calculate actual RTO: _______ hours _______ minutes
  - [ ] Calculate actual RPO: _______ minutes
  - [ ] Compare to targets (RTO: 4 hours, RPO: 1 hour)
  - [ ] Identify performance gaps

- [ ] **Documentation Update**
  - [ ] Update DR runbook with findings
  - [ ] Document new procedures discovered
  - [ ] Fix any documentation errors
  - [ ] Add troubleshooting tips

### DR Drill Report (Within 3 Days)

- [ ] **Executive Summary**
  - [ ] Drill date and participants
  - [ ] Scenario tested
  - [ ] Overall success/failure
  - [ ] RTO/RPO performance
  - [ ] Key findings

- [ ] **Detailed Timeline**
  - [ ] Phase-by-phase breakdown
  - [ ] Actual vs target times
  - [ ] Bottlenecks identified
  - [ ] Delays and causes

- [ ] **Issues Encountered**
  - [ ] Technical issues
  - [ ] Process gaps
  - [ ] Communication problems
  - [ ] Documentation errors
  - [ ] Training needs

- [ ] **Lessons Learned**
  - [ ] What worked well
  - [ ] What needs improvement
  - [ ] Unexpected challenges
  - [ ] Team performance

- [ ] **Action Items**
  - [ ] Prioritized improvement list
  - [ ] Owners assigned
  - [ ] Due dates set
  - [ ] Track to completion

### Follow-Up Actions (Within 1 Week)

- [ ] **Process Improvements**
  - [ ] Update procedures
  - [ ] Automate manual steps
  - [ ] Improve tooling
  - [ ] Enhance monitoring

- [ ] **Training**
  - [ ] Identify skill gaps
  - [ ] Schedule training sessions
  - [ ] Update training materials
  - [ ] Cross-train team members

- [ ] **Documentation**
  - [ ] Update all affected docs
  - [ ] Create new playbooks
  - [ ] Add troubleshooting guides
  - [ ] Version control updates

- [ ] **Management Presentation**
  - [ ] Present findings to leadership
  - [ ] Request resources if needed
  - [ ] Get approval for changes
  - [ ] Share success metrics

---

## DR Drill Scoring Rubric

### Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Detection Time | 5 min | _____ | ⬜ |
| Communication Speed | 10 min | _____ | ⬜ |
| Containment Time | 15 min | _____ | ⬜ |
| Recovery Time | 45 min | _____ | ⬜ |
| Verification Time | 30 min | _____ | ⬜ |
| **Total RTO** | **4 hours** | **_____** | **⬜** |
| Data Loss (RPO) | 1 hour | _____ | ⬜ |

### Success Criteria

- [ ] ✅ RTO < 4 hours achieved
- [ ] ✅ RPO < 1 hour achieved
- [ ] ✅ All data restored correctly
- [ ] ✅ Application fully functional
- [ ] ✅ No critical issues encountered
- [ ] ✅ Team followed procedures correctly
- [ ] ✅ Communication was effective
- [ ] ✅ Documentation was accurate

### Overall Grade

| Category | Score (1-5) | Notes |
|----------|-------------|-------|
| Speed | ⬜⬜⬜⬜⬜ | |
| Accuracy | ⬜⬜⬜⬜⬜ | |
| Communication | ⬜⬜⬜⬜⬜ | |
| Teamwork | ⬜⬜⬜⬜⬜ | |
| Documentation | ⬜⬜⬜⬜⬜ | |
| **Overall** | **___/25** | |

**Rating Scale**:
- 20-25: Excellent - Well prepared
- 15-19: Good - Minor improvements needed
- 10-14: Fair - Significant gaps
- 5-9: Poor - Major improvements required
- 0-4: Critical - Immediate action required

---

## Continuous Improvement

### Quarterly Review Cycle

**After Each Drill**:
1. ✅ Complete drill report
2. ✅ Implement quick fixes
3. ✅ Update documentation
4. ✅ Track action items

**Annual Review**:
1. ✅ Review all 4 quarterly drills
2. ✅ Identify recurring issues
3. ✅ Measure year-over-year improvement
4. ✅ Update DR strategy
5. ✅ Present to executive team

### Best Practices

✅ **Do**:
- Treat drills seriously
- Document everything
- Learn from mistakes
- Improve continuously
- Train regularly
- Update documentation

❌ **Don't**:
- Skip drills
- Rush through procedures
- Ignore findings
- Blame team members
- Test in production
- Skip documentation updates

---

## Appendix: Quick Reference

### Critical Commands

```bash
# Backup
./scripts/backup-database.sh

# Verify
./scripts/verify-backup.sh /var/backups/opstower/BACKUP.sql.gz

# Restore
./scripts/restore-database.sh /var/backups/opstower/BACKUP.sql.gz --force

# List backups
ls -lth /var/backups/opstower/*.sql.gz

# S3 backups
aws s3 ls s3://opstower-backups/database/ --recursive --human-readable

# Health check
curl http://localhost:4000/api/health
```

### Contact List

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | ______ | ______ | ______ |
| Database Lead | ______ | ______ | ______ |
| DevOps Lead | ______ | ______ | ______ |
| Security Lead | ______ | ______ | ______ |
| On-Call Engineer | ______ | ______ | ______ |

### Emergency Escalation

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: CTO

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-07
**Next Drill**: ________________
**Maintained By**: Docs & Git Coordinator
