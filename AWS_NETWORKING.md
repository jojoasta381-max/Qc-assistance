# AWS Networking & Topology Specification
**Project:** SpanQC / Wiring Diagram QC Assistant  
**AWS Region:** `ap-south-1` (Mumbai)  
**VPC ID:** `vpc-04633279bc7985525` (CIDR `172.31.0.0/16`)  

---

## 1. Network Architecture Diagram

```
                              THE INTERNET
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AWS VPC (ap-south-1) 172.31.0.0/16                                     │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Internet-Facing Application Load Balancer                      │   │
│   │ SG: spanqc-staging-alb-sg (Ingress: 80, 443; Egress: All)      │   │
│   │ Subnets: ap-south-1a, ap-south-1b, ap-south-1c                 │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                     │
│                        Port 3000 │ (Internal Route)                    │
│                                  ▼                                     │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ ECS Fargate Tasks (Next.js Standalone Container)               │   │
│   │ SG: spanqc-staging-ecs-sg (Ingress: :3000 from ALB SG ONLY)    │   │
│   │ Direct internet inbound to tasks is BLOCKED                    │   │
│   │ Direct internet outbound enabled for secure TLS connections    │   │
│   └───────────────┬───────────────────────────────┬────────────────┘   │
│                   │                               │                    │
└───────────────────┼───────────────────────────────┼────────────────────┘
                    │ HTTPS:443                     │ TLS:5432
                    ▼                               ▼
       Amazon S3 & Secrets Manager          Neon PostgreSQL
       (ap-south-1 Private Storage)        (External DB Cluster)
```

---

## 2. Security Group Matrix

### ALB Security Group: `spanqc-staging-alb-sg` (`sg-01809349db6a39036`)
- **Ingress:**
  - `TCP 80` from `0.0.0.0/0` (HTTP web ingress)
  - `TCP 443` from `0.0.0.0/0` (HTTPS web ingress)
- **Egress:**
  - `TCP 3000` to `spanqc-staging-ecs-sg`

### ECS Service Security Group: `spanqc-staging-ecs-sg` (`sg-07504aa207e61a0b9`)
- **Ingress:**
  - `TCP 3000` strictly restricted to `spanqc-staging-alb-sg` (`sg-01809349db6a39036`). No public IPs can reach the container directly.
- **Egress:**
  - `All Outbound (0.0.0.0/0)` to reach external Neon PostgreSQL database over SSL (Port 5432), AWS S3 (Port 443), and AWS Secrets Manager (Port 443).

---

## 3. Cost-Conscious NAT Gateway Architecture Decision

- **Analysis:** AWS NAT Gateways incur a baseline cost of **$0.045/hour (~$32.40/month per AZ)** plus data processing fees ($0.045/GB). A standard multi-AZ NAT setup adds **~$65-70/month** in fixed idle overhead.
- **Trade-off Decision:** For the staging environment, ECS Fargate tasks are assigned public IPs within public subnets, but **incoming traffic from the internet is completely blocked at the Security Group layer** (`spanqc-staging-ecs-sg` only permits ingress from the ALB security group).
- **Security Posture:** Inbound traffic cannot bypass the ALB; egress traffic utilizes the existing Internet Gateway directly with $0 NAT overhead.
- **Production Path:** For strict enterprise compliance in future phases, tasks can be migrated into isolated private subnets with VPC Endpoints (PrivateLink) for S3, ECR, and Secrets Manager.

---

## 4. Gate 4 (Networking) Verdict

**STATUS: NETWORKING IMPLEMENTED & CONFIGURED VIA TERRAFORM.**
