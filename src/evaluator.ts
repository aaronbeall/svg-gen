import type { SvgDef, LetBlock, ForLoop, PathData, CircleData, RectData, LineData, PolylineData, PolygonData } from './types.js';

// ============================================================================
// Evaluated AST Types
// ============================================================================

export interface EvalPoint {
  x: number;
  y: number;
}

export interface EvalPath {
  type: 'path';
  points: EvalPoint[];
  close: boolean;
  d: string;
}

export interface EvalCircle {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface EvalRect {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface EvalLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface EvalPolyline {
  type: 'polyline';
  points: EvalPoint[];
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface EvalPolygon {
  type: 'polygon';
  points: EvalPoint[];
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface EvalGroup {
  type: 'group';
  transform: string | null;
  children: EvalElement[];
}

export type EvalElement = EvalPath | EvalCircle | EvalRect | EvalLine | EvalPolyline | EvalPolygon | EvalGroup;

export interface EvalSvg {
  width: number;
  height: number;
  elements: EvalElement[];
}

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
        if (evaluating.has(prop)) throw new Error(`Circular reference detected: ${prop}`);
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
  if (typeof expr === 'function') return (expr as (s: any) => T)(scope);
  return expr;
}

// ============================================================================
// Evaluation (DSL -> EvalAST)
// ============================================================================

function evalForLoop(forLoop: ForLoop, parentScope: Record<string, ScopeValue>): EvalPoint[] {
  const points: EvalPoint[] = [];
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
    points.push({ x: evalExpr(xExpr, innerScope), y: evalExpr(yExpr, innerScope) });
  }

  return points;
}

function pointsToPathD(points: EvalPoint[], close: boolean): string {
  if (points.length === 0) return '';
  const commands = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  if (close) commands.push('Z');
  return commands.join(' ');
}

function evalPath(data: PathData, scope: Record<string, ScopeValue>): EvalPath {
  const points = data.for ? evalForLoop(data.for, scope) : [];
  const close = data.close ?? false;
  const d = pointsToPathD(points, close);
  return { type: 'path', points, close, d };
}

function evalCircle(data: CircleData, scope: Record<string, ScopeValue>): EvalCircle {
  return {
    type: 'circle',
    cx: evalExpr(data.cx, scope),
    cy: evalExpr(data.cy, scope),
    r: evalExpr(data.r, scope),
    fill: data.fill ? evalExpr(data.fill, scope) : 'none',
    stroke: data.stroke ? evalExpr(data.stroke, scope) : 'black',
    strokeWidth: data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1
  };
}

function evalRect(data: RectData, scope: Record<string, ScopeValue>): EvalRect {
  return {
    type: 'rect',
    x: evalExpr(data.x, scope),
    y: evalExpr(data.y, scope),
    width: evalExpr(data.width, scope),
    height: evalExpr(data.height, scope),
    fill: data.fill ? evalExpr(data.fill, scope) : 'none',
    stroke: data.stroke ? evalExpr(data.stroke, scope) : 'black',
    strokeWidth: data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1
  };
}

function evalLine(data: LineData, scope: Record<string, ScopeValue>): EvalLine {
  return {
    type: 'line',
    x1: evalExpr(data.x1, scope),
    y1: evalExpr(data.y1, scope),
    x2: evalExpr(data.x2, scope),
    y2: evalExpr(data.y2, scope),
    stroke: data.stroke ? evalExpr(data.stroke, scope) : 'black',
    strokeWidth: data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1
  };
}

function evalPolyline(data: PolylineData, scope: Record<string, ScopeValue>): EvalPolyline {
  return {
    type: 'polyline',
    points: data.for ? evalForLoop(data.for, scope) : [],
    fill: data.fill ? evalExpr(data.fill, scope) : 'none',
    stroke: data.stroke ? evalExpr(data.stroke, scope) : 'black',
    strokeWidth: data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1
  };
}

function evalPolygon(data: PolygonData, scope: Record<string, ScopeValue>): EvalPolygon {
  return {
    type: 'polygon',
    points: data.for ? evalForLoop(data.for, scope) : [],
    fill: data.fill ? evalExpr(data.fill, scope) : 'none',
    stroke: data.stroke ? evalExpr(data.stroke, scope) : 'black',
    strokeWidth: data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 1
  };
}

function toArray<T>(item: T | T[] | undefined): T[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export function evaluate(svg: SvgDef): EvalSvg {
  const [width, height] = svg.size;
  const scope = createScope(svg.let);
  const elements: EvalElement[] = [];

  for (const p of toArray(svg.path)) elements.push(evalPath(p, scope));
  for (const c of toArray(svg.circle)) elements.push(evalCircle(c, scope));
  for (const r of toArray(svg.rect)) elements.push(evalRect(r, scope));
  for (const l of toArray(svg.line)) elements.push(evalLine(l, scope));
  for (const pl of toArray(svg.polyline)) elements.push(evalPolyline(pl, scope));
  for (const pg of toArray(svg.polygon)) elements.push(evalPolygon(pg, scope));

  if (svg.group) {
    for (const groupData of svg.group) {
      const children: EvalElement[] = [];
      if (groupData.path) children.push(evalPath(groupData.path, scope));
      if (groupData.circle) children.push(evalCircle(groupData.circle, scope));
      if (groupData.rect) children.push(evalRect(groupData.rect, scope));
      if (groupData.line) children.push(evalLine(groupData.line, scope));
      elements.push({
        type: 'group',
        transform: groupData.transform ? evalExpr(groupData.transform, scope) : null,
        children
      });
    }
  }

  return { width, height, elements };
}
