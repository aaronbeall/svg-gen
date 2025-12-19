import type {
  SvgDef, LetBlock, PathData, CircleData, RectData, LineData, PolylineData, PolygonData, GroupData,
  ForIterator, SpiralIterator, LissajousIterator, RoseIterator, ParametricIterator,
  ShapeOutput, ShapeIteratorProps, Scope
} from './types.js';

// Runtime types - evaluator uses base Scope for runtime flexibility
type AnyLetBlock = LetBlock<Scope>;
type AnyShapeOutput = ShapeOutput<Scope>;

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
  fill: string;
  stroke: string;
  strokeWidth: number;
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
// Evaluation Helpers
// ============================================================================

function pointsToPathD(points: EvalPoint[], close: boolean): string {
  if (points.length === 0) return '';
  const commands = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  if (close) commands.push('Z');
  return commands.join(' ');
}

/** Get point expression(s) from a point iterator */
function getPointExprs(data: PathData | PolylineData | PolygonData): [any, any][] | undefined {
  let pointExpr: any;
  if (data.for) pointExpr = data.for.point;
  else if (data.spiral) pointExpr = data.spiral.point;
  else if (data.lissajous) pointExpr = data.lissajous.point;
  else if (data.rose) pointExpr = data.rose.point;
  else if (data.parametric) pointExpr = data.parametric.point;

  if (!pointExpr) return undefined;
  // Normalize to array of point expressions
  if (Array.isArray(pointExpr) && pointExpr.length === 2 && !Array.isArray(pointExpr[0])) {
    return [pointExpr as [any, any]];
  }
  return pointExpr as [any, any][];
}

/** Evaluate points from iterator steps */
function evalPoints(data: PathData | PolylineData | PolygonData, scope: Record<string, ScopeValue>): EvalPoint[] {
  const steps = collectPointIterator(data, scope);
  const pointExprs = getPointExprs(data);

  const points: EvalPoint[] = [];
  for (const step of steps) {
    if (pointExprs) {
      for (const [xExpr, yExpr] of pointExprs) {
        points.push({
          x: evalExpr(xExpr, step),
          y: evalExpr(yExpr, step)
        });
      }
    } else {
      points.push({ x: step.x, y: step.y });
    }
  }
  return points;
}

/** Evaluate a path - collects points from iterator */
function evalPath(data: PathData, scope: Record<string, ScopeValue>): EvalPath {
  const points = evalPoints(data, scope);
  const close = data.close ?? false;
  const d = pointsToPathD(points, close);
  return {
    type: 'path',
    points,
    close,
    d,
    ...evalStyles(data, scope)
  };
}

/** Evaluate a single circle */
function evalCircle(data: CircleData, scope: Record<string, ScopeValue>): EvalCircle {
  return {
    type: 'circle',
    cx: evalExpr(data.cx, scope),
    cy: evalExpr(data.cy, scope),
    r: evalExpr(data.r, scope),
    ...evalStyles(data, scope)
  };
}

/** Evaluate a single rect */
function evalRect(data: RectData, scope: Record<string, ScopeValue>): EvalRect {
  return {
    type: 'rect',
    x: evalExpr(data.x, scope),
    y: evalExpr(data.y, scope),
    width: evalExpr(data.width, scope),
    height: evalExpr(data.height, scope),
    ...evalStyles(data, scope)
  };
}

/** Evaluate a single line */
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

/** Evaluate polyline - collects points from iterator */
function evalPolyline(data: PolylineData, scope: Record<string, ScopeValue>): EvalPolyline {
  return {
    type: 'polyline',
    points: evalPoints(data, scope),
    ...evalStyles(data, scope)
  };
}

/** Evaluate polygon - collects points from iterator */
function evalPolygon(data: PolygonData, scope: Record<string, ScopeValue>): EvalPolygon {
  return {
    type: 'polygon',
    points: evalPoints(data, scope),
    ...evalStyles(data, scope)
  };
}

// ============================================================================
// Iterators - produce scope steps with x, y and other variables
// ============================================================================

/** Helper to extract style props from data */
function evalStyles(data: { fill?: any; stroke?: any; strokeWidth?: any }, scope: Record<string, ScopeValue>) {
  return {
    fill: data.fill ? evalExpr(data.fill, scope) : 'none',
    stroke: data.stroke ? evalExpr(data.stroke, scope) : 'black',
    strokeWidth: data.strokeWidth ? evalExpr(data.strokeWidth, scope) : 2
  };
}

/** Iterator step with scope variables */
interface IteratorStep {
  x: number;
  y: number;
  i: number;
  t: number;
  [key: string]: any;
}

