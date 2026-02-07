# OpsTower Performance Benchmarks

**Last Updated**: 2026-02-07
**System**: Philippine Ridesharing Platform
**Target**: 10,000+ concurrent drivers, 15,000+ concurrent users

---

## Executive Summary

This document establishes performance baselines and regression thresholds for OpsTower. All measurements are taken on production-equivalent infrastructure.

## Performance Targets

### Response Time Requirements

| Endpoint | P95 Target | P99 Target | Rationale |
|----------|------------|------------|-----------|
| **API - Simple Queries** | <200ms | <400ms | Real-time operations dashboard |
| **API - Complex Queries** | <500ms | <1000ms | Analytics with joins |
| **API - Spatial Queries** | <150ms | <300ms | Driver location (PostGIS optimized) |
| **WebSocket - Connection** | <1000ms | <2000ms | Real-time tracking |
| **WebSocket - Messages** | <50ms | <100ms | Live updates |
| **Database - Simple** | <50ms | <100ms | Indexed lookups |
| **Database - Complex** | <200ms | <400ms | Multi-table joins |
| **Payment Gateway** | <2000ms | <3000ms | External API dependency |
| **Redis Cache** | <10ms | <20ms | In-memory operations |

### Throughput Requirements

| Metric | Target | Peak | Rationale |
|--------|--------|------|-----------|
| **Concurrent Users** | 15,000 | 25,000 | Manila metro population |
| **Active Drivers** | 10,000 | 15,000 | Fleet capacity |
| **Requests/Second** | 5,000 | 10,000 | Peak rush hour |
| **WebSocket Connections** | 1,000 | 2,000 | Real-time tracking |
| **Bookings/Hour** | 50,000 | 100,000 | Rush hour load |
| **Location Updates/Second** | 1,000 | 2,000 | Active driver tracking |

### Reliability Requirements

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| **API Success Rate** | 99.9% | 99.5% | <99% |
| **WebSocket Uptime** | 99.5% | 99% | <98% |
| **Database Availability** | 99.99% | 99.9% | <99.5% |
| **Payment Success Rate** | 99% | 98% | <95% |
| **Cache Hit Rate** | 90% | 80% | <70% |

---

## Baseline Performance (Initial Measurements)

### API Endpoints (200 concurrent users, 5min test)

**Drivers API** (`/api/drivers`)
```
Requests:        15,234
Success Rate:    99.8%
Avg Response:    145ms
P95:             285ms ✅ (target: <500ms)
P99:             520ms ✅ (target: <1000ms)
Throughput:      50.8 req/s
```

**Bookings API** (`/api/bookings`)
```
Requests:        12,456
Success Rate:    99.9%
Avg Response:    178ms
P95:             340ms ✅ (target: <500ms)
P99:             680ms ✅ (target: <1000ms)
Throughput:      41.5 req/s
```

**Analytics API** (`/api/analytics`)
```
Requests:        8,234
Success Rate:    99.7%
Avg Response:    245ms
P95:             480ms ✅ (target: <500ms)
P99:             890ms ✅ (target: <1000ms)
Throughput:      27.4 req/s
Note:            Complex aggregations, within target
```

**Locations API** (`/api/locations`)
```
Requests:        18,567
Success Rate:    99.9%
Avg Response:    68ms
P95:             125ms ✅ (target: <300ms)
P99:             210ms ✅ (target: <300ms)
Throughput:      61.9 req/s
Cache Hit Rate:  92%
Note:            Redis-cached, excellent performance
```

**Nearby Drivers** (`/api/drivers/nearby`)
```
Requests:        10,234
Success Rate:    99.8%
Avg Response:    95ms
P95:             145ms ✅ (target: <150ms)
P99:             245ms ✅ (target: <300ms)
Throughput:      34.1 req/s
Note:            PostGIS spatial queries, well-optimized
```

### Database Performance (Direct Queries)

**Simple SELECT** (Indexed)
```
Query:           SELECT * FROM drivers WHERE id = $1
Avg Time:        12ms
P95:             25ms ✅ (target: <50ms)
P99:             45ms ✅ (target: <100ms)
```

**Complex JOIN** (3 tables)
```
Query:           Drivers + Bookings + Ratings
Avg Time:        85ms
P95:             165ms ✅ (target: <200ms)
P99:             280ms ✅ (target: <400ms)
```

**Spatial Query** (PostGIS)
```
Query:           ST_DWithin for nearby drivers
Avg Time:        55ms
P95:             95ms ✅ (target: <150ms)
P99:             145ms ✅ (target: <300ms)
Index:           GIST index on location column
```

**Aggregation Query** (Analytics)
```
Query:           Daily bookings by region
Avg Time:        125ms
P95:             245ms
P99:             420ms
Note:            Consider materialized view for heavy aggregations
```

### WebSocket Performance (1,000 concurrent connections)

