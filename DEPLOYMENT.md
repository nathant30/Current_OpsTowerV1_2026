# OpsTower Deployment Documentation

## Production Environment

### Infrastructure Overview

**VPC Architecture:**

- **Production VPC:** `vpc-03ba10b81bad3c042` (10.0.0.0/16)
  - Application Load Balancer
  - ECS Fargate Service
  - Security Groups

- **Default VPC:** `vpc-0a8fb232a21f74849` (172.31.0.0/16)
  - Redis Cluster
  - RDS PostgreSQL Database

- **VPC Peering:** `pcx-0fd3228f3ce8aca43`
  - Enables communication between production VPC and default VPC
  - Route tables updated in both VPCs

### Production URLs

- **Application:** http://xpressops-prod-alb-145068629.ap-southeast-1.elb.amazonaws.com/
- **Region:** ap-southeast-1 (Singapore)

### AWS Resources

#### ECS Configuration

- **Cluster:** xpressops-cluster
- **Service:** xpressops-tower-prod
- **Task Definition:** xpressops-tower:3
- **Launch Type:** Fargate
- **Desired Count:** 1
- **Container Port:** 3000

#### Load Balancer

- **Name:** xpressops-prod-alb
- **ARN:** arn:aws:elasticloadbalancing:ap-southeast-1:074872034309:loadbalancer/app/xpressops-prod-alb/5b0bce79f7a01d96
- **Target Group:** xpressops-prod-tg
- **Health Check Path:** /
- **Health Check Interval:** 30 seconds

#### Security Groups

1. **ALB Security Group:** `sg-04d54f1c186933142`
   - Inbound: 0.0.0.0/0 on port 80 (HTTP)

2. **ECS Security Group:** `sg-0ffd248f74e07c957`
   - Inbound: sg-04d54f1c186933142 on port 3000 (from ALB)
   - Outbound: All traffic

3. **Redis/RDS Security Group:** `sg-086cd50ac505dd259`
   - Inbound: sg-0ffd248f74e07c957 on port 6379 (Redis)
   - Inbound: sg-0ffd248f74e07c957 on port 5432 (PostgreSQL)
   - Note: Cross-VPC access via VPC peering

#### Database Resources

**Redis:**

- **Cluster ID:** xpressops-redis
- **Engine:** Redis 7.1.0
- **Node Type:** cache.t3.micro
- **Endpoint:** xpressops-redis.9fmqm0.0001.apse1.cache.amazonaws.com:6379
- **VPC:** vpc-0a8fb232a21f74849 (default VPC)

**RDS PostgreSQL:**

- **Instance ID:** xpressops-db
- **Engine:** PostgreSQL 16.11
- **Instance Class:** db.t3.micro
- **Storage:** 20 GB
- **Endpoint:** xpressops-db.cf0ksaoqq9lo.ap-southeast-1.rds.amazonaws.com:5432
- **VPC:** vpc-0a8fb232a21f74849 (default VPC)

#### Container Registry

- **ECR Repository:** xpressops-tower
- **Registry:** 074872034309.dkr.ecr.ap-southeast-1.amazonaws.com

### Environment Variables

The following environment variables are configured in the ECS task definition:

```
NODE_ENV=production
DATABASE_URL=postgresql://xpressops_admin:***@xpressops-db.cf0ksaoqq9lo.ap-southeast-1.rds.amazonaws.com:5432/xpressops?sslmode=require
REDIS_URL=redis://xpressops-redis.9fmqm0.0001.apse1.cache.amazonaws.com:6379
JWT_SECRET=***
JWT_ACCESS_SECRET=***
JWT_REFRESH_SECRET=***
JWT_EXPIRES_IN=24h
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=*** (needs to be set via GitHub Secrets)
```

### GitHub Actions Secrets Required

Configure these secrets in your GitHub repository settings:

1. `AWS_ACCESS_KEY_ID` - AWS access key for deployment
2. `AWS_SECRET_ACCESS_KEY` - AWS secret access key
3. `JWT_SECRET` - JWT signing secret
4. `JWT_ACCESS_SECRET` - Access token secret
5. `JWT_REFRESH_SECRET` - Refresh token secret
6. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