/** Iterate a for loop, yielding scope steps with i, t, and let variables */
function* iterateFor(forLoop: ForIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const start = forLoop.i;

  // First pass to get total count for t calculation
  let total = 0;
  for (let i = start; ; i++) {
    const loopScope = createScope({ i }, parentScope);
    const to = evalExpr(forLoop.to, loopScope);
    if (i >= to) break;
    total++;
  }

  for (let i = start; ; i++) {
    const loopScope = createScope({ i }, parentScope);
    const to = evalExpr(forLoop.to, loopScope);
    if (i >= to) break;

    const innerScope = forLoop.let ? createScope(forLoop.let as AnyLetBlock, loopScope) : loopScope;
    const t = total > 1 ? (i - start) / (total - 1) : 0;

    // For loop doesn't provide x, y - those come from shape's point expression
    yield { ...innerScope, i, t, x: 0, y: 0 };
  }
}

/** Iterate a spiral, yielding scope steps with x, y, theta, r, t, i */
function* iterateSpiral(data: SpiralIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const cx = evalExpr(data.cx, parentScope);
  const cy = evalExpr(data.cy, parentScope);
  const startRadius = evalExpr(data.startRadius, parentScope);
  const endRadius = evalExpr(data.endRadius, parentScope);
  const turns = evalExpr(data.turns, parentScope);
  const type = data.type ? evalExpr(data.type, parentScope) : 'archimedean';
  const samples = data.samples ? evalExpr(data.samples, parentScope) : Math.max(50, Math.round(turns * 30));

  const totalAngle = turns * 2 * Math.PI;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = t * totalAngle;

    let r: number;
    switch (type) {
      case 'logarithmic': {
        const k = Math.log(endRadius / startRadius) / totalAngle;
        r = startRadius * Math.exp(k * theta);
        break;
      }
      case 'fermat': {
        const a = (endRadius - startRadius) / Math.sqrt(totalAngle);
        r = startRadius + a * Math.sqrt(theta);
        break;
      }
      default: {
        r = startRadius + (endRadius - startRadius) * t;
        break;
      }
    }

    const stepScope = { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta), i, t, theta, r };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Iterate a lissajous curve, yielding scope steps */
