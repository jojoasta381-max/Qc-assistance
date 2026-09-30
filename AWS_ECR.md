# AWS ECR Specification & Runbook
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Repository Name:** `spanqc-staging`  
**Registry ID / Account:** `905418293374`  
**AWS Region:** `ap-south-1` (Mumbai)  
**Repository URI:** `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging`  

---

## 1. ECR Repository Details

- **ARN:** `arn:aws:ecr:ap-south-1:905418293374:repository/spanqc-staging`
- **Image Scanning:** Enabled on Push (`scanOnPush: true`)
- **Encryption:** AES-256 (KMS-compatible)
- **Tag Mutability:** `MUTABLE` (Allows moving pointer tags like `staging` while preserving immutable commit tags like `f5a2dd1`)

---

## 2. Authentication

To authenticate local Docker client or CI/CD runner against ECR:

```bash
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin 905418293374.dkr.ecr.ap-south-1.amazonaws.com
```

---

## 3. Build, Tagging & Push Protocol

Every container image built for deployment MUST be tied to an explicit Git commit SHA.

### Step 1: Deterministic Build
```bash
docker build -t spanqc:staging .
```

### Step 2: Tri-Tagging Convention
Tag with:
1. Exact Git SHA (Immutable trace): `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:<GIT_SHA>`
2. Release version tag: `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:v5.5`
3. Environment alias: `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:staging`

```bash
GIT_SHA=$(git rev-parse --short HEAD)
ECR_URI="905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging"

docker tag spanqc:staging "${ECR_URI}:${GIT_SHA}"
docker tag spanqc:staging "${ECR_URI}:v5.5"
docker tag spanqc:staging "${ECR_URI}:staging"
```

### Step 3: Push to ECR
```bash
docker push "${ECR_URI}:${GIT_SHA}"
docker push "${ECR_URI}:v5.5"
docker push "${ECR_URI}:staging"
```

---

## 4. Current Images in Registry

| Tag | Image Digest | Deployed Git Commit |
| :--- | :--- | :--- |
| `f5a2dd1` | `sha256:ff036d4e54e97496eff6142cb071fa2bb1ddad31fe7718d72f7a5dacdbc50de6` | Commit `f5a2dd1` |
| `staging` | `sha256:ff036d4e54e97496eff6142cb071fa2bb1ddad31fe7718d72f7a5dacdbc50de6` | Latest Staging Pointer |
| `v5.5` | `sha256:ff036d4e54e97496eff6142cb071fa2bb1ddad31fe7718d72f7a5dacdbc50de6` | Phase 5.5 Frozen Release |

---

## 5. Rollback Procedure

To roll back an ECS service to a previous image without rebuilding:

1. Identify the desired Git commit SHA tag from ECR:
   ```bash
   aws ecr list-images --repository-name spanqc-staging --region ap-south-1
   ```
2. Update the ECS task definition to reference that exact image SHA tag:
   ```bash
   aws ecs update-service \
     --cluster spanqc-staging-cluster \
     --service spanqc-staging-service \
     --task-definition spanqc-staging-task:<PREVIOUS_REVISION> \
     --region ap-south-1
   ```

---

## 6. Image Lifecycle Policy

To prevent uncontrolled image accumulation and unnecessary storage charges, the following lifecycle policy is actively applied:

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Expire untagged images older than 1 day",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 1
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Keep last 30 tagged production images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 30
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

---

## 7. Gate 2 Verdict

**STATUS: GATE 2 PASSED.**  
Proceed to Gate 3 (Private S3, IAM Roles & Secrets Manager).
