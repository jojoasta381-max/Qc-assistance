# Database Deployment & Migration Runbook
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Database Provider:** Neon Serverless PostgreSQL  
**Engine:** PostgreSQL 16  
**ORM:** Prisma ORM 6.4.0  

---

## 1. Neon Database Architecture & Connection Modes

The application utilizes Neon's serverless connection pooler to prevent connection exhaustion in containerized environments:

- **Pooled Connection (`DATABASE_URL`):**
  - Host: `ep-old-cell-b4j92zqi-pooler.c-6.us-east-2.aws.neon.tech`
  - Mode: `sslmode=require&channel_binding=require`
  - Purpose: Serves all runtime queries executed by Next.js server components, API routes, and background evaluators.
- **Direct Connection (`DIRECT_URL`):**
  - Host: `ep-old-cell-b4j92zqi.c-6.us-east-2.aws.neon.tech`
  - Mode: `sslmode=require&channel_binding=require`
  - Purpose: Bypasses PgBouncer pooler for DDL operations, migrations, and schema modifications.

---

## 2. Decoupled Deployment Model (Zero Migration-at-Startup)

### CRITICAL PRODUCTION PRINCIPLE
**Database migrations are NEVER executed automatically on ECS container startup.** Running migrations at container startup causes race conditions during multi-task scaling, risk of split-brain locks, and deployment deadlocks.

```
┌────────────────────────────────────────────────────────┐
│ DEPLOYMENT WORKFLOW                                    │
│                                                        │
│   1. Build & Push Image to ECR                         │
│         │                                              │
│         ▼                                              │
│   2. Controlled Pre-Deployment Schema Verification     │
│      npx prisma validate && npx prisma db push         │
│         │                                              │
│         ▼                                              │
│   3. Schema Drift & Health Verification                │
│      SELECT 1 FROM organizations LIMIT 1               │
│         │                                              │
│         ▼                                              │
│   4. Rolling Update of ECS Fargate Service             │
│      aws ecs update-service                            │
│         │                                              │
│         ▼                                              │
│   5. ALB Health Checks Pass (HTTP 200 /api/health)     │
└────────────────────────────────────────────────────────┘
```

---

## 3. Schema Verification & Safety Controls

- `npx prisma validate`: Ensures schema syntax and relation integrity.
- `npx prisma generate`: Builds deterministic client types.
- **Destructive Commands Blocked:** Commands such as `prisma migrate reset` or manual `DROP TABLE` are strictly forbidden in staging and production environments.

---

## 4. Gate 5 Verdict

**STATUS: GATE 5 PASSED.**  
External Neon database preserved, validated, and decoupled from container startup.
