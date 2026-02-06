# Custom Domain Setup Guide

## Prerequisites

- A registered domain name (e.g., xpressops.com)
- Access to AWS Console
- Access to your domain registrar (GoDaddy, Namecheap, etc.)

## Step 1: Request SSL Certificate (for HTTPS)

```bash
# Request certificate via AWS CLI
aws acm request-certificate \
  --region ap-southeast-1 \
  --domain-name xpressops.com \
  --subject-alternative-names www.xpressops.com \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text
```

**Or via AWS Console:**

1. Go to **Certificate Manager** (ACM) in `ap-southeast-1` region
2. Click "Request certificate"
3. Enter domain names:
   - `xpressops.com`
   - `www.xpressops.com`
4. Choose **DNS validation**
5. Click "Request"

## Step 2: Validate Certificate

1. In ACM, click on your certificate
2. Copy the CNAME record name and value
3. Add this CNAME record to your domain's DNS settings
4. Wait 5-30 minutes for validation

## Step 3: Create Route 53 Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name xpressops.com \
  --caller-reference $(date +%s) \
  --query 'HostedZone.Id' \
  --output text
```

**Or via AWS Console:**

1. Go to **Route 53**
2. Click "Create hosted zone"
3. Enter domain name: `xpressops.com`
4. Click "Create hosted zone"
5. Note the 4 nameservers (NS records)

## Step 4: Update Domain Nameservers

Go to your domain registrar (GoDaddy, Namecheap, etc.) and update nameservers to the 4 Route 53 nameservers from Step 3.

Example:

```
ns-1234.awsdns-12.org
ns-5678.awsdns-56.com
ns-9012.awsdns-90.net
ns-3456.awsdns-34.co.uk
```

**Note:** DNS propagation can take 24-48 hours.

## Step 5: Add HTTPS Listener to Load Balancer

```bash
# Get certificate ARN
CERT_ARN=$(aws acm list-certificates --region ap-southeast-1 --query 'CertificateSummaryList[?DomainName==`xpressops.com`].CertificateArn' --output text)

# Add HTTPS listener
aws elbv2 create-listener \
  --region ap-southeast-1 \
  --load-balancer-arn arn:aws:elasticloadbalancing:ap-southeast-1:074872034309:loadbalancer/app/xpressops-prod-alb/5b0bce79f7a01d96 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-southeast-1:074872034309:targetgroup/xpressops-prod-tg/f807c2f849ac917e
```

**Or via AWS Console:**

1. Go to **EC2 → Load Balancers**
2. Select `xpressops-prod-alb`
3. Click "Listeners" tab
4. Click "Add listener"
5. Protocol: HTTPS, Port: 443
6. Select your ACM certificate
7. Forward to target group: `xpressops-prod-tg`
8. Click "Add"

## Step 6: Update ALB Security Group

```bash
# Allow HTTPS traffic
aws ec2 authorize-security-group-ingress \
  --region ap-southeast-1 \
  --group-id sg-04d54f1c186933142 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

## Step 7: Create DNS Records in Route 53

```bash
# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='xpressops.com.'].Id" --output text | cut -d'/' -f3)

# Create A record (alias to ALB)
cat > create-record.json <<EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "xpressops.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z1LMS91P8CMLE5",
        "DNSName": "xpressops-prod-alb-145068629.ap-southeast-1.elb.amazonaws.com",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://create-record.json

# Create www subdomain
cat > create-www-record.json <<EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "www.xpressops.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z1LMS91P8CMLE5",
        "DNSName": "xpressops-prod-alb-145068629.ap-southeast-1.elb.amazonaws.com",
        "EvaluateTargetHealth": true
      }
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://create-www-record.json
```

**Or via AWS Console:**

1. Go to **Route 53 → Hosted zones**
2. Click on your hosted zone
3. Click "Create record"
4. Record name: (leave empty for root domain)
5. Record type: A
6. Toggle "Alias" to ON
7. Route traffic to: Alias to Application Load Balancer
8. Region: ap-southeast-1
9. Select your ALB
10. Click "Create records"
11. Repeat for `www` subdomain

## Step 8: Add HTTP → HTTPS Redirect (Optional but Recommended)

```bash
# Create redirect listener
aws elbv2 create-listener \
  --region ap-southeast-1 \
  --load-balancer-arn arn:aws:elasticloadbalancing:ap-southeast-1:074872034309:loadbalancer/app/xpressops-prod-alb/5b0bce79f7a01d96 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}"
```

**Or via AWS Console:**

1. Select HTTP:80 listener
2. Edit rules
3. Change default action to "Redirect"
4. Protocol: HTTPS, Port: 443
5. Status code: 301

## Step 9: Test Your Domain

```bash
# Test DNS resolution
dig xpressops.com
dig www.xpressops.com

# Test HTTPS
curl -I https://xpressops.com
curl -I https://www.xpressops.com

# Test HTTP redirect
curl -I http://xpressops.com
```

## Step 10: Update Google Maps API Restrictions

1. Go to **Google Cloud Console**
2. Navigate to **APIs & Services → Credentials**
3. Click on your Google Maps API key
4. Under "Application restrictions":
   - Select "HTTP referrers"
   - Add: `https://xpressops.com/*`
   - Add: `https://www.xpressops.com/*`
5. Save changes

## Verification Checklist

- [ ] Certificate validated and issued
- [ ] Route 53 hosted zone created
- [ ] Domain nameservers updated
- [ ] HTTPS listener added to ALB
- [ ] Security group allows port 443
- [ ] DNS A records created
- [ ] HTTP → HTTPS redirect configured
- [ ] Domain resolves correctly
- [ ] HTTPS works with valid certificate
- [ ] Google Maps API restrictions updated

## Estimated Timeline

- Certificate validation: 5-30 minutes
- DNS propagation: 1-48 hours (usually < 1 hour)
- Total setup time: 15-30 minutes (excluding DNS propagation)

## Cost Breakdown

- Route 53 hosted zone: $0.50/month
- Route 53 queries: $0.40 per million (first 1 billion)
- ACM certificate: **FREE**
- Domain registration: $12-50/year (if purchasing new domain)

## Troubleshooting

### Certificate stuck in "Pending validation"

- Check CNAME record is added correctly in DNS
- Wait 30 minutes, can take time to propagate
- Make sure CNAME is added to the root domain's DNS (not Route 53 if using external DNS)

### Domain not resolving

- Check nameservers are updated at registrar
- Wait for DNS propagation (up to 48 hours)
- Use `dig xpressops.com` to check resolution

### "Your connection is not private" error

- Certificate may not be installed on HTTPS listener
- Check certificate status in ACM
- Verify correct certificate is selected on listener

### Google Maps not loading

- Check API key restrictions match new domain
- Clear browser cache
- Check browser console for errors

---

## After Setup Complete

Your app will be accessible at:

- **https://xpressops.com** ✅
- **https://www.xpressops.com** ✅
- http://xpressops.com → redirects to HTTPS ✅

The old AWS URL will still work but users should use your custom domain.

---

Last Updated: 2026-02-07
