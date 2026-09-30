# AWS Staging Deployment Runbook & Operating Procedures
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Target Environment:** AWS ECS Fargate Staging (`ap-south-1`)  
**ECR Repository:** `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging`  
**Cluster:** `spanqc-staging-cluster`  
**Service:** `spanqc-staging-service`  

---

## 1. Prerequisites
- Docker CLI installed and authenticated with AWS ECR.
- AWS CLI configured with region `ap-south-1`.
- Terraform `>= 1.5.0` installed.
- All preflight tests pass (`npm test`, `npx tsc --noEmit`, `npm run lint`).

---

## 2. Standard Deployment Steps

### Step 1: Quality Gate Verification
```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

### Step 2: Build & Tag Container
```bash
GIT_SHA=$(git rev-parse --short HEAD)
ECR_URI="905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging"

docker build -t spanqc:staging .
docker tag spanqc:staging "${ECR_URI}:${GIT_SHA}"
docker tag spanqc:staging "${ECR_URI}:staging"
```

### Step 3: Authenticate & Push to ECR
```bash
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin 905418293374.dkr.ecr.ap-south-1.amazonaws.com

docker push "${ECR_URI}:${GIT_SHA}"
docker push "${ECR_URI}:staging"
```

### Step 4: Terraform Apply (or ECS Service Force Redeploy)
```bash
# If Terraform configuration changed:
cd infra/terraform/environments/staging
terraform apply -var="image_tag=${GIT_SHA}" -auto-approve

# If only redeploying container with new image:
aws ecs update-service \
  --cluster spanqc-staging-cluster \
  --service spanqc-staging-service \
  --force-new-deployment \
  --region ap-south-1
```

### Step 5: Post-Deployment Smoke Verification
```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names spanqc-staging-alb \
  --region ap-south-1 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

curl -s "http://${ALB_DNS}/api/health" | jq .
curl -s "http://${ALB_DNS}/api/ready" | jq .
```
