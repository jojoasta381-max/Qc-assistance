"""
Report Model Builder.
Constructs a standardized QCAnalysisResult domain object from database ORM records (QCRun, QCFinding, Document).
Used by PDFReportGenerator and XLSXReportGenerator for audit-grade reporting.
"""

from typing import List, Optional
from ..ai.schemas import (
    BoundingBox,
    Confidence,
    ConfidenceLevelEnum,
    OverallStatusEnum,
    QCAnalysisResult,
    QCFinding as SchemaQCFinding,
    QCSummary,
    SeverityEnum,
)
from ..infrastructure.models import Document, QCFinding, QCRun


def build_analysis_result_from_db(
    qc_run: QCRun,
    findings: List[QCFinding],
    doc: Optional[Document] = None,
) -> QCAnalysisResult:
    """
    Transforms database models into a validated QCAnalysisResult suitable for
    PDF and Excel report generation.
    """
    schema_findings: List[SchemaQCFinding] = []
    crit_count = 0
    maj_count = 0
    min_count = 0
    info_count = 0

    for idx, f in enumerate(findings, start=1):
        # 1. Format finding code
        code = f.finding_code if f.finding_code and f.finding_code.startswith("D-") else f"D-{idx:03d}"

        # 2. Parse Severity
        sev_str = (f.severity or "INFO").upper()
        if sev_str == "CRITICAL":
            sev = SeverityEnum.CRITICAL
            crit_count += 1
        elif sev_str == "MAJOR":
            sev = SeverityEnum.MAJOR
            maj_count += 1
        elif sev_str == "MINOR":
            sev = SeverityEnum.MINOR
            min_count += 1
        else:
            sev = SeverityEnum.INFO
            info_count += 1

        # 3. Parse Confidence
        conf_str = (f.confidence_level or "HIGH").upper()
        if conf_str == "LOW":
            conf_level = ConfidenceLevelEnum.LOW
        elif conf_str == "MEDIUM":
            conf_level = ConfidenceLevelEnum.MEDIUM
        else:
            conf_level = ConfidenceLevelEnum.HIGH

        score = float(f.confidence_score) if f.confidence_score is not None else 0.95
        score = max(0.0, min(1.0, score))

        # 4. Parse Bounding Box
        bbox = None
        if f.location_bbox and isinstance(f.location_bbox, dict):
            try:
                bbox = BoundingBox(
                    x=int(f.location_bbox.get("x", 0)),
                    y=int(f.location_bbox.get("y", 0)),
                    width=int(f.location_bbox.get("width", 100)),
                    height=int(f.location_bbox.get("height", 50)),
                )
            except Exception:
                bbox = None

        # 5. Parse standard citation
        standard = "IPC-WHMA-A-620D"
        standard_section = "General Requirement"
        if f.standard_citation:
            parts = f.standard_citation.strip().split()
            if len(parts) >= 2 and parts[0] in ["IPC-WHMA-A-620D", "UL", "ISO", "MIL-STD-681", "IEEE"]:
                if parts[0] == "UL" and len(parts) > 1 and parts[1] == "508A":
                    standard = "UL 508A"
                    standard_section = " ".join(parts[2:]) if len(parts) > 2 else "General"
                else:
                    standard = parts[0]
                    standard_section = " ".join(parts[1:])
            else:
                standard = f.standard_citation
                standard_section = "Engineering Compliance"

        schema_findings.append(
            SchemaQCFinding(
                id=code,
                rule_id=f.rule_id or "RULE-GENERAL",
                category=f.category or "documentation",
                description=f.description or "Quality discrepancy detected.",
                severity=sev,
                confidence=Confidence(level=conf_level, score=score),
                page=max(1, f.page_number or 1),
                location=bbox,
                evidence=f.evidence_text or "Observed schematic markup or discrepancy.",
                requirement=f.requirement_text or "Engineering standard compliance required.",
                standard=standard,
                standard_section=standard_section,
                recommendation=f.recommendation or "Review and correct according to engineering guidelines.",
            )
        )

    # 6. Overall Status
    st_raw = (qc_run.overall_status or "REVIEW_REQUIRED").upper()
    if st_raw == "PASS":
        overall_status = OverallStatusEnum.PASS
    elif st_raw == "FAIL":
        overall_status = OverallStatusEnum.FAIL
    else:
        overall_status = OverallStatusEnum.REVIEW_REQUIRED

    # 7. Summary metrics
    total_checks = qc_run.checks_total or max(len(findings), (qc_run.checks_passed + qc_run.checks_failed + qc_run.checks_review))
    if total_checks == 0:
        total_checks = len(findings) if findings else 1

    summary = QCSummary(
        checks_total=total_checks,
        passed=qc_run.checks_passed or max(0, total_checks - len(findings)),
        failed=qc_run.checks_failed or (crit_count + maj_count),
        review=qc_run.checks_review or min_count,
        critical_count=crit_count,
        major_count=maj_count,
        minor_count=min_count,
        info_count=info_count,
    )

    filename = doc.filename if doc and getattr(doc, "filename", None) else f"document_{qc_run.document_id}.pdf"

    return QCAnalysisResult(
        document_id=qc_run.document_id,
        filename=filename,
        standards_applied=["IPC-WHMA-A-620D", "UL 508A", "ISO 7200"],
        overall_status=overall_status,
        summary=summary,
        findings=schema_findings,
        model_version=qc_run.model_version or "qc-hybrid-engine-v1.0",
        prompt_version=qc_run.prompt_version or "wiring-qc-prompt-v1.0",
        rules_version=qc_run.rules_version or "ruleset-ipc620-ul508a-v1.0",
        processing_time_ms=qc_run.processing_time_ms or 150,
    )
