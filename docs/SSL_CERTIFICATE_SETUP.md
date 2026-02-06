# SSL/TLS Certificate Setup Guide

## OpsTower V1 2026 - Security Coordinator

**Last Updated**: 2026-02-06
**Status**: Production Ready
**Issue**: #14 - HTTPS/SSL Configuration
**Classification**: Security Critical

---

## Table of Contents

1. [Overview](#overview)
2. [Railway Deployment](#railway-deployment)
3. [Vercel Deployment](#vercel-deployment)
4. [Custom Domain Setup](#custom-domain-setup)
5. [SSL Certificate Verification](#ssl-certificate-verification)
6. [Security Headers](#security-headers)
7. [Troubleshooting](#troubleshooting)
8. [Compliance](#compliance)

---

## Overview

OpsTower implements comprehensive HTTPS/SSL security to protect data in transit. This guide covers SSL certificate setup for production deployments on Railway and Vercel.

### Security Features

- **Automatic HTTPS Redirect**: All HTTP traffic redirected to HTTPS (301)
- **HSTS Headers**: Strict-Transport-Security enforced
- **TLS 1.2+**: Modern encryption protocols only
- **Free SSL Certificates**: Automatic provisioning via Let's Encrypt
- **Auto-Renewal**: Certificates renewed automatically before expiry

### Infrastructure

- **Railway**: Backend services (database, Redis, API)
- **Vercel**: Next.js frontend (static + serverless functions)
- Both platforms provide free, automatic SSL certificates

---

## Railway Deployment

Railway provides automatic HTTPS for all deployments with free SSL certificates from Let's Encrypt.

### 1. Deploy Application

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 2. Custom Domain Setup

**Step 1: Add Custom Domain**
```
Railway Dashboard → Project → Settings → Domains
→ Add Domain → Enter: opstower.com
```

**Step 2: Configure DNS Records**

Add CNAME record at your DNS provider:
```
Type: CNAME
Name: @  (or www)
Value: [your-project].up.railway.app
TTL: 3600 (or automatic)
```

**Step 3: SSL Certificate Provisioning**

Railway automatically provisions SSL certificate:
- Certificate issued by Let's Encrypt
- Typically takes 1-5 minutes
- Auto-renews before expiration (every 90 days)

**Step 4: Verify HTTPS**

```bash
# Check SSL certificate
curl -I https://opstower.com

# Expected response includes:
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains; preload
```

### 3. Environment Variables

Set HTTPS-specific environment variables:

```bash
# Railway Dashboard → Environment Variables
NODE_ENV=production
FORCE_HTTPS=true
CORS_ALLOWED_ORIGINS=https://opstower.com,https://www.opstower.com
```

### 4. Database SSL/TLS

Enable SSL for PostgreSQL connections:

```bash
# Railway Dashboard → PostgreSQL → Settings
SSL Mode: require

# Update DATABASE_URL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

**Connection String Options**:
```
sslmode=disable   # ❌ NEVER use in production
sslmode=require   # ✅ Require encrypted connection
sslmode=verify-ca # ✅ Verify certificate authority
sslmode=verify-full # ✅ Full certificate verification (recommended)
```

### 5. Railway SSL Best Practices

```typescript
// lib/config/railway.ts
export const railwayConfig = {
  database: {
    ssl: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      ca: process.env.DATABASE_CA_CERT,
    },
  },
  redis: {
    tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  },
};
```

---

## Vercel Deployment

Vercel automatically provisions SSL certificates for all deployments.

### 1. Deploy Application

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### 2. Custom Domain Setup

**Step 1: Add Domain**
```
Vercel Dashboard → Project → Settings → Domains
→ Add Domain → Enter: opstower.com
```

**Step 2: Configure DNS**

Vercel provides two options:

**Option A: Use Vercel Nameservers (Recommended)**
```
Update nameservers at your domain registrar:
NS1: ns1.vercel-dns.com
NS2: ns2.vercel-dns.com
```

**Option B: CNAME Record**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

**Step 3: SSL Certificate Provisioning**

Vercel automatically:
- Provisions Let's Encrypt SSL certificate
- Enables HTTPS immediately
- Auto-renews before expiration
- Supports wildcard certificates (*.opstower.com)

**Step 4: Verify**

```bash
# Check SSL
curl -I https://opstower.com

# Verify Vercel headers
# x-vercel-id: present
# strict-transport-security: present
```

### 3. Environment Variables

```bash
# Vercel Dashboard → Project → Settings → Environment Variables

# Production environment
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.opstower.com
NEXT_PUBLIC_WS_URL=wss://api.opstower.com

# Mark as "Production" scope
# Enable "Sensitive" flag for secrets
```

### 4. Deployment Hooks

Configure automatic HTTPS redirect:

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

### 5. Vercel Edge Network

Vercel provides:
- **Global CDN**: SSL termination at edge
- **DDoS Protection**: Built-in security
- **Automatic IPv6**: Dual-stack support
- **HTTP/2 & HTTP/3**: Modern protocols

---

## Custom Domain Setup

### DNS Configuration Checklist

#### Primary Domain (opstower.com)

```
# A Records (if using A records)
Type: A
Name: @
Value: [Vercel/Railway IP]
TTL: 3600

# CNAME (recommended)
Type: CNAME
Name: @
Value: [your-project].vercel.app
TTL: 3600

# WWW redirect
Type: CNAME
Name: www
Value: opstower.com
TTL: 3600
```

#### API Subdomain (api.opstower.com)

```
Type: CNAME
Name: api
Value: [railway-project].up.railway.app
TTL: 3600
```

#### Wildcard Certificate

For subdomains like `*.opstower.com`:

**Vercel**: Automatic wildcard SSL
**Railway**: Requires manual configuration

### Domain Propagation

```bash
# Check DNS propagation
dig opstower.com
dig www.opstower.com
dig api.opstower.com

# Check SSL certificate
openssl s_client -connect opstower.com:443 -servername opstower.com

# Verify HTTPS redirect
curl -I http://opstower.com
# Should return: 301 Moved Permanently
# Location: https://opstower.com/
```

### Multiple Domains

```
opstower.com          → Vercel (frontend)
www.opstower.com      → Vercel (redirect to opstower.com)
api.opstower.com      → Railway (backend API)
ws.opstower.com       → Railway (WebSocket)
admin.opstower.com    → Vercel (admin portal)
```

---

## SSL Certificate Verification

### 1. Certificate Details

```bash
# View certificate details
openssl s_client -connect opstower.com:443 -servername opstower.com < /dev/null 2>/dev/null | openssl x509 -noout -text

# Expected:
# Issuer: Let's Encrypt
# Subject: CN=opstower.com
# Validity: Not After (90 days from issue)
# Subject Alternative Names: opstower.com, www.opstower.com
```

### 2. SSL Labs Test

Test SSL configuration quality:
```
https://www.ssllabs.com/ssltest/analyze.html?d=opstower.com
```

**Target Grade**: A or A+

**Requirements**:
- TLS 1.2 minimum
- Strong cipher suites
- HSTS enabled
- Certificate chain complete
- No mixed content

### 3. Security Headers Verification

```bash
# Check security headers
curl -I https://opstower.com

# Required headers:
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
content-security-policy: [policy]
```

### 4. HTTPS Redirect Test

```bash
# Test HTTP to HTTPS redirect
curl -I http://opstower.com

# Expected:
# HTTP/1.1 301 Moved Permanently
# Location: https://opstower.com/
```

### 5. HSTS Preload

Submit domain for HSTS preload:
```
https://hstspreload.org/

Requirements:
✓ Serve valid certificate
✓ Redirect HTTP to HTTPS
✓ Serve HSTS header on base domain
✓ max-age >= 31536000 (1 year)
✓ includeSubDomains directive
✓ preload directive
```

---

## Security Headers

OpsTower implements comprehensive security headers (configured in `src/middleware/security.ts`):

### 1. Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose**: Force HTTPS for all connections
**Effect**: Browser remembers to always use HTTPS for 1 year

### 2. Content-Security-Policy (CSP)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; ...
```

**Purpose**: Prevent XSS attacks
**Configuration**: See `next.config.js` for full policy

### 3. X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose**: Prevent clickjacking attacks

### 4. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose**: Prevent MIME type sniffing

### 5. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose**: Control referrer information leakage

### 6. Permissions-Policy

```
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(self)
```

**Purpose**: Control browser feature access

---

## Troubleshooting

### Common Issues

#### 1. SSL Certificate Not Provisioning

**Symptoms**:
- "Your connection is not private" error
- ERR_CERT_COMMON_NAME_INVALID

**Solutions**:
```bash
# Check DNS propagation
dig opstower.com +short

# Verify CNAME points to correct target
dig opstower.com CNAME +short

# Wait for DNS propagation (up to 48 hours)
# Retry SSL provisioning in platform dashboard
```

#### 2. Mixed Content Warnings

**Symptoms**:
- Browser console shows "Mixed Content" warnings
- Some resources loading over HTTP

**Solutions**:
```typescript
// Update all resource URLs to HTTPS
const apiUrl = 'https://api.opstower.com'; // ✅
const apiUrl = 'http://api.opstower.com';  // ❌

// Use protocol-relative URLs
const googleMaps = '//maps.googleapis.com/maps/api/js'; // ✅
```

#### 3. HTTPS Redirect Loop

**Symptoms**:
- Browser shows "Too many redirects"
- ERR_TOO_MANY_REDIRECTS

**Solutions**:
```typescript
// Check x-forwarded-proto header instead of request.nextUrl.protocol
if (request.headers.get('x-forwarded-proto') === 'http') {
  // Redirect to HTTPS
}
```

#### 4. CORS Issues with HTTPS

**Symptoms**:
- CORS errors in browser console
- OPTIONS preflight requests failing

**Solutions**:
```bash
# Update CORS_ALLOWED_ORIGINS to use HTTPS
CORS_ALLOWED_ORIGINS=https://opstower.com,https://www.opstower.com

# Remove HTTP origins from production
# CORS_ALLOWED_ORIGINS=http://localhost:3000 # ❌ (dev only)
```

#### 5. WebSocket Connection Failing

**Symptoms**:
- WebSocket connection errors
- "WebSocket connection failed"

**Solutions**:
```typescript
// Use wss:// instead of ws:// in production
const wsUrl = process.env.NODE_ENV === 'production'
  ? 'wss://api.opstower.com'
  : 'ws://localhost:4000';
```

### Debug Commands

```bash
# Test HTTPS redirect
curl -v http://opstower.com 2>&1 | grep Location

# Check SSL certificate
echo | openssl s_client -connect opstower.com:443 2>/dev/null | openssl x509 -noout -dates

# Test security headers
curl -I https://opstower.com | grep -i security

# Check DNS records
nslookup opstower.com
dig opstower.com ANY

# Test from different locations
curl -I https://opstower.com --resolve opstower.com:443:[IP]
```

---

## Compliance

### Philippine Regulations

#### BSP (Bangko Sentral ng Pilipinas)

**Requirements**:
- ✅ TLS 1.2 minimum for payment transactions
- ✅ Strong cipher suites (AES-256)
- ✅ Certificate validation enabled
- ✅ HSTS enabled for payment portals

#### BIR (Bureau of Internal Revenue)

**Requirements**:
- ✅ HTTPS for tax data transmission
- ✅ SSL certificate from trusted CA
- ✅ Secure API connections

#### Data Privacy Act (DPA)

**Requirements**:
- ✅ Encryption in transit (HTTPS)
- ✅ Personal data transmitted securely
- ✅ No mixed content warnings
- ✅ Certificate monitoring and renewal

### Industry Standards

#### PCI DSS Compliance

For payment card data:
- ✅ TLS 1.2+ required
- ✅ Strong cryptography
- ✅ Proper certificate validation
- ✅ HSTS enabled

#### OWASP Best Practices

- ✅ HTTPS everywhere
- ✅ Secure cookies (Secure, HttpOnly, SameSite)
- ✅ Security headers implemented
- ✅ Certificate pinning (optional)

---

## Certificate Management

### Monitoring

**Automated Monitoring**:
```typescript
// lib/monitoring/ssl-monitor.ts
export async function checkSSLExpiry(domain: string) {
  // Check certificate expiration
  // Alert if expiring within 30 days
  // Verify auto-renewal is working
}
```

**Manual Checks**:
```bash
# Add to monitoring dashboard
npm run ssl:check

# Expected output:
# ✅ opstower.com: Valid until 2026-05-06 (90 days)
# ✅ api.opstower.com: Valid until 2026-05-06 (90 days)
```

### Renewal Process

**Automatic Renewal** (Railway/Vercel):
- Let's Encrypt certificates auto-renew at 60 days
- Platform handles renewal automatically
- Zero downtime during renewal

**Manual Verification**:
```bash
# Check renewal status (monthly)
railway ssl:status
vercel certs ls

# Expected: "Auto-renew: Enabled"
```

---

## Security Checklist

### Pre-Deployment

- [ ] Custom domain configured
- [ ] DNS records propagated
- [ ] SSL certificate provisioned
- [ ] HTTPS redirect enabled
- [ ] Security headers configured
- [ ] Mixed content warnings resolved
- [ ] CORS origins updated to HTTPS
- [ ] WebSocket using wss://
- [ ] Database SSL enabled
- [ ] Environment variables use HTTPS URLs

### Post-Deployment

- [ ] SSL Labs test: Grade A or A+
- [ ] HSTS header present
- [ ] HTTP redirects to HTTPS (301)
- [ ] Certificate valid and trusted
- [ ] No mixed content warnings
- [ ] WebSocket connections working
- [ ] API CORS working correctly
- [ ] Certificate monitoring enabled
- [ ] Team notified of HTTPS URLs
- [ ] Documentation updated

### Ongoing

- [ ] Monitor certificate expiration (monthly)
- [ ] Verify auto-renewal working (quarterly)
- [ ] Run SSL Labs test (quarterly)
- [ ] Review security headers (quarterly)
- [ ] Update cipher suites as needed
- [ ] Test HTTPS redirect (monthly)
- [ ] Audit HTTPS-only enforcement (quarterly)

---

## Resources

### Tools

- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **HSTS Preload**: https://hstspreload.org/
- **Certificate Decoder**: https://www.sslshopper.com/certificate-decoder.html
- **DNS Checker**: https://dnschecker.org/

### Documentation

- **Railway SSL**: https://docs.railway.app/deploy/deployments#ssl
- **Vercel Domains**: https://vercel.com/docs/concepts/projects/domains
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Mozilla SSL Config**: https://ssl-config.mozilla.org/

### Standards

- **TLS Best Practices**: https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices
- **OWASP Transport Layer Security**: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
- **BSP Circulars**: https://www.bsp.gov.ph/

---

## Support

### SSL Issues

Report SSL/TLS issues to: **security@opstower.com**

### Emergency Contact

For certificate expiration or SSL outages:
- **Security Team**: #security-alerts
- **On-Call**: See internal wiki

---

**Document Owner**: Security Coordinator
**Review Cycle**: Quarterly
**Next Review**: 2026-05-06
