import { NextRequest, NextResponse } from 'next/server';
import { validateAndPreflightFile } from '@/lib/ingestion/preflight';
import { extractDrawingZones } from '@/lib/ingestion/bounds-extractor';
import { extractElectricalTokens } from '@/lib/ingestion/token-extractor';

export async function POST(req: NextRequest) {
  try {
    let fileBuffer: Buffer | null = null;
    let fileName = 'drawing.pdf';
    let standard = 'IPC-WHMA-A-620';
    let tenantId = 'spandsons';

    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data Upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
      standard = (formData.get('standard') as string) || standard;
      tenantId = (formData.get('tenantId') as string) || tenantId;
    }
    // Handle JSON Payload with Base64 Data URI or Sample Reference
    else if (contentType.includes('application/json')) {
      const body = await req.json();
      fileName = body.fileName || fileName;
      standard = body.standard || standard;
      tenantId = body.tenantId || tenantId;

      if (body.dataUri) {
        const base64Data = body.dataUri.split(';base64,').pop() || '';
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // Mock buffer for named pre-loaded test drawing
        fileBuffer = Buffer.from(`%PDF-1.7 Test schematic vector representation for ${fileName}`);
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: 'No valid file buffer provided for ingestion.' },
        { status: 400 }
      );
    }

    // Step 1: Pre-flight security & binary inspection
    const preflight = await validateAndPreflightFile(fileBuffer, fileName);
    if (!preflight.isValid) {
      return NextResponse.json(
        { error: preflight.error || 'Pre-flight validation failed.' },
        { status: 422 }
      );
    }

    // Step 2: Boundary Layout Isolation (Title Block, Wire Table, Schematic Canvas)
    const zones = extractDrawingZones(fileName, preflight.dimensions.width, preflight.dimensions.height);

    // Step 3: Optical & Electrical Token Extraction
    const { tokens, wireTable } = extractElectricalTokens(fileName, 1);

    const docId = `DOC-${Math.floor(1000 + Math.random() * 9000)}-2026`;

    return NextResponse.json({
      success: true,
      document: {
        id: docId,
        fileName,
        fileType: preflight.fileType,
        mimeType: preflight.mimeType,
        sha256Hash: preflight.sha256Hash,
        fileSizeBytes: preflight.fileSizeBytes,
        pageCount: preflight.pageCount,
        dimensions: preflight.dimensions,
        sanitizedSvg: preflight.sanitizedSvg,
      },
      zones,
      tokensCount: tokens.length,
      wireTableCount: wireTable.length,
      tokens,
      wireTable,
      warnings: preflight.warnings,
    });
  } catch (error: any) {
    console.error('Ingestion parsing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Ingestion preprocessing failed.' },
      { status: 500 }
    );
  }
}