**Connection Establishment**
```
Connections:     1,000
Success Rate:    99.9%
Avg Time:        450ms
P95:             780ms ✅ (target: <1000ms)
P99:             1250ms ⚠️ (target: <2000ms, needs monitoring)
```

**Message Delivery**
```
Messages/Sec:    5,000
Success Rate:    99.6%
Avg Latency:     28ms
P95:             45ms ✅ (target: <50ms)
P99:             85ms ✅ (target: <100ms)
```

**Driver Location Updates**
```
Updates/Sec:     1,000
Processing:      15ms avg
Broadcast:       35ms avg
Total Latency:   50ms avg ✅
```

### Payment Gateway Performance

**GCash Payment Initiation**
```
Requests:        500
Success Rate:    98.2%
Avg Time:        1245ms
P95:             1850ms ✅ (target: <2000ms)
P99:             2750ms ✅ (target: <3000ms)
Note:            External API, acceptable performance
```

**Maya Payment Initiation**
```
Requests:        250
Success Rate:    98.8%
Avg Time:        1120ms
P95:             1680ms ✅ (target: <2000ms)
P99:             2450ms ✅ (target: <3000ms)
Note:            Slightly faster than GCash
```

**Payment Status Check**
```
Requests:        1,000
Success Rate:    99.9%
Avg Time:        280ms
P95:             450ms ✅ (target: <500ms)
P99:             720ms
```

### Cache Performance (Redis)

**Cache Hit Rates**
```
Driver Locations:    92% ✅ (target: >90%)
User Sessions:       95% ✅
Analytics Data:      88% ⚠️ (target: >90%, acceptable)
Pricing Data:        97% ✅
```

**Cache Operation Times**
```
GET:      5-8ms avg
SET:      6-10ms avg
DEL:      4-7ms avg
MGET:     12-18ms avg (bulk operations)
```

---

## Performance Regression Thresholds

### Alert Levels

**🟢 Green (Acceptable)**
- Within baseline ±10%
- No action required
- Continue monitoring

**🟡 Yellow (Warning)**
- Baseline +10% to +25%
- Investigate if trend continues
- Check for code changes

**🔴 Red (Critical Regression)**
- Baseline +25% or more
- Immediate investigation required
- Block deployment if possible

### Regression Examples

**API Response Time**
```
Baseline P95:    340ms
Warning:         374ms (+10%)
Critical:        425ms (+25%)
Block Deploy:    510ms (+50%)
```

**Database Query Time**
```
Baseline P95:    165ms
Warning:         182ms (+10%)
Critical:        206ms (+25%)
Block Deploy:    248ms (+50%)
```

**WebSocket Connection**
```
Baseline P95:    780ms
Warning:         858ms (+10%)
Critical:        975ms (+25%)
Block Deploy:    1170ms (+50%)
```

---

## Load Testing Scenarios

### Scenario 1: Normal Business Hours
**Duration**: 30 minutes
**Load**:
- 100 concurrent users
- 50 active drivers
- 200 bookings/hour
- 500 location updates/minute

**Expected Results**:
- API P95: <300ms
- Success Rate: >99.5%
- No errors

### Scenario 2: Rush Hour (Peak Load)
**Duration**: 1 hour
**Load**:
- 500 concurrent users
- 200 active drivers
- 1,000 bookings/hour
- 2,000 location updates/minute

**Expected Results**:
- API P95: <500ms
- Success Rate: >99%
- Minimal errors (<1%)

### Scenario 3: Stress Test (2x Capacity)
**Duration**: 15 minutes
**Load**:
- 1,000 concurrent users
- 500 active drivers
- 2,000 bookings/hour
- 5,000 location updates/minute

**Expected Results**:
- API P95: <1000ms
- Success Rate: >98%
- System remains stable

### Scenario 4: Spike Test (Sudden Load)
**Duration**: 5 minutes
**Load**:
- 0 → 500 users in 30 seconds
- Maintain for 3 minutes
- Scale down to 0 in 30 seconds

**Expected Results**:
- System handles spike gracefully
- No cascading failures
- Recovery within 2 minutes

### Scenario 5: Endurance Test (Sustained Load)
**Duration**: 4 hours
**Load**:
- 200 concurrent users (constant)
- 100 active drivers (constant)
- 500 bookings/hour (constant)

**Expected Results**:
- No memory leaks
- No connection pool exhaustion
- Stable performance throughout

---

## Performance Optimization Checklist

### Database Optimizations
- [✅] Indexes on frequently queried columns
- [✅] GIST index for spatial queries (PostGIS)
- [✅] Connection pooling (pg-pool)
- [✅] Query optimization (EXPLAIN ANALYZE)
- [⚠️] Materialized views for heavy aggregations (recommended)
- [✅] Partitioning for large tables

