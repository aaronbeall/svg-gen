import type { Geometry, Expr, ForLoop, PathData, CircleData, RectData, LineData, PolylineData, PolygonData } from './types.js';

// ============================================================================
// Expression Evaluator
// ============================================================================

/** Evaluate an expression with a given scope */
function evalExpr<T>(expr: Expr<T, any>, scope: Record<string, any>): T {
  if (typeof expr === 'function') {
    return (expr as (s: any) => T)(scope);
  }
  return expr;
}

/** Evaluate a let block and merge with parent scope */
function evalLetBlock(
  letBlock: Record<string, any> | undefined,
  parentScope: Record<string, any>
): Record<string, any> {
  if (!letBlock) return parentScope;

  const newScope = { ...parentScope };

  // Evaluate let bindings in order, each can reference previous ones
  for (const [key, value] of Object.entries(letBlock)) {
    newScope[key] = evalExpr(value, newScope);
  }

  return newScope;
}

// ============================================================================
// Point Generation
// ============================================================================

interface EvaluatedPoint {
  x: number;
  y: number;
}

/** Evaluate a for loop to generate points */
function evalForLoop(forLoop: ForLoop<any, any>, scope: Record<string, any>): EvaluatedPoint[] {
  const points: EvaluatedPoint[] = [];
  const start = forLoop.i;
  const loopScope = { ...scope };

  for (let i = start; ; i++) {
    loopScope.i = i;
    const to = evalExpr(forLoop.to, loopScope);
    if (i >= to) break;

    // Evaluate inner let block with loop variable
    const innerScope = evalLetBlock(forLoop.let, loopScope);

    // Evaluate point
    const [xExpr, yExpr] = forLoop.point;
    const x = evalExpr(xExpr, innerScope);
    const y = evalExpr(yExpr, innerScope);
    points.push({ x, y });
  }

  return points;
}

// ============================================================================
// SVG Generation
// ============================================================================

