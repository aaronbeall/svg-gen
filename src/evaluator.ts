import type {
  SvgDef, LetBlock, PathData, CircleData, RectData, LineData, PolylineData, PolygonData, GroupData,
  ForIterator, GridIterator, SpiralIterator, LissajousIterator, RoseIterator, ParametricIterator,
  SuperformulaIterator, EpitrochoidIterator, HypotrochoidIterator, FlowfieldIterator, AttractorIterator,
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

/** Iterate a grid, yielding scope steps with x, y, row, col, i, t */
function* iterateGrid(data: GridIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const cols = evalExpr(data.cols, parentScope);
  const rows = evalExpr(data.rows, parentScope);
  const cellWidth = data.cellWidth ? evalExpr(data.cellWidth, parentScope) : 1;
  const cellHeight = data.cellHeight ? evalExpr(data.cellHeight, parentScope) : 1;
  const offsetX = data.x ? evalExpr(data.x, parentScope) : 0;
  const offsetY = data.y ? evalExpr(data.y, parentScope) : 0;

  const total = cols * rows;
  let i = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const t = total > 1 ? i / (total - 1) : 0;
      const stepScope = {
        x: offsetX + col * cellWidth + cellWidth / 2,
        y: offsetY + row * cellHeight + cellHeight / 2,
        row, col, i, t
      };
      const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
      yield { ...stepScope, ...innerScope };
      i++;
    }
  }
}