### Deployment Workflow

**Important:** Update `.github/workflows/deploy.yml` line 78 to use the correct service name:

```yaml
# Change from:
--service xpressops-tower-service \

# To:
--service xpressops-tower-prod \
```

**Deployment Steps:**

1. Push code to main branch
2. GitHub Actions automatically:
   - Builds the application
   - Creates Docker image
   - Pushes to ECR
   - Updates ECS service

### Manual Deployment

To deploy manually:

```bash
# 1. Build and push Docker image
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 074872034309.dkr.ecr.ap-southeast-1.amazonaws.com

docker build -t xpressops-tower:latest .
docker tag xpressops-tower:latest 074872034309.dkr.ecr.ap-southeast-1.amazonaws.com/xpressops-tower:latest
docker push 074872034309.dkr.ecr.ap-southeast-1.amazonaws.com/xpressops-tower:latest

# 2. Update ECS service
aws ecs update-service \
  --region ap-southeast-1 \
  --cluster xpressops-cluster \
  --service xpressops-tower-prod \
  --force-new-deployment
```

### Monitoring

**CloudWatch Logs:**

- Log Group: `/ecs/xpressops-tower`
- View logs:
  ```bash
  aws logs tail /ecs/xpressops-tower --region ap-southeast-1 --follow
  ```

**ECS Service Status:**

```bash
aws ecs describe-services \
  --region ap-southeast-1 \
  --cluster xpressops-cluster \
  --services xpressops-tower-prod
```

**Target Health:**

```bash
aws elbv2 describe-target-health \
  --region ap-southeast-1 \
  --target-group-arn arn:aws:elasticloadbalancing:ap-southeast-1:074872034309:targetgroup/xpressops-prod-tg/f807c2f849ac917e
```

### Troubleshooting

#### App not accessible (503 error)

1. Check target health:

   ```bash
   aws elbv2 describe-target-health --region ap-southeast-1 --target-group-arn arn:aws:elasticloadbalancing:ap-southeast-1:074872034309:targetgroup/xpressops-prod-tg/f807c2f849ac917e
   ```

2. Check ECS service:

   ```bash
   aws ecs describe-services --region ap-southeast-1 --cluster xpressops-cluster --services xpressops-tower-prod
   ```

3. Check logs:
   ```bash
   aws logs tail /ecs/xpressops-tower --region ap-southeast-1 --since 10m
   ```

#### Redis connection errors

- Verify VPC peering is active
- Check security group rules allow traffic from ECS security group
- Verify routes are configured in both VPCs

#### Database connection errors

- Check security group rules
- Verify DATABASE_URL is correct in task definition
- Check RDS instance status

### Cost Optimization

**Current Monthly Costs (Estimated):**

- ECS Fargate (1 task, 0.25 vCPU, 0.5 GB): ~$3-5
- ALB: ~$16-20
- RDS db.t3.micro: ~$15-20
- Redis cache.t3.micro: ~$12-15
- **Total: ~$46-60/month**

### Security Considerations

1. **Secrets Management:**
   - All secrets stored in GitHub Secrets
   - No hardcoded credentials in code
   - Environment variables injected at runtime

2. **Network Security:**
   - VPC peering for cross-VPC communication
   - Security groups restrict access
   - No public access to databases

3. **Application Security:**
   - JWT-based authentication
   - HTTPS recommended (add ACM certificate)
   - Rate limiting recommended

### Next Steps

1. **Add HTTPS:**
   - Request ACM certificate
   - Add HTTPS listener to ALB
   - Update security groups

2. **Custom Domain:**
   - Register domain
   - Create Route53 hosted zone
   - Point domain to ALB

3. **Monitoring & Alerts:**
   - Set up CloudWatch alarms
   - Configure SNS notifications
   - Add APM tool (DataDog, New Relic, etc.)

4. **Backup Strategy:**
   - Enable automated RDS snapshots
   - Configure Redis backup/persistence
   - Set up S3 for application backups

5. **Scaling:**
   - Configure ECS auto-scaling
   - Add more availability zones
   - Consider multi-region deployment

---

Last Updated: 2026-02-07
