# Production Observability & Monitoring Baseline
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Region:** `ap-south-1` (Mumbai)  

---

## 1. Implemented Observability Baseline

| Observability Domain | Implementation | Storage / Interface |
| :--- | :--- | :--- |
| **Application Logging** | CloudWatch Logs (`/ecs/spanqc-staging`) | 14-day retention, structured JSON outputs |
| **Container Metrics** | ECS Container Insights | CPU/Memory utilization, network Rx/Tx, task counts |
| **Load Balancer Metrics** | CloudWatch ALB Metrics | RequestCount, TargetResponseTime, HTTPCode_Target_2XX_Count, HTTPCode_Target_5XX_Count |
| **Health Probes** | ALB Health Checks on `/api/health` | Probes database connectivity (`SELECT 1`), frequency 30s |
| **Audit Trails** | PostgreSQL `audit_events` table | Immutable tenant-scoped audit logging for auth, documents, QC reviews |

---

## 2. Log Structure & Security Invariants

All container stdout/stderr streams are piped to CloudWatch via `awslogs`.

### Security Protections:
- **No Credentials:** Passwords, HMAC secrets, database credentials, and session tokens are scrubbed from logs.
- **No Raw Document Payloads:** Drawing binary contents and confidential engineering vectors are never logged to stdout.
- **Tenant Context:** High-level events include sanitized `tenantId` and `documentId` for correlation.

---

## 3. Recommended Future Improvements (Post-Pilot)

1. **APM / Tracing:** AWS X-Ray or OpenTelemetry SDK integration for distributed tracing across PDF extraction and rule evaluator stages.
2. **Alerting:** CloudWatch Alarms sending SNS notifications for ALB 5xx rates > 1% or container memory > 80%.
3. **Dashboard:** Unified CloudWatch dashboard displaying active tenants, QC inspections per hour, and average graph build latency.
