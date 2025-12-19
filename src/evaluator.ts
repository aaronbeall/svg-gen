import type { Geometry, LetBlock, ForLoop, PathData, CircleData, RectData, LineData, PolylineData, PolygonData } from './types.js';

// ============================================================================
// Scope Evaluation
// ============================================================================

type ScopeValue = any;

/**
 * Creates a scope object from a let block.
 * Values can be static or functions. Functions are evaluated lazily via getters.
 * Each value can reference previous values via the scope proxy.
 */
function createScope(letBlock: LetBlock | undefined, parentScope: Record<string, ScopeValue> = {}): Record<string, ScopeValue> {
  if (!letBlock) return { ...parentScope };

  const values: Record<string, ScopeValue> = { ...parentScope };
  const evaluated: Record<string, ScopeValue> = {};
  const evaluating = new Set<string>();

  // Create proxy that evaluates functions on access
  const scope: Record<string, ScopeValue> = new Proxy(values, {
    get(target, prop: string) {
      // Return from cache if already evaluated
      if (prop in evaluated) return evaluated[prop];
      
      // Check parent scope first
      if (!(prop in target) && prop in parentScope) {
        return parentScope[prop];
      }

      const value = target[prop];
      
      // If it's a function, evaluate it
      if (typeof value === 'function') {
        if (evaluating.has(prop)) {
          throw new Error(`Circular reference detected: ${prop}`);
        }
        evaluating.add(prop);
        evaluated[prop] = value(scope);
        evaluating.delete(prop);
        return evaluated[prop];
      }
      
      // Static value
      evaluated[prop] = value;
      return value;
    }
  });

  // Copy let block entries to values
  for (const [key, value] of Object.entries(letBlock)) {
    values[key] = value;
  }

  return scope;
}

/** Evaluate an expression with a scope */
function evalExpr<T>(expr: T | ((scope: any) => T), scope: Record<string, ScopeValue>): T {
  if (typeof expr === 'function') {
    return (expr as (s: any) => T)(scope);
  }
  return expr;
}

// ============================================================================
// Point Generation
// ============================================================================

interface Point {
  x: number;
  y: number;
}

function evalForLoop(forLoop: ForLoop, parentScope: Record<string, ScopeValue>): Point[] {
  const points: Point[] = [];
  const start = forLoop.i;

  for (let i = start; ; i++) {
    // Create loop scope with i
    const loopScope = createScope({ i }, parentScope);
    
    const to = evalExpr(forLoop.to, loopScope);
    if (i >= to) break;

    // Add inner let block if present
    const innerScope = forLoop.let ? createScope(forLoop.let, loopScope) : loopScope;

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

function pointsToPathD(points: Point[], close: boolean): string {
  if (points.length === 0) return '';
  const commands = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  if (close) commands.push('Z');
  return commands.join(' ');
}

function pointsToAttr(points: Point[]): string {
  return points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

function generatePath(pathData: PathData, scope: Record<string, ScopeValue>): string {
  let points: Point[] = [];
  if (pathData.for) {
    points = evalForLoop(pathData.for, scope);
  }
  const d = pointsToPathD(points, pathData.close ?? false);
  return `  <path d="${d}" fill="none" stroke="black" stroke-width="2"/>`;
}

function generateCircle(data: CircleData, scope: Record<string, ScopeValue>): string {
  const cx = evalExpr(data.cx, scope);
  const cy = evalExpr(data.cy, scope);
  const r = evalExpr(data.r, scope);
  const fill = data.fill ? evalExpr(data.fill, scope) : 'none';
  const stroke = data.stroke ? evalExpr(data.stroke, scope) : 'black';
  const strokeWidth = data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1;
  return `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function generateRect(data: RectData, scope: Record<string, ScopeValue>): string {
  const x = evalExpr(data.x, scope);
  const y = evalExpr(data.y, scope);
  const width = evalExpr(data.width, scope);
  const height = evalExpr(data.height, scope);
  const fill = data.fill ? evalExpr(data.fill, scope) : 'none';
  const stroke = data.stroke ? evalExpr(data.stroke, scope) : 'black';
  const strokeWidth = data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1;
  return `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function generateLine(data: LineData, scope: Record<string, ScopeValue>): string {
  const x1 = evalExpr(data.x1, scope);
  const y1 = evalExpr(data.y1, scope);
  const x2 = evalExpr(data.x2, scope);
  const y2 = evalExpr(data.y2, scope);
  const stroke = data.stroke ? evalExpr(data.stroke, scope) : 'black';
  const strokeWidth = data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1;
  return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function generatePolyline(data: PolylineData, scope: Record<string, ScopeValue>): string {
  let points: Point[] = [];
  if (data.for) {
    points = evalForLoop(data.for, scope);
  }
  const pointsAttr = pointsToAttr(points);
  const fill = data.fill ? evalExpr(data.fill, scope) : 'none';
  const stroke = data.stroke ? evalExpr(data.stroke, scope) : 'black';
  const strokeWidth = data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1;
  return `  <polyline points="${pointsAttr}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function generatePolygon(data: PolygonData, scope: Record<string, ScopeValue>): string {
  let points: Point[] = [];
  if (data.for) {
    points = evalForLoop(data.for, scope);
  }
  const pointsAttr = pointsToAttr(points);
  const fill = data.fill ? evalExpr(data.fill, scope) : 'none';
  const stroke = data.stroke ? evalExpr(data.stroke, scope) : 'black';
  const strokeWidth = data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1;
  return `  <polygon points="${pointsAttr}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

// ============================================================================
// Main Render Function
// ============================================================================

export interface RenderResult {
  svg: string;
  html: string;
}

export function render(geometry: Geometry): RenderResult {
  const { svg } = geometry;
  const [width, height] = svg.size;

  // Create scope from let block
  const scope = createScope(svg.let);

  // Generate SVG elements
  const elements: string[] = [];

  if (svg.path) elements.push(generatePath(svg.path, scope));
  if (svg.circle) elements.push(generateCircle(svg.circle, scope));
  if (svg.rect) elements.push(generateRect(svg.rect, scope));
  if (svg.line) elements.push(generateLine(svg.line, scope));
  if (svg.polyline) elements.push(generatePolyline(svg.polyline, scope));
  if (svg.polygon) elements.push(generatePolygon(svg.polygon, scope));

  if (svg.group) {
    for (const groupData of svg.group) {
      const groupElements: string[] = [];
      const transform = groupData.transform ? evalExpr(groupData.transform, scope) : null;
      if (groupData.path) groupElements.push(generatePath(groupData.path, scope));
      if (groupData.circle) groupElements.push(generateCircle(groupData.circle, scope));
      if (groupData.rect) groupElements.push(generateRect(groupData.rect, scope));
      if (groupData.line) groupElements.push(generateLine(groupData.line, scope));
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
    body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f0f0; font-family: system-ui, sans-serif; }
    .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px; }
    h2 { margin-top: 0; color: #333; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
