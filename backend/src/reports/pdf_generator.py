"""
Deterministic Audit-Grade PDF Report Generator.
Utilizes ReportLab to generate standardized engineering compliance reports from QCAnalysisResult.
Includes client branding, executive summary, defect breakdown, evidence snippets, and sign-off blocks.
"""

from datetime import datetime, timezone
import io
from typing import Union
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..ai.schemas import OverallStatusEnum, QCAnalysisResult, SeverityEnum


class PDFReportGenerator:
    """Generates immutable, audit-ready PDF reports from validated QC findings."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        self.title_style = ParagraphStyle(
            "DocTitle",
            parent=self.styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
        )
        self.subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=self.styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#64748b"),
        )
        self.section_heading = ParagraphStyle(
            "SectionHeading",
            parent=self.styles["Heading2"],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1e293b"),
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True,
        )
        self.body_style = ParagraphStyle(
            "Body",
            parent=self.styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#334155"),
        )
        self.table_header_style = ParagraphStyle(
            "TableHeader",
            parent=self.styles["Normal"],
            fontSize=8,
            leading=10,
            fontName="Helvetica-Bold",
            textColor=colors.white,
        )

    def generate(self, result: QCAnalysisResult, output_destination: Union[str, io.BytesIO]):
        """Compile result into a polished PDF document."""
        doc = SimpleDocTemplate(
            output_destination,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )
        story = []

        # 1. Header Banner with Spandsons Horizon Engineering Branding
        header_table = Table(
            [
                [
                    Paragraph("<b>SPANDSONS HORIZON ENGINEERING</b><br/><font size='14'>WIRING DIAGRAM QC ASSISTANT</font>", self.title_style),
                    Paragraph(f"<b>STATUS: {result.overall_status.value}</b><br/><font size='10'>COMPLIANCE AUDIT</font>", self._get_status_style(result.overall_status)),
                ],
                [
                    Paragraph("ISO 9001:2015 & IPC-WHMA-A-620D Automated Quality Inspection System", self.subtitle_style),
                    Paragraph(f"Report Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", self.subtitle_style),
                ],
            ],
            colWidths=[370, 170],
        )
        header_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(header_table)
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=10))

        # 2. Executive Metadata Box
        meta_data = [
            [
                Paragraph("<b>Document ID:</b>", self.body_style),
                Paragraph(result.document_id, self.body_style),
                Paragraph("<b>Filename:</b>", self.body_style),
                Paragraph(result.filename, self.body_style),
            ],
            [
                Paragraph("<b>Applied Standards:</b>", self.body_style),
                Paragraph(", ".join(result.standards_applied), self.body_style),
                Paragraph("<b>Ruleset Version:</b>", self.body_style),
                Paragraph(result.rules_version, self.body_style),
            ],
            [
                Paragraph("<b>Model / Engine:</b>", self.body_style),
                Paragraph(result.model_version, self.body_style),
                Paragraph("<b>Processing Duration:</b>", self.body_style),
                Paragraph(f"{result.processing_time_ms} ms", self.body_style),
            ],
        ]
        meta_table = Table(meta_data, colWidths=[95, 175, 105, 165])
        meta_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # 3. Summary Metrics Table
        story.append(Paragraph("1. Quality Control Executive Summary", self.section_heading))
        summary_rows = [
            [
                Paragraph("Total Checks", self.table_header_style),
                Paragraph("Passed", self.table_header_style),
                Paragraph("Failed", self.table_header_style),
                Paragraph("Critical", self.table_header_style),
                Paragraph("Major", self.table_header_style),
                Paragraph("Minor", self.table_header_style),
                Paragraph("Info", self.table_header_style),
            ],
            [
                Paragraph(f"<b>{result.summary.checks_total}</b>", self.body_style),
                Paragraph(f"<font color='#16a34a'><b>{result.summary.passed}</b></font>", self.body_style),
                Paragraph(f"<font color='#dc2626'><b>{result.summary.failed}</b></font>", self.body_style),
                Paragraph(f"<font color='#dc2626'><b>{result.summary.critical_count}</b></font>", self.body_style),
                Paragraph(f"<font color='#ea580c'><b>{result.summary.major_count}</b></font>", self.body_style),
                Paragraph(f"<font color='#d97706'><b>{result.summary.minor_count}</b></font>", self.body_style),
                Paragraph(f"<font color='#2563eb'><b>{result.summary.info_count}</b></font>", self.body_style),
            ],
        ]
        summary_table = Table(summary_rows, colWidths=[77, 77, 77, 77, 77, 77, 78])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 10))

        # 4. Detailed Findings Catalog
        story.append(Paragraph(f"2. Discrepancy Findings Catalog ({len(result.findings)} Detected)", self.section_heading))
        if not result.findings:
            story.append(Paragraph("✓ <b>CONGRATULATIONS:</b> No discrepancies or compliance violations detected. Document satisfies all configured engineering standards.", self.body_style))
        else:
            findings_data = [
                [
                    Paragraph("ID", self.table_header_style),
                    Paragraph("Pg", self.table_header_style),
                    Paragraph("Severity", self.table_header_style),
                    Paragraph("Category", self.table_header_style),
                    Paragraph("Description & Observed Evidence", self.table_header_style),
                    Paragraph("Standard & Recommended Correction", self.table_header_style),
                ]
            ]

            for f in result.findings:
                sev_color = self._get_severity_hex(f.severity)
                findings_data.append(
                    [
                        Paragraph(f"<b>{f.id}</b>", self.body_style),
                        Paragraph(str(f.page), self.body_style),
                        Paragraph(f"<font color='{sev_color}'><b>{f.severity.value}</b></font>", self.body_style),
                        Paragraph(f.category, self.body_style),
                        Paragraph(f"<b>{f.description}</b><br/><font color='#64748b'><b>Evidence:</b> {f.evidence}</font>", self.body_style),
                        Paragraph(f"<b>{f.standard}</b> {f.standard_section}<br/><i>Action: {f.recommendation}</i>", self.body_style),
                    ]
                )

            findings_table = Table(findings_data, colWidths=[45, 25, 55, 75, 175, 165], repeatRows=1)
            findings_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(findings_table)

        # 5. Formal Engineering Sign-Off Block
        story.append(Spacer(1, 14))
        story.append(Paragraph("3. Engineering Sign-Off & Verification", self.section_heading))
        signoff_data = [
            [
                Paragraph("<b>Prepared By:</b>", self.body_style),
                Paragraph("Wiring Diagram QC Assistant (AI Engine v1.0)", self.body_style),
                Paragraph("<b>Audit Date:</b>", self.body_style),
                Paragraph(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), self.body_style),
            ],
            [
                Paragraph("<b>Reviewed By:</b>", self.body_style),
                Paragraph("Quality Assurance / Lead Systems Engineer", self.body_style),
                Paragraph("<b>Engineering Approval:</b>", self.body_style),
                Paragraph("____________________________", self.body_style),
            ],
        ]
        signoff_table = Table(signoff_data, colWidths=[100, 170, 110, 160])
        signoff_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(signoff_table)

        # Build Document
        doc.build(story)

    def _get_status_style(self, status: OverallStatusEnum) -> ParagraphStyle:
        bg = "#ef4444" if status == OverallStatusEnum.FAIL else ("#f59e0b" if status == OverallStatusEnum.REVIEW_REQUIRED else "#10b981")
        return ParagraphStyle(
            "StatusStyle",
            parent=self.styles["Heading2"],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor(bg),
            alignment=2,  # Right aligned
            fontName="Helvetica-Bold",
        )

    def _get_severity_hex(self, severity: SeverityEnum) -> str:
        if severity == SeverityEnum.CRITICAL:
            return "#dc2626"
        elif severity == SeverityEnum.MAJOR:
            return "#ea580c"
        elif severity == SeverityEnum.MINOR:
            return "#d97706"
        return "#2563eb"