/** Convert points to SVG path d attribute */
function pointsToPathD(points: EvaluatedPoint[], close: boolean): string {
  if (points.length === 0) return '';

  const commands = points.map((p, i) => {
    const cmd = i === 0 ? 'M' : 'L';
    return `${cmd}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  });

  if (close) commands.push('Z');
  return commands.join(' ');
}

/** Convert points to SVG points attribute (for polyline/polygon) */
function pointsToAttr(points: EvaluatedPoint[]): string {
  return points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/** Generate SVG path element */
function generatePath(pathData: PathData<any>, scope: Record<string, any>): string {
  let points: EvaluatedPoint[] = [];

  if (pathData.for) {
    points = evalForLoop(pathData.for, scope);
  }

  const d = pointsToPathD(points, pathData.close ?? false);
  return `  <path d="${d}" fill="none" stroke="black" stroke-width="2"/>`;
}

/** Generate SVG circle element */
function generateCircle(circleData: CircleData<any>, scope: Record<string, any>): string {
  const cx = evalExpr(circleData.cx, scope);
  const cy = evalExpr(circleData.cy, scope);
  const r = evalExpr(circleData.r, scope);
  const fill = circleData.fill ? evalExpr(circleData.fill, scope) : 'none';
  const stroke = circleData.stroke ? evalExpr(circleData.stroke, scope) : 'black';
  const strokeWidth = circleData.strokeWidth ? evalExpr(circleData.strokeWidth, scope) : 1;

  return `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/** Generate SVG rect element */
function generateRect(rectData: RectData<any>, scope: Record<string, any>): string {
  const x = evalExpr(rectData.x, scope);
  const y = evalExpr(rectData.y, scope);
  const width = evalExpr(rectData.width, scope);
  const height = evalExpr(rectData.height, scope);
  const fill = rectData.fill ? evalExpr(rectData.fill, scope) : 'none';
  const stroke = rectData.stroke ? evalExpr(rectData.stroke, scope) : 'black';
  const strokeWidth = rectData.strokeWidth ? evalExpr(rectData.strokeWidth, scope) : 1;

  return `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/** Generate SVG line element */
function generateLine(lineData: LineData<any>, scope: Record<string, any>): string {
  const x1 = evalExpr(lineData.x1, scope);
  const y1 = evalExpr(lineData.y1, scope);
  const x2 = evalExpr(lineData.x2, scope);
  const y2 = evalExpr(lineData.y2, scope);
  const stroke = lineData.stroke ? evalExpr(lineData.stroke, scope) : 'black';
  const strokeWidth = lineData.strokeWidth ? evalExpr(lineData.strokeWidth, scope) : 1;

  return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/** Generate SVG polyline element */
function generatePolyline(polylineData: PolylineData<any>, scope: Record<string, any>): string {
  let points: EvaluatedPoint[] = [];

  if (polylineData.for) {
    points = evalForLoop(polylineData.for, scope);
  }

  const pointsAttr = pointsToAttr(points);
  const fill = polylineData.fill ? evalExpr(polylineData.fill, scope) : 'none';
  const stroke = polylineData.stroke ? evalExpr(polylineData.stroke, scope) : 'black';
  const strokeWidth = polylineData.strokeWidth ? evalExpr(polylineData.strokeWidth, scope) : 1;

  return `  <polyline points="${pointsAttr}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

/** Generate SVG polygon element */
function generatePolygon(polygonData: PolygonData<any>, scope: Record<string, any>): string {
  let points: EvaluatedPoint[] = [];

  if (polygonData.for) {
    points = evalForLoop(polygonData.for, scope);
  }

  const pointsAttr = pointsToAttr(points);
  const fill = polygonData.fill ? evalExpr(polygonData.fill, scope) : 'none';
  const stroke = polygonData.stroke ? evalExpr(polygonData.stroke, scope) : 'black';
  const strokeWidth = polygonData.strokeWidth ? evalExpr(polygonData.strokeWidth, scope) : 1;

  return `  <polygon points="${pointsAttr}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

// ============================================================================
// Main Render Function
// ============================================================================

export interface RenderResult {
  svg: string;
  html: string;
}

/** Render a geometry definition to SVG */
export function render(geometry: Geometry): RenderResult {
  const { svg } = geometry;
  const [width, height] = svg.size;

  // Evaluate top-level let block
  const scope = evalLetBlock(svg.let, {});

  // Generate SVG elements
  const elements: string[] = [];

  if (svg.path) {
    elements.push(generatePath(svg.path, scope));
  }

  if (svg.circle) {
    elements.push(generateCircle(svg.circle, scope));
  }

  if (svg.rect) {
    elements.push(generateRect(svg.rect, scope));
  }

  if (svg.line) {
    elements.push(generateLine(svg.line, scope));
  }

  if (svg.polyline) {
    elements.push(generatePolyline(svg.polyline, scope));
  }

  if (svg.polygon) {
    elements.push(generatePolygon(svg.polygon, scope));
  }

  if (svg.group) {
    for (const groupData of svg.group) {
      const groupElements: string[] = [];
      const transform = groupData.transform ? evalExpr(groupData.transform, scope) : null;

      if (groupData.path) {
        groupElements.push(generatePath(groupData.path, scope));
      }
      if (groupData.circle) {
        groupElements.push(generateCircle(groupData.circle, scope));
      }
      if (groupData.rect) {
        groupElements.push(generateRect(groupData.rect, scope));
      }
      if (groupData.line) {
        groupElements.push(generateLine(groupData.line, scope));
      }

      const transformAttr = transform ? ` transform="${transform}"` : '';
      elements.push(`  <g${transformAttr}>\n  ${groupElements.join('\n  ')}\n  </g>`);
    }
  }

  const svgContent = elements.join('\n');

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${svgContent}
</svg>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>SVG Output</title>
  <style>
    body { 
      display: flex; 
      flex-direction: column;
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      margin: 0;
      background: #f0f0f0;
      font-family: system-ui, sans-serif;
    }
    .container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin: 20px;
    }
    h2 { margin-top: 0; color: #333; }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Rendered SVG</h2>
    ${svgString}
  </div>
  <div class="container">
    <h2>SVG Source</h2>
    <pre>${escapeHtml(svgString)}</pre>
  </div>
</body>
</html>`;

  return { svg: svgString, html };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
