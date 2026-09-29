import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage/storage-provider';
import { performRealPreflight } from '@/lib/ingestion/real-preflight';
import { getDocumentExtractor } from '@/lib/extraction/document-extractor';
import { buildElectricalGraph } from '@/lib/graph/electrical-graph-builder';
import { ProductionRuleEvaluator } from '@/lib/qc/rule-evaluator';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export interface ProcessingPipelineOptions {
  jobId: string;
  tenantId: string;
  documentId: string;
  versionId: string;
  userId?: string;
  runRules?: boolean;
}

/**
 * Genuine asynchronous document ingestion, extraction, electrical graph,
 * and deterministic QC evaluation pipeline worker.
 * 
 * Pipeline Stages:
 * 1. PREFLIGHT: Byte structure, dimensions, format, encryption detection
 * 2. EXTRACTION: Pure PDF text stream & spatial geometry normalization
 * 3. GRAPH_BUILDING: Deterministic topological component, terminal, wire, & net graph
 * 4. RULE_EVALUATION: Deterministic QC rules (RULE-001 to RULE-008) generating evidence findings
 * 5. PERSISTENCE: Database records for Components, Terminals, Connections, and Findings
 */
export async function runDocumentProcessingPipeline(options: ProcessingPipelineOptions): Promise<void> {
  const { jobId, tenantId, documentId, versionId, userId, runRules = true } = options;
  const startTime = Date.now();

  try {
    // -----------------------------------------------------------------
    // 1. Mark Job as PREFLIGHT
    // -----------------------------------------------------------------
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'RUNNING',
        stage: 'PREFLIGHT',
        progress: 10,
        startedAt: new Date(),
      },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PREFLIGHT' },
    });

    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { processingStatus: 'PREFLIGHT' },
    });

    // -----------------------------------------------------------------
    // 2. Retrieve authoritative document bytes from private storage
    // -----------------------------------------------------------------
    const doc = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!doc) {
      throw new Error(`Document "${documentId}" does not exist in tenant.`);
    }

    const storage = getStorageProvider();
    let objectData: { buffer: Buffer };
    try {
      objectData = await storage.getObject(doc.storageKey);
    } catch {
      await failJob(jobId, documentId, versionId, 'STORAGE_OBJECT_NOT_FOUND', `Object not found in storage at key "${doc.storageKey}".`);
      return;
    }

    const fileBuffer = objectData.buffer;
    if (!fileBuffer || fileBuffer.length === 0) {
      await failJob(jobId, documentId, versionId, 'EMPTY_DOCUMENT', 'Document object contains 0 bytes.');
      return;
    }

    // -----------------------------------------------------------------
    // 3. Execute Real Byte Preflight
    // -----------------------------------------------------------------
    const preflight = await performRealPreflight(fileBuffer);
    if (!preflight.isValid) {
      await failJob(jobId, documentId, versionId, 'PREFLIGHT_REJECTED', preflight.error || 'Preflight inspection failed.');
      return;
    }

    // Persist preflight metadata artifact
    await prisma.extractionArtifact.create({
      data: {
        tenantId,
        documentVersionId: versionId,
        artifactType: 'PREFLIGHT_METADATA',
        sha256: preflight.sha256Hash,
        sizeBytes: fileBuffer.length,
        payloadJson: JSON.stringify({
          pageCount: preflight.pageCount,
          dimensions: preflight.dimensions,
          fileType: preflight.fileType,
          isEncrypted: preflight.isEncrypted,
          hasText: preflight.hasText,
          hasVector: preflight.hasVector,
          hasRaster: preflight.hasRaster,
          complexityScore: preflight.complexityScore,
        }),
      },
    });

    // -----------------------------------------------------------------
    // 4. Mark Job as EXTRACTING
    // -----------------------------------------------------------------
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        stage: 'EXTRACTION',
        progress: 35,
      },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'EXTRACTING' },
    });

    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { processingStatus: 'EXTRACTING' },
    });

    // -----------------------------------------------------------------
    // 5. Run Document Extractor on actual bytes
    // -----------------------------------------------------------------
    const extractor = getDocumentExtractor();
    const normalizedDoc = await extractor.extract({
      buffer: fileBuffer,
      mimeType: doc.mimeType,
      documentId,
      versionId,
    });

    // Clean up any prior extraction / graph data for this version
    await prisma.finding.deleteMany({ where: { documentVersionId: versionId } });
    await prisma.connection.deleteMany({ where: { documentVersionId: versionId } });
    await prisma.terminal.deleteMany({ where: { component: { documentVersionId: versionId } } });
    await prisma.component.deleteMany({ where: { documentVersionId: versionId } });
    await prisma.documentPage.deleteMany({ where: { documentVersionId: versionId } });

    // Record extracted pages in database
    const pageIdMap = new Map<number, string>();
    for (const page of normalizedDoc.pages) {
      const pageText = page.textBlocks.map((b) => b.text).join('\n');
      const dbPage = await prisma.documentPage.create({
        data: {
          documentVersionId: versionId,
          pageNumber: page.pageNumber,
          imageStorageKey: `${doc.storageKey}/pages/${page.pageNumber}`,
          width: page.width,
          height: page.height,
          extractedText: pageText.slice(0, 10000),
          ocrMetadata: JSON.stringify({
            confidence: page.confidence,
            source: page.source,
            wordsCount: page.words.length,
            blocksCount: page.textBlocks.length,
            vectorPathsCount: page.vectorPaths.length,
          }),
        },
      });
      pageIdMap.set(page.pageNumber, dbPage.id);
    }

    // Persist normalized pages artifact
    await prisma.extractionArtifact.create({
      data: {
        tenantId,
        documentVersionId: versionId,
        artifactType: 'NORMALIZED_PAGES',
        sha256: normalizedDoc.sha256,
        sizeBytes: JSON.stringify(normalizedDoc).length,
        payloadJson: JSON.stringify({
          pageCount: normalizedDoc.pageCount,
          rawTextLength: normalizedDoc.rawTextLength,
          ocrApplied: normalizedDoc.ocrApplied,
          ocrAvailable: normalizedDoc.ocrAvailable,
          extractedPagesSummary: normalizedDoc.pages.map((p) => ({
            pageNumber: p.pageNumber,
            wordsCount: p.words.length,
            blocksCount: p.textBlocks.length,
            confidence: p.confidence,
            source: p.source,
          })),
        }),
      },
    });

    // -----------------------------------------------------------------
    // 6. Stage: GRAPH_BUILDING
    // -----------------------------------------------------------------
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        stage: 'GRAPH_BUILDING',
        progress: 65,
      },
    });

    const electricalGraph = buildElectricalGraph(normalizedDoc, {
      documentId,
      versionId,
      tenantId,
    });

    // Persist Electrical Graph artifact
    const graphJson = JSON.stringify(electricalGraph);
    await prisma.extractionArtifact.create({
      data: {
        tenantId,
        documentVersionId: versionId,
        artifactType: 'ELECTRICAL_GRAPH',
        sha256: electricalGraph.graphSha256,
        sizeBytes: Buffer.byteLength(graphJson, 'utf8'),
        payloadJson: graphJson,
      },
    });

    // Persist Components and Terminals into PostgreSQL relational tables
    const terminalDbIdMap = new Map<string, string>();

    for (const comp of electricalGraph.components) {
      const pageId = pageIdMap.get(comp.pageNumber) || null;
      const dbComp = await prisma.component.create({
        data: {
          documentVersionId: versionId,
          pageId,
          componentRef: comp.label,
          componentType: comp.type,
          bbox: JSON.stringify(comp.bbox),
          confidence: comp.confidence,
          attributes: JSON.stringify({
            value: comp.value,
            status: comp.status,
            graphComponentId: comp.id,
          }),
        },
      });

      // Persist terminals belonging to this component
      const compTerminals = electricalGraph.terminals.filter((t) => t.componentId === comp.id);
      for (const term of compTerminals) {
        const dbTerm = await prisma.terminal.create({
          data: {
            componentId: dbComp.id,
            terminalRef: term.terminalName,
            bbox: JSON.stringify({ position: term.position }),
            confidence: term.confidence,
          },
        });
        terminalDbIdMap.set(term.id, dbTerm.id);
      }
    }

    // Persist Connections into PostgreSQL
    for (const wire of electricalGraph.wires) {
      if (wire.connectedTerminalIds.length >= 2) {
        for (let i = 0; i < wire.connectedTerminalIds.length - 1; i++) {
          const srcDbId = terminalDbIdMap.get(wire.connectedTerminalIds[i]);
          const tgtDbId = terminalDbIdMap.get(wire.connectedTerminalIds[i + 1]);
          if (srcDbId && tgtDbId) {
            await prisma.connection.create({
              data: {
                documentVersionId: versionId,
                sourceTerminalId: srcDbId,
                targetTerminalId: tgtDbId,
                netName: wire.label || 'W-CONN',
                geometry: JSON.stringify(wire.geometry),
                confidence: wire.confidence,
              },
            });
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // 7. Stage: RULE_EVALUATION
    // -----------------------------------------------------------------
    let findingCount = 0;
    if (runRules) {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          stage: 'RULE_EVALUATION',
          progress: 85,
        },
      });

      const ruleEvaluator = new ProductionRuleEvaluator();
      const ruleResult = ruleEvaluator.evaluate(electricalGraph);
      findingCount = ruleResult.findings.length;

      // Persist QC Rule Execution artifact
      const ruleResultJson = JSON.stringify(ruleResult);
      const ruleResultSha256 = crypto.createHash('sha256').update(ruleResultJson).digest('hex');

      await prisma.extractionArtifact.create({
        data: {
          tenantId,
          documentVersionId: versionId,
          artifactType: 'QC_RULE_EXECUTION',
          sha256: ruleResultSha256,
          sizeBytes: Buffer.byteLength(ruleResultJson, 'utf8'),
          payloadJson: ruleResultJson,
        },
      });

      // Persist Findings in PostgreSQL
      for (const finding of ruleResult.findings) {
        // Upsert Rule record in database
        const dbRule = await prisma.rule.upsert({
          where: { code: finding.ruleId },
          create: {
            code: finding.ruleId,
            name: finding.title,
            version: finding.ruleVersion,
            severity: finding.severity,
          },
          update: {
            name: finding.title,
            version: finding.ruleVersion,
            severity: finding.severity,
          },
        });

        await prisma.finding.create({
          data: {
            documentVersionId: versionId,
            ruleId: dbRule.id,
            status:
              finding.status === 'VIOLATION'
                ? 'UNREVIEWED'
                : finding.status === 'NOT_EVALUABLE'
                ? 'NEEDS_MORE_EVIDENCE'
                : 'PASS',
            severity: finding.severity,
            description: finding.description,
            confidence: finding.confidence,
            evidence: JSON.stringify(finding.evidence),
          },
        });
      }
    }

    // -----------------------------------------------------------------
    // 8. Transition Job to COMPLETED & Document to QC_COMPLETE
    // -----------------------------------------------------------------
    const executionDurationMs = Date.now() - startTime;

    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        metadata: JSON.stringify({
          executionDurationMs,
          pageCount: normalizedDoc.pageCount,
          componentsCount: electricalGraph.components.length,
          terminalsCount: electricalGraph.terminals.length,
          wiresCount: electricalGraph.wires.length,
          netsCount: electricalGraph.nets.length,
          findingsCount: findingCount,
          graphSha256: electricalGraph.graphSha256,
        }),
      },
    });

    await prisma.documentVersion.update({
      where: { id: versionId },
      data: {
        processingStatus: 'QC_COMPLETE',
      },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'QC_COMPLETE',
      },
    });

    if (userId) {
      await recordAuditEvent({
        tenantId,
        actorId: userId,
        action: 'QC_ANALYSIS_COMPLETED',
        entityType: 'DOCUMENT',
        entityId: documentId,
        metadata: {
          jobId,
          graphSha256: electricalGraph.graphSha256,
          componentsCount: electricalGraph.components.length,
          findingsCount: findingCount,
          durationMs: executionDurationMs,
        },
      });
    }
  } catch (err: any) {
    await failJob(jobId, documentId, versionId, 'PROCESSING_PIPELINE_ERROR', err.message || 'Pipeline processing failed.');
  }
}

async function failJob(
  jobId: string,
  documentId: string,
  versionId: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      stage: 'FAILED',
      errorCode,
      errorMessage,
      completedAt: new Date(),
    },
  });

  await prisma.documentVersion.update({
    where: { id: versionId },
    data: {
      processingStatus: 'FAILED',
    },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: 'FAILED',
    },
  });
}
