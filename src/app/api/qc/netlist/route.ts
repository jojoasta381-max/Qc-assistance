import { NextRequest, NextResponse } from 'next/server';
import { extractElectricalTokens } from '@/lib/ingestion/token-extractor';
import { buildElectricalGraphFromExtraction } from '@/lib/graph/graph-builder';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fileName = body.fileName || 'WH-402_Chassis_Harness.pdf';

    // Step 1: Token extraction from Phase 5
    const extraction = body.tokens && body.wireTable
      ? { tokens: body.tokens, wireTable: body.wireTable }
      : extractElectricalTokens(fileName, 1);

    // Step 2: Build Topological Electrical Graph
    const graph = buildElectricalGraphFromExtraction(fileName, extraction.tokens, extraction.wireTable);

    // Step 3: Run Graph Integrity Algorithms
    const floatingPins = graph.findFloatingPins();
    const voltageCollisions = graph.detectVoltageDomainCollisions();
    const groundTrace = graph.traceGroundContinuity('J1');

    // Convert Nodes map to serializable array
    const nodesArray = Array.from(graph.nodes.values());

    // Step 4: Generate Industry Standard Netlist Exports
    // Format A: Telesis / Wire List Text Format
    let telesisText = `! TELESIS NETLIST FORMAT\n! EXPORTED FROM WIRING DIAGRAM QC ASSISTANT\n! DOCUMENT: ${fileName}\n! DATE: ${new Date().toISOString()}\n$NETS\n`;
    graph.edges.forEach((edge) => {
      telesisText += `${edge.wireTag} ; ${edge.sourceNodeId}.${edge.sourcePinId} ${edge.targetNodeId}.${edge.targetPinId} [${edge.conductor.gauge}, ${edge.conductor.color}]\n`;
    });

    // Format B: Cirris / Dynalab XML Harness Tester Format
    let xmlTesterFormat = `<?xml version="1.0" encoding="UTF-8"?>\n<HarnessTestSchedule name="${fileName}" version="1.0">\n  <Connections count="${graph.edges.length}">\n`;
    graph.edges.forEach((edge) => {
      xmlTesterFormat += `    <Wire id="${edge.wireTag}" from="${edge.sourceNodeId}:${edge.sourcePinId}" to="${edge.targetNodeId}:${edge.targetPinId}" gauge="${edge.conductor.gauge}" color="${edge.conductor.color}" />\n`;
    });
    xmlTesterFormat += `  </Connections>\n  <Components count="${nodesArray.length}">\n`;
    nodesArray.forEach((node) => {
      xmlTesterFormat += `    <Component id="${node.id}" type="${node.type}" pinCount="${node.pins.length}" />\n`;
    });
    xmlTesterFormat += `  </Components>\n</HarnessTestSchedule>`;

    const flaggedEdgesCount = graph.edges.filter((e) => e.status === 'DISCREPANCY_FLAGGED').length;

    return NextResponse.json({
      success: true,
      graphSummary: {
        nodesCount: nodesArray.length,
        edgesCount: graph.edges.length,
        flaggedEdgesCount,
        floatingPinsCount: floatingPins.length,
      },
      nodes: nodesArray,
      edges: graph.edges,
      floatingPins,
      voltageCollisions,
      groundContinuity: groundTrace,
      exports: {
        telesisFormat: telesisText,
        xmlTesterFormat,
      },
    });
  } catch (error: any) {
    console.error('Netlist graph generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to construct netlist graph.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fileName = url.searchParams.get('sample') || 'WH-402_Chassis_Harness.pdf';

  const extraction = extractElectricalTokens(fileName, 1);
  const graph = buildElectricalGraphFromExtraction(fileName, extraction.tokens, extraction.wireTable);
  const nodesArray = Array.from(graph.nodes.values());
  const floatingPins = graph.findFloatingPins();

  return NextResponse.json({
    success: true,
    nodes: nodesArray,
    edges: graph.edges,
    floatingPins,
  });
}
