# AWS Infrastructure Rollback Protocol
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Environment:** AWS Staging & Vercel Fallback  

---

## 1. Two-Tier Rollback Capability

The infrastructure preserves a two-tier safety net:

```
┌────────────────────────────────────────────────────────┐
│ LEVEL 1: Intra-AWS Container / Image Rollback          │
│ (Rollback to previous Git SHA image in ECS)            │
│ Recovery Time Objective (RTO): ~60-90 seconds          │
├────────────────────────────────────────────────────────┤
│ LEVEL 2: Cloud Ingress Fallback to Vercel              │
│ (Route traffic back to https://qc-assistance.vercel.app│
│ Recovery Time Objective (RTO): Instant / DNS-driven    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Level 1 Rollback: ECS Image Rollback

If a newly deployed container image in ECS exhibits runtime defects:

1. Retrieve previous successful image tag from ECR:
   ```bash
   aws ecr list-images --repository-name spanqc-staging --region ap-south-1
   ```
2. Trigger deployment with the previous known-good tag:
   ```bash
   cd infra/terraform/environments/staging
   terraform apply -var="image_tag=<PREVIOUS_GOOD_GIT_SHA>" -auto-approve
   ```
   Or update the task definition revision directly:
   ```bash
   aws ecs update-service \
     --cluster spanqc-staging-cluster \
     --service spanqc-staging-service \
     --task-definition spanqc-staging-task:<PREVIOUS_REVISION_NUMBER> \
     --region ap-south-1
   ```

---

## 3. Level 2 Rollback: Vercel Cloud Fallback

The Vercel deployment at `https://qc-assistance.vercel.app/` remains active and connected to Neon PostgreSQL.

If AWS infrastructure encounters an outage or regional disruption in `ap-south-1`:
1. Vercel deployment is immediately available at `https://qc-assistance.vercel.app/`.
2. DNS CNAME records can be updated to point to `cname.vercel-dns.com` without data loss because the Neon PostgreSQL database is shared and decoupled.

---

## 4. Verification Check After Rollback
```bash
curl -f http://<ALB_DNS>/api/health
curl -f https://qc-assistance.vercel.app/api/health
```
