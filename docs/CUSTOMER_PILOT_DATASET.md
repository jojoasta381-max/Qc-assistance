# SpanQC Customer Pilot Dataset Architecture & Handling Protocol

## 1. Objectives & Compliance Principles

When customer organizations authorize real electrical schematics and harness drawings for benchmark evaluation, the drawings must be governed by strict confidentiality, data protection, and isolation protocols.

Under no circumstances may customer drawings be:
- Committed to public or private source code repositories.
- Used to train or fine-tune public LLMs or machine learning models.
- Shared across tenant boundaries or exposed to unauthorized users.
- Mixed with synthetic test fixtures in misleading aggregate metrics.

---

## 2. Dataset Ingestion Lifecycle

```
Customer Non-Disclosure Agreement (NDA) & Authorization
                         │
                         ▼
             Secure Storage Partitioning
        (`organizations/<tenantId>/benchmark/`)
                         │
                         ▼
        Cryptographic SHA-256 Integrity Seal
                         │
                         ▼
      Optional Redaction / Anonymization Phase
  (Removal of proprietary logos, customer title blocks)
                         │
                         ▼
         Ground-Truth Engineering Annotation
        (`benchmark/annotations/<id>_bench.json`)
                         │
                         ▼
          Corpus Taxonomy Classification
        (`CAT-01` through `CAT-10` categorization)
                         │
                         ▼
            Authoritative Evaluation Run
     (Segregated reporting from synthetic unit tests)
```

---

## 3. Storage & Access Controls

1. **Storage Partitioning**:
   - Customer files reside exclusively in tenant-scoped object storage prefixes:
     `organizations/${tenantId}/pilot-drawings/${documentId}/${sha256}`
   - Access requires HMAC-signed presigned URLs with short lifespans ($\le 15$ minutes).
2. **Access Control**:
   - Only authorized organization members with `document:read` permission may access drawing assets.
   - Database records enforce foreign key cascade and mandatory tenant filtering.
3. **Audit Logging**:
   - Every read, download, or review action emits an immutable `AuditLog` event recording actor ID, tenant ID, timestamp, and IP address.

---

## 4. Anonymization & Sanitization Protocol

Before a customer drawing is registered into the differential benchmark catalog:
1. **Title Block Sanitization**: Company logos, contract numbers, project code names, and proprietary customer watermarks may be redacted if requested by the customer.
2. **Topological Preservation**: The underlying electrical topology (components, terminals, vector lines, wire labels, and reference designators) is preserved in full to ensure rigorous engineering analysis.
3. **Stable Cryptographic Identifier**: The source drawing is assigned a deterministic identifier derived from its SHA-256 digest rather than commercial filenames.

---

## 5. Machine-Readable Annotation Standards

Authorized drawings are annotated using the validated schema in `benchmark/annotations/schema.json`:
- `document`: id, sourceSha256, pageCount, drawingType (`VECTOR_PDF`, `RASTER_IMAGE`, `MIXED_VECTOR_RASTER`)
- `expectedComponents`: refDes, type, bbox, valueRating
- `expectedTerminals`: pin labels and positions
- `expectedWires`: endpoints and connectivity
- `expectedNets`: electrical net groupings
- `expectedFindings`: confirmed non-conformances with rule codes and severities

---

## 6. Retention, Revocation & Deletion

1. **Customer Revocation**: A customer organization may revoke benchmark authorization at any time.
2. **Cryptographic Deletion**: Upon revocation, the storage object, database metadata, and associated ground-truth annotation files are permanently purged.
3. **Audit Record Preservation**: Audit log metadata retains record of the deletion action without retaining drawing binaries or intellectual property.

---

## 7. Status Integrity

Until authorized customer drawings are officially ingested, annotated, and evaluated across all 10 categories, the platform reports:
```text
REAL_BENCHMARK_STATUS = INSUFFICIENT_DATA
```
This status guarantees full commercial truthfulness and prevents unsubstantiated marketing claims.