/** Iterate a superformula (Gielis formula), yielding scope steps with x, y, theta, r, t, i */
function* iterateSuperformula(data: SuperformulaIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const cx = evalExpr(data.cx, parentScope);
  const cy = evalExpr(data.cy, parentScope);
  const scale = data.scale ? evalExpr(data.scale, parentScope) : 1;
  const m = evalExpr(data.m, parentScope);
  const n1 = evalExpr(data.n1, parentScope);
  const n2 = evalExpr(data.n2, parentScope);
  const n3 = evalExpr(data.n3, parentScope);
  const a = data.a ? evalExpr(data.a, parentScope) : 1;
  const b = data.b ? evalExpr(data.b, parentScope) : 1;
  const samples = data.samples ? evalExpr(data.samples, parentScope) : 200;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = t * 2 * Math.PI;

    // Superformula: r(theta) = (|cos(m*theta/4)/a|^n2 + |sin(m*theta/4)/b|^n3)^(-1/n1)
    const term1 = Math.abs(Math.cos(m * theta / 4) / a);
    const term2 = Math.abs(Math.sin(m * theta / 4) / b);
    const r = scale * Math.pow(Math.pow(term1, n2) + Math.pow(term2, n3), -1 / n1);

    const stepScope = {
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
      theta, r, t, i
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Iterate an epitrochoid (spirograph outer), yielding scope steps with x, y, theta, t, i */
function* iterateEpitrochoid(data: EpitrochoidIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const cx = evalExpr(data.cx, parentScope);
  const cy = evalExpr(data.cy, parentScope);
  const R = evalExpr(data.R, parentScope);
  const r = evalExpr(data.r, parentScope);
  const d = evalExpr(data.d, parentScope);
  const revolutions = data.revolutions ? evalExpr(data.revolutions, parentScope) : computeRevolutions(R, r);
  const samples = data.samples ? evalExpr(data.samples, parentScope) : Math.max(200, revolutions * 100);

  const totalAngle = revolutions * 2 * Math.PI;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = t * totalAngle;

    // Epitrochoid: point on circle rolling outside fixed circle
    // x = (R + r) * cos(theta) - d * cos((R + r) / r * theta)
    // y = (R + r) * sin(theta) - d * sin((R + r) / r * theta)
    const x = cx + (R + r) * Math.cos(theta) - d * Math.cos(((R + r) / r) * theta);
    const y = cy + (R + r) * Math.sin(theta) - d * Math.sin(((R + r) / r) * theta);

    const stepScope = { x, y, theta, t, i };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Iterate a hypotrochoid (spirograph inner), yielding scope steps with x, y, theta, t, i */
function* iterateHypotrochoid(data: HypotrochoidIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const cx = evalExpr(data.cx, parentScope);
  const cy = evalExpr(data.cy, parentScope);
  const R = evalExpr(data.R, parentScope);
  const r = evalExpr(data.r, parentScope);
  const d = evalExpr(data.d, parentScope);
  const revolutions = data.revolutions ? evalExpr(data.revolutions, parentScope) : computeRevolutions(R, r);
  const samples = data.samples ? evalExpr(data.samples, parentScope) : Math.max(200, revolutions * 100);

  const totalAngle = revolutions * 2 * Math.PI;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = t * totalAngle;

    // Hypotrochoid: point on circle rolling inside fixed circle
    // x = (R - r) * cos(theta) + d * cos((R - r) / r * theta)
    // y = (R - r) * sin(theta) - d * sin((R - r) / r * theta)
    const x = cx + (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
    const y = cy + (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);

    const stepScope = { x, y, theta, t, i };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Compute number of revolutions needed to complete a spirograph pattern */
function computeRevolutions(R: number, r: number): number {
  // Pattern completes after r / gcd(R, r) revolutions
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  return r / gcd(Math.round(R), Math.round(r));
}

/** Iterate a flowfield, yielding scope steps with x, y, vx, vy, t, i for each point along each flow line */
function* iterateFlowfield(data: FlowfieldIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const steps = evalExpr(data.steps, parentScope);
  const stepSize = data.stepSize ? evalExpr(data.stepSize, parentScope) : 1;

  // Get starting points
  let startPoints: { x: number; y: number }[] = [];
  
  if (Array.isArray(data.start)) {
    // Explicit starting points
    startPoints = data.start.map(p => ({
      x: evalExpr(p.x, parentScope),
      y: evalExpr(p.y, parentScope)
    }));
  } else {
    // Grid of starting points
    const cols = evalExpr(data.start.cols, parentScope);
    const rows = evalExpr(data.start.rows, parentScope);
    const width = evalExpr(data.start.width, parentScope);
    const height = evalExpr(data.start.height, parentScope);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        startPoints.push({
          x: (col + 0.5) * (width / cols),
          y: (row + 0.5) * (height / rows)
        });
      }
    }
  }

  let i = 0;
  const totalSteps = startPoints.length * steps;

  // For each starting point, follow the flow
  for (const start of startPoints) {
    let x = start.x;
    let y = start.y;

    for (let step = 0; step < steps; step++) {
      const t = totalSteps > 1 ? i / (totalSteps - 1) : 0;
      const [vx, vy] = data.field({ ...parentScope, x, y });

      const stepScope = { x, y, vx, vy, t, i };
      const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
      yield { ...stepScope, ...innerScope };

      // Move to next position
      x += vx * stepSize;
      y += vy * stepSize;
      i++;
    }
  }
}

/** Iterate a strange attractor, yielding scope steps with x, y, z, t, i */
function* iterateAttractor(data: AttractorIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const type = evalExpr(data.type, parentScope);
  const cx = evalExpr(data.cx, parentScope);
  const cy = evalExpr(data.cy, parentScope);
  const scale = data.scale ? evalExpr(data.scale, parentScope) : 1;
  const iterations = evalExpr(data.iterations, parentScope);
  const dt = data.dt ? evalExpr(data.dt, parentScope) : 0.01;
  
  // Get attractor-specific parameters with defaults
  const params: Record<string, number> = {};
  if (data.params) {
    for (const [key, value] of Object.entries(data.params)) {
      params[key] = evalExpr(value, parentScope);
    }
  }

  // Initial conditions (slightly off-center for interesting behavior)
  let x = 0.1, y = 0, z = 0;

  // Attractor step functions
  const attractors: Record<string, (x: number, y: number, z: number) => [number, number, number]> = {
    lorenz: (x, y, z) => {
      const sigma = params.sigma ?? 10;
      const rho = params.rho ?? 28;
      const beta = params.beta ?? 8 / 3;
      return [
        sigma * (y - x),
        x * (rho - z) - y,
        x * y - beta * z
      ];
    },
    rossler: (x, y, z) => {
      const a = params.a ?? 0.2;
      const b = params.b ?? 0.2;
      const c = params.c ?? 5.7;
      return [
        -y - z,
        x + a * y,
        b + z * (x - c)
      ];
    },
    thomas: (x, y, z) => {
      const b = params.b ?? 0.208186;
      return [
        Math.sin(y) - b * x,
        Math.sin(z) - b * y,
        Math.sin(x) - b * z
      ];
    },
    aizawa: (x, y, z) => {
      const a = params.a ?? 0.95;
      const b = params.b ?? 0.7;
      const c = params.c ?? 0.6;
      const d = params.d ?? 3.5;
      const e = params.e ?? 0.25;
      const f = params.f ?? 0.1;
      return [
        (z - b) * x - d * y,
        d * x + (z - b) * y,
        c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x
      ];
    },
    halvorsen: (x, y, z) => {
      const a = params.a ?? 1.89;
      return [
        -a * x - 4 * y - 4 * z - y * y,
        -a * y - 4 * z - 4 * x - z * z,
        -a * z - 4 * x - 4 * y - x * x
      ];
    }
  };

  const step = attractors[type];
  if (!step) throw new Error(`Unknown attractor type: ${type}`);

  // Skip initial transient
  for (let i = 0; i < 1000; i++) {
    const [dx, dy, dz] = step(x, y, z);
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
  }

  // Generate points
  for (let i = 0; i < iterations; i++) {
    const t = iterations > 1 ? i / (iterations - 1) : 0;
    
    const stepScope = {
      x: cx + x * scale,
      y: cy + y * scale,
      z,
      t,
      i
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };

    // Advance attractor
    const [dx, dy, dz] = step(x, y, z);
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
  }
}

/** Get iterator from point-based shape data */
function getPointIterator(data: PathData | PolylineData | PolygonData, scope: Record<string, ScopeValue>): Generator<IteratorStep> | null {
  if (data.for) return iterateFor(data.for, scope);
  if (data.grid) return iterateGrid(data.grid, scope);
  if (data.spiral) return iterateSpiral(data.spiral, scope);
  if (data.lissajous) return iterateLissajous(data.lissajous, scope);
  if (data.rose) return iterateRose(data.rose, scope);
  if (data.parametric) return iterateParametric(data.parametric, scope);
  if (data.superformula) return iterateSuperformula(data.superformula, scope);
  if (data.epitrochoid) return iterateEpitrochoid(data.epitrochoid, scope);
  if (data.hypotrochoid) return iterateHypotrochoid(data.hypotrochoid, scope);
  if (data.flowfield) return iterateFlowfield(data.flowfield, scope);
  if (data.attractor) return iterateAttractor(data.attractor, scope);
  // Not yet implemented
  if (data.fractal) throw new Error('FractalIterator not yet implemented');
  return null;
}

/** Collect all steps from a point iterator */
function collectPointIterator(data: PathData | PolylineData | PolygonData, scope: Record<string, ScopeValue>): IteratorStep[] {
  const iterator = getPointIterator(data, scope);
  if (!iterator) return [];
  return [...iterator];
}

/** Iterator with its output shapes */
interface IteratorWithOutput {
  iterator: Generator<IteratorStep>;
  output: AnyShapeOutput;
}

/** Get all shape iterators from data with ShapeIteratorProps */
function getShapeIterators(data: ShapeIteratorProps, scope: Record<string, ScopeValue>): IteratorWithOutput[] {
  const result: IteratorWithOutput[] = [];
  if (data.for) result.push({ iterator: iterateFor(data.for, scope), output: data.for as AnyShapeOutput });
  if (data.grid) result.push({ iterator: iterateGrid(data.grid, scope), output: data.grid as AnyShapeOutput });
  if (data.spiral) result.push({ iterator: iterateSpiral(data.spiral, scope), output: data.spiral as AnyShapeOutput });
  if (data.lissajous) result.push({ iterator: iterateLissajous(data.lissajous, scope), output: data.lissajous as AnyShapeOutput });
  if (data.rose) result.push({ iterator: iterateRose(data.rose, scope), output: data.rose as AnyShapeOutput });
  if (data.parametric) result.push({ iterator: iterateParametric(data.parametric, scope), output: data.parametric as AnyShapeOutput });
  if (data.superformula) result.push({ iterator: iterateSuperformula(data.superformula, scope), output: data.superformula as AnyShapeOutput });
  if (data.epitrochoid) result.push({ iterator: iterateEpitrochoid(data.epitrochoid, scope), output: data.epitrochoid as AnyShapeOutput });
  if (data.hypotrochoid) result.push({ iterator: iterateHypotrochoid(data.hypotrochoid, scope), output: data.hypotrochoid as AnyShapeOutput });
  if (data.flowfield) result.push({ iterator: iterateFlowfield(data.flowfield, scope), output: data.flowfield as AnyShapeOutput });
  if (data.attractor) result.push({ iterator: iterateAttractor(data.attractor, scope), output: data.attractor as AnyShapeOutput });
  // Not yet implemented
  if (data.fractal) throw new Error('FractalIterator not yet implemented');
  if (data.voronoi) throw new Error('VoronoiIterator not yet implemented');
  if (data.delaunay) throw new Error('DelaunayIterator not yet implemented');
  if (data.tile) throw new Error('TileIterator not yet implemented');
  if (data.pack) throw new Error('PackIterator not yet implemented');
  if (data.distribute) throw new Error('DistributeIterator not yet implemented');
  return result;
}

/** Evaluate all shape iterators, producing elements for each step */
function evalShapeIterators(iterators: IteratorWithOutput[], baseScope: Record<string, ScopeValue>): EvalElement[] {
  const elements: EvalElement[] = [];
  for (const { iterator, output } of iterators) {
    for (const step of iterator) {
      const stepScope = { ...baseScope, ...step };
      elements.push(...evalIteratorShapes(output, stepScope));
    }
  }
  return elements;
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
  for (const g of toArray(output.group)) elements.push(evalGroup(g, scope));
  return elements;
}

/** Evaluate a group, handling both static shapes and shape iterators */
function evalGroup(groupData: GroupData, parentScope: Record<string, ScopeValue>): EvalGroup {
  const groupScope = groupData.let ? createScope(groupData.let, parentScope) : parentScope;
  
  // Evaluate static shapes
  const children = evalGenerators(groupData, groupScope);

  // Recursively evaluate nested groups
  for (const nestedGroup of toArray(groupData.group)) {
    children.push(evalGroup(nestedGroup, groupScope));
  }

  // Evaluate all shape iterators
  const iterators = getShapeIterators(groupData, groupScope);
  children.push(...evalShapeIterators(iterators, groupScope));

  return {
    type: 'group',
    transform: groupData.transform ? evalExpr(groupData.transform, groupScope) : null,
    children
  };
}

export function evaluate(svg: SvgDef): EvalSvg {
  const [width, height] = svg.size;
  const scope = createScope(svg.let);
  
  // Evaluate static shapes
  const elements: EvalElement[] = evalGenerators(svg, scope);

  // Handle groups
  for (const groupData of toArray(svg.group)) {
    elements.push(evalGroup(groupData, scope));
  }

  // Handle all iterators at SvgDef level
  const iterators = getShapeIterators(svg, scope);
  elements.push(...evalShapeIterators(iterators, scope));

  return { width, height, elements };
}