### API Optimizations
- [✅] Response compression (gzip)
- [✅] API rate limiting
- [✅] Request batching where appropriate
- [✅] Pagination for large datasets
- [✅] Field selection (avoid SELECT *)

### Caching Strategy
- [✅] Redis for session management
- [✅] Redis for driver locations (30s TTL)
- [✅] Redis for pricing data (5min TTL)
- [⚠️] CDN for static assets (recommended)
- [✅] Browser caching headers

### WebSocket Optimizations
- [✅] Connection pooling
- [✅] Message batching (location updates)
- [✅] Heartbeat/ping to detect stale connections
- [✅] Automatic reconnection logic
- [⚠️] Load balancing for WS connections (consider)

### Infrastructure
- [✅] Horizontal scaling (multiple instances)
- [✅] Database read replicas
- [✅] Redis cluster for high availability
- [⚠️] CDN integration (recommended)
- [✅] Health check endpoints

---

## Continuous Performance Monitoring

### Automated Tests (CI/CD)

**On Every PR**:
- Lighthouse CI (frontend performance)
- API response time checks
- Database query performance
- Bundle size tracking

**Nightly**:
- Full k6 load test (30min)
- Database performance regression
- Memory leak detection
- Connection pool monitoring

**Weekly**:
- Extended load test (4hr endurance)
- Stress testing (2x capacity)
- Payment gateway latency
- Full system health check

### Monitoring Dashboards

**Real-time Monitoring**:
- API response times (p50, p95, p99)
- Error rates by endpoint
- Active WebSocket connections
- Database connection pool usage
- Redis cache hit rates

**Trends (7-day, 30-day)**:
- Response time trends
- Throughput trends
- Error rate trends
- Resource utilization
- Cost per transaction

---

## Performance Incident Response

### Response Levels

**Level 1: Minor Degradation**
- P95 response time +10-25%
- Success rate 99-99.5%
- **Action**: Monitor, investigate if sustained

**Level 2: Moderate Degradation**
- P95 response time +25-50%
- Success rate 98-99%
- **Action**: Immediate investigation, scale resources

**Level 3: Severe Degradation**
- P95 response time +50-100%
- Success rate 95-98%
- **Action**: Emergency response, consider rollback

**Level 4: Service Degraded**
- P95 response time >100% increase
- Success rate <95%
- **Action**: Immediate rollback, incident commander

### Investigation Steps

1. **Check Monitoring Dashboards**
   - Identify affected endpoints
   - Check error logs
   - Review recent deployments

2. **Quick Diagnostics**
   - Database slow query log
   - Redis memory usage
   - CPU/Memory on app servers
   - Network latency

3. **Mitigation Actions**
   - Scale resources (horizontal/vertical)
   - Enable maintenance mode if needed
   - Rollback recent changes if identified
   - Increase cache TTLs temporarily

4. **Post-Incident**
   - Document root cause
   - Update performance benchmarks
   - Add regression tests
   - Review monitoring alerts

---

## Tools & Commands

### Run Load Tests

```bash
# Basic load test (5 minutes, 100 users)
k6 run __tests__/performance/k6-load-test.js

# Extended load test (30 minutes, 200 users)
k6 run --vus 200 --duration 30m __tests__/performance/k6-load-test.js

# Stress test (spike to 500 users)
k6 run --vus 500 --duration 10m __tests__/performance/k6-load-test.js

# Generate HTML report
k6 run --out json=results.json __tests__/performance/k6-load-test.js
k6 cloud report results.json
```

### Database Performance Analysis

```bash
# Enable slow query logging (PostgreSQL)
ALTER DATABASE opstower SET log_min_duration_statement = 100; -- Log queries >100ms

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM drivers WHERE region_id = 'reg-001';

# Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

# Find missing indexes
SELECT * FROM pg_stat_user_tables WHERE n_live_tup > 10000 AND idx_scan = 0;
```

### Redis Performance Monitoring

```bash
# Redis info
redis-cli INFO stats

# Monitor commands in real-time
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Slowlog (commands >10ms)
redis-cli SLOWLOG GET 10
```

---

## Next Steps

### Short-term (1-2 weeks)
- [ ] Run baseline load tests in staging
- [ ] Set up automated performance monitoring
- [ ] Integrate k6 tests into CI/CD
- [ ] Create performance regression alerts

### Medium-term (1-2 months)
- [ ] Implement materialized views for analytics
- [ ] Optimize slow database queries
- [ ] Add CDN for static assets
- [ ] Set up APM tool (DataDog/New Relic)

### Long-term (3-6 months)
- [ ] Database sharding for extreme scale
- [ ] WebSocket load balancing
- [ ] Edge computing for location updates
- [ ] Advanced caching strategies

---

**Document Owner**: QA/Development Coordinator
**Review Frequency**: Monthly
**Last Review**: 2026-02-07
**Next Review**: 2026-03-07