function* iterateLissajous(data: LissajousIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const cx = evalExpr(data.cx, parentScope);
  const cy = evalExpr(data.cy, parentScope);
  const ax = evalExpr(data.ax, parentScope);
  const ay = evalExpr(data.ay, parentScope);
  const fx = evalExpr(data.fx, parentScope);
  const fy = evalExpr(data.fy, parentScope);
  const delta = data.delta ? evalExpr(data.delta, parentScope) : Math.PI / 2;
  const samples = data.samples ? evalExpr(data.samples, parentScope) : 200;

  const totalT = 2 * Math.PI;

  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * totalT;
    const stepScope = {
      x: cx + ax * Math.sin(fx * t + delta),
      y: cy + ay * Math.sin(fy * t),
      i, t
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Iterate a rose curve, yielding scope steps */
function* iterateRose(data: RoseIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const cx = evalExpr(data.cx, parentScope);
  const cy = evalExpr(data.cy, parentScope);
  const radius = evalExpr(data.r, parentScope);
  const k = evalExpr(data.k, parentScope);
  const samples = data.samples ? evalExpr(data.samples, parentScope) : 200;

  const totalTheta = 2 * Math.PI;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = t * totalTheta;
    const r = radius * Math.cos(k * theta);
    const stepScope = {
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
      i, t, theta, r
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Iterate a parametric curve, yielding scope steps */
function* iterateParametric(data: ParametricIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const [t0Expr, t1Expr] = data.t;
  const t0 = evalExpr(t0Expr, parentScope);
  const t1 = evalExpr(t1Expr, parentScope);
  const samples = data.samples ? evalExpr(data.samples, parentScope) : 100;

  for (let i = 0; i <= samples; i++) {
    const t = t0 + (i / samples) * (t1 - t0);
    const paramScope = { ...parentScope, t };
    const stepScope = {
      x: data.x(paramScope),
      y: data.y(paramScope),
      i, t
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Get iterator from point-based shape data */
function getPointIterator(data: PathData | PolylineData | PolygonData, scope: Record<string, ScopeValue>): Generator<IteratorStep> | null {
  if (data.for) return iterateFor(data.for, scope);
  if (data.spiral) return iterateSpiral(data.spiral, scope);
  if (data.lissajous) return iterateLissajous(data.lissajous, scope);
  if (data.rose) return iterateRose(data.rose, scope);
  if (data.parametric) return iterateParametric(data.parametric, scope);
  return null;
}

/** Collect all steps from a point iterator */
function collectPointIterator(data: PathData | PolylineData | PolygonData, scope: Record<string, ScopeValue>): IteratorStep[] {
  const iterator = getPointIterator(data, scope);
  if (!iterator) return [];
  return [...iterator];
}

/** Get shape iterator from data with IteratorProps */
function getShapeIterator(data: ShapeIteratorProps, scope: Record<string, ScopeValue>): Generator<IteratorStep> | null {
  if (data.for) return iterateFor(data.for, scope);
  if (data.spiral) return iterateSpiral(data.spiral, scope);
  if (data.lissajous) return iterateLissajous(data.lissajous, scope);
  if (data.rose) return iterateRose(data.rose, scope);
  if (data.parametric) return iterateParametric(data.parametric, scope);
  return null;
}

/** Get shape output from a shape iterator */
function getShapeOutput(data: ShapeIteratorProps): AnyShapeOutput | null {
  if (data.for) return data.for as AnyShapeOutput;
  if (data.spiral) return data.spiral as AnyShapeOutput;
  if (data.lissajous) return data.lissajous as AnyShapeOutput;
  if (data.rose) return data.rose as AnyShapeOutput;
  if (data.parametric) return data.parametric as AnyShapeOutput;
  return null;
}

// ============================================================================
// Helper to evaluate all generators from GeneratorProps
// ============================================================================

/** Helper to flatten single or array results */
function pushElements(elements: EvalElement[], result: EvalElement | EvalElement[]) {
  if (Array.isArray(result)) {
    elements.push(...result);
  } else {
    elements.push(result);
  }
}

function evalGenerators(props: ShapeOutput, scope: Record<string, ScopeValue>): EvalElement[] {
  const elements: EvalElement[] = [];

  // Point-based shapes (have their own iterators for points)
  for (const p of toArray(props.path)) elements.push(evalPath(p, scope));
  for (const pl of toArray(props.polyline)) elements.push(evalPolyline(pl, scope));
  for (const pg of toArray(props.polygon)) elements.push(evalPolygon(pg, scope));

  // Fixed shapes (no iterators - use group iterators for multiples)
  for (const c of toArray(props.circle)) elements.push(evalCircle(c, scope));
  for (const r of toArray(props.rect)) elements.push(evalRect(r, scope));
  for (const l of toArray(props.line)) elements.push(evalLine(l, scope));

  return elements;
}

function toArray<T>(item: T | T[] | undefined): T[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

/** Evaluate shapes from iterator output (handles OneOrMany) */
function evalIteratorShapes(output: ShapeOutput, scope: Record<string, ScopeValue>): EvalElement[] {
  const elements: EvalElement[] = [];
  for (const c of toArray(output.circle)) elements.push(evalCircle(c, scope));
  for (const r of toArray(output.rect)) elements.push(evalRect(r, scope));
  for (const l of toArray(output.line)) elements.push(evalLine(l, scope));
  for (const p of toArray(output.path)) elements.push(evalPath(p, scope));
  for (const pl of toArray(output.polyline)) elements.push(evalPolyline(pl, scope));
  for (const pg of toArray(output.polygon)) elements.push(evalPolygon(pg, scope));
  for (const g of toArray(output.group)) pushElements(elements, evalGroup(g, scope));
  return elements;
}

/** Evaluate a group, handling shape iterators */
function evalGroup(groupData: GroupData, parentScope: Record<string, ScopeValue>): EvalGroup | EvalElement[] {
  const groupScope = groupData.let ? createScope(groupData.let, parentScope) : parentScope;
  const iterator = getShapeIterator(groupData, groupScope);
  const shapeOutput = getShapeOutput(groupData);

  if (!iterator || !shapeOutput) {
    // No iterator - single group with static shapes
    const children = evalGenerators(groupData, groupScope);

    // Recursively evaluate nested groups
    for (const nestedGroup of toArray(groupData.group)) {
      pushElements(children, evalGroup(nestedGroup, groupScope));
    }

    return {
      type: 'group',
      transform: groupData.transform ? evalExpr(groupData.transform, groupScope) : null,
      children
    };
  }

  // With iterator - produce shapes at each step
  const elements: EvalElement[] = [];
  for (const step of iterator) {
    const stepScope = { ...groupScope, ...step };
    elements.push(...evalIteratorShapes(shapeOutput, stepScope));
  }
  return elements;
}

export function evaluate(svg: SvgDef): EvalSvg {
  const [width, height] = svg.size;
  const scope = createScope(svg.let);
  const elements: EvalElement[] = evalGenerators(svg, scope);

  // Handle groups
  for (const groupData of toArray(svg.group)) {
    pushElements(elements, evalGroup(groupData, scope));
  }

  // Handle iterators at SvgDef level
  const iterator = getShapeIterator(svg, scope);
  const shapeOutput = getShapeOutput(svg);
  if (iterator && shapeOutput) {
    for (const step of iterator) {
      const stepScope = { ...scope, ...step };
      elements.push(...evalIteratorShapes(shapeOutput, stepScope));
    }
  }

  return { width, height, elements };
}
