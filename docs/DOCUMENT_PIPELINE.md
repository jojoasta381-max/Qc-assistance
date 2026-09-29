# SpanQC Production Document Pipeline (Phase 3)

## Overview

SpanQC enforces that **uploaded bytes are the sole source of truth**. Every synthetic template fallback, fixture override (`WH-402`, `CAD_DIAGRAM_TEMPLATES`, `MCC-VFD`), static token array, and hardcoded page dimension heuristic has been eliminated from the production ingestion pipeline.

---

## 1. End-to-End Ingestion Flow

```
User (Inspector/Admin)
       │
       │ 1. POST /api/v1/documents/upload-session
       ▼
Next.js Ingestion Route (Auth & Quota Validation)
       │
       ├─ Authenticate JWT & extract tenantId (RBAC: 'document:upload')
       ├─ Verify project belongs to tenant (Tenant boundary isolation)
       ├─ Reserve quota atomically (decrement available document checks)
       ├─ Create DB Document record (`uploadStatus: 'UPLOADING'`)
       ├─ Generate authoritative object key (no client-controlled paths)
       ├─ Generate presigned upload URL (S3 PUT or HMAC-signed direct stream)
       ▼
Client Receives Upload Session Info
       │
       │ 2. Direct PUT of binary bytes to Presigned URL
       ▼
Private Object Storage (S3 / Local Private Vault)
       │
       │ 3. POST /api/v1/documents/[id]/upload-complete
       ▼
Verification Route (Integrity Check)
       │
       ├─ HeadObject / stat verification (authoritative size)
       ├─ Read binary bytes & compute authoritative SHA-256
       ├─ Verify magic bytes against declared MIME type
       ├─ Update DB Document & Version metadata (`sha256`, `sizeBytes`, `mimeType`)
       ├─ Mark document as `uploadStatus: 'READY_FOR_PREFLIGHT'`
       ▼
4. POST /api/v1/documents/[id]/process
       │
       ├─ Create ProcessingJob (`status: 'PENDING'`, `stage: 'QUEUED'`)
       ├─ Launch background pipeline (`runDocumentProcessingPipeline`)
       ▼
Pipeline Worker Execution
       ├─ [STAGE: PREFLIGHT]
       │   ├─ Inspect binary header, trailer, xref, catalog, and MediaBox
       │   ├─ For PDF: Detect true page count, page dimensions, text/vector/raster ratio, encryption
       │   ├─ For Images: Decode via Sharp, determine dimensions, format, color space, corruption
       │   └─ Reject malformed/password-protected files safely (FAIL_CLOSED)
       ├─ [STAGE: EXTRACTING]
       │   ├─ ProductionDocumentExtractor parses true PDF text streams with bbox coordinates
       │   ├─ Normalize coordinates to standard [0, 1000] top-left coordinate system
       │   ├─ Preserve true engineering drawing text (e.g. J1, F1, W101, GND)
       ├─ [STAGE: OCR_PROCESSING]
       │   ├─ If raster-only and OCR configured: run real OCR provider
       │   └─ If OCR unconfigured: record truth status `OCR_UNAVAILABLE` (NO fake OCR)
       ├─ [STAGE: PERSISTING]
       │   ├─ Persist DocumentPage rows in PostgreSQL (dimensions, page number, text snippet)
       │   ├─ Store ExtractionArtifact rows (`PREFLIGHT_METADATA`, `NORMALIZED_PAGES`)
       │   └─ Update ProcessingJob (`status: 'COMPLETED'`, `progress: 100%`)
       ▼
Document State: `READY_FOR_GRAPH`
```

---

## 2. Processing States Matrix

| State / Stage | Meaning | Trigger |
| :--- | :--- | :--- |
| `UPLOADING` | Upload session initialized; awaiting binary transfer. | `POST /upload-session` |
| `READY_FOR_PREFLIGHT` | Binary bytes received, SHA-256 verified, stored safely. | `POST /upload-complete` |
| `QUEUED` | Processing job created in database. | `POST /process` |
| `PREFLIGHT` | Worker is reading bytes and verifying file structure. | Pipeline Worker |
| `EXTRACTING` | Text streams, geometry, and pages being extracted. | Pipeline Worker |
| `OCR_PROCESSING` | Running OCR provider on scanned pages if needed. | Pipeline Worker |
| `READY_FOR_GRAPH` | Extraction finished and persisted; ready for Phase 4. | Pipeline Worker |
| `FAILED` | Process failed safely with machine-readable error code. | Any error catch |

---

## 3. Truthful Coordinate & Evidence Model

Extracted evidence preserves the exact spatial geometry from the drawing:

```typescript
interface ExtractedBlock {
  id: string;
  type: 'text' | 'vector' | 'image';
  text?: string;
  confidence: number;
  source: 'pdf-text' | 'ocr' | 'vector';
  bbox: {
    x: number;      // 0 to 1000 (normalized relative to page width)
    y: number;      // 0 to 1000 (normalized relative to page height)
    width: number;
    height: number;
  };
}
```

- **Origin**: Top-left corner `(0, 0)`.
- **Normalization**: Width and height are scaled to `1000 x 1000` to ensure scale-invariance across different DPIs.
- **Evidence Verification**: No synthetic coordinates are ever injected.
