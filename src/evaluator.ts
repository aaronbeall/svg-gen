import type {
  SvgDef, LetBlock, PathData, CircleData, RectData, LineData, PolylineData, PolygonData, GroupData,
  ForIterator, GridIterator, SpiralIterator, LissajousIterator, RoseIterator, ParametricIterator,
  SuperformulaIterator, EpitrochoidIterator, HypotrochoidIterator, FlowfieldIterator, AttractorIterator,
  FractalIterator, VoronoiIterator, DelaunayIterator, TileIterator, PackIterator,
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

/** Evaluate points from iterator steps or direct points array */
function evalPoints(data: PathData | PolylineData | PolygonData, scope: Record<string, ScopeValue>): EvalPoint[] {
  // Check for direct points array first
  if (data.points) {
    const pointsArray = evalExpr(data.points, scope);
    return pointsArray.map(([x, y]) => ({ x, y }));
  }

  // Otherwise use iterator
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

/** Iterate a fractal curve, yielding scope steps with x1, y1, x2, y2, depth, i (as points for path) */
function* iterateFractal(data: FractalIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const type = evalExpr(data.type, parentScope);
  const startX = evalExpr(data.x, parentScope);
  const startY = evalExpr(data.y, parentScope);
  const length = evalExpr(data.length, parentScope);
  const angleDeg = data.angle ? evalExpr(data.angle, parentScope) : 0;
  const depth = evalExpr(data.depth, parentScope);

  // Generate fractal points
  const points: { x: number; y: number }[] = [];
  
  // L-system style generation using turtle graphics
  interface TurtleState { x: number; y: number; angle: number }
  
  function generatePoints(type: string, x: number, y: number, len: number, angle: number, depth: number): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [{ x, y }];
    const stack: TurtleState[] = [];
    let turtle: TurtleState = { x, y, angle: angle * Math.PI / 180 };

    function forward(distance: number) {
      turtle.x += Math.cos(turtle.angle) * distance;
      turtle.y += Math.sin(turtle.angle) * distance;
      pts.push({ x: turtle.x, y: turtle.y });
    }

    function turn(degrees: number) {
      turtle.angle += degrees * Math.PI / 180;
    }

    function push() {
      stack.push({ ...turtle });
    }

    function pop() {
      turtle = stack.pop()!;
    }

    // Generate L-system string
    function lSystem(axiom: string, rules: Record<string, string>, iterations: number): string {
      let result = axiom;
      for (let i = 0; i < iterations; i++) {
        result = result.split('').map(c => rules[c] || c).join('');
      }
      return result;
    }

    // Execute L-system commands
    function execute(commands: string, segmentLength: number, turnAngle: number) {
      for (const cmd of commands) {
        switch (cmd) {
          case 'F': case 'G': forward(segmentLength); break;
          case '+': turn(turnAngle); break;
          case '-': turn(-turnAngle); break;
          case '[': push(); break;
          case ']': pop(); pts.push({ x: turtle.x, y: turtle.y }); break;
        }
      }
    }

    const segLen = len / Math.pow(3, depth);

    switch (type) {
      case 'koch': {
        const commands = lSystem('F', { 'F': 'F+F--F+F' }, depth);
        execute(commands, segLen, 60);
        break;
      }
      case 'dragon': {
        const commands = lSystem('FX', { 'X': 'X+YF+', 'Y': '-FX-Y' }, depth);
        execute(commands, len / Math.pow(1.41, depth), 90);
        break;
      }
      case 'hilbert': {
        const commands = lSystem('A', { 
          'A': '-BF+AFA+FB-', 
          'B': '+AF-BFB-FA+' 
        }, depth);
        execute(commands, len / (Math.pow(2, depth) - 1), 90);
        break;
      }
      case 'sierpinski': {
        const commands = lSystem('F-G-G', { 
          'F': 'F-G+F+G-F', 
          'G': 'GG' 
        }, depth);
        execute(commands, len / Math.pow(2, depth), 120);
        break;
      }
      case 'levy': {
        const commands = lSystem('F', { 'F': '+F--F+' }, depth);
        execute(commands, len / Math.pow(1.41, depth), 45);
        break;
      }
    }

    return pts;
  }

  const fractalPoints = generatePoints(type, startX, startY, length, angleDeg, depth);
  
  // Yield each point (for path drawing)
  for (let i = 0; i < fractalPoints.length; i++) {
    const pt = fractalPoints[i];
    const prevPt = i > 0 ? fractalPoints[i - 1] : pt;
    const t = fractalPoints.length > 1 ? i / (fractalPoints.length - 1) : 0;
    
    const stepScope = {
      x: pt.x,
      y: pt.y,
      x1: prevPt.x,
      y1: prevPt.y,
      x2: pt.x,
      y2: pt.y,
      depth,
      t,
      i
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Compute Voronoi diagram using Fortune's algorithm (simplified brute-force for now) */
function computeVoronoi(
  sites: { x: number; y: number }[],
  bounds: { x: number; y: number; width: number; height: number }
): { center: { x: number; y: number }; vertices: [number, number][] }[] {
  const cells: { center: { x: number; y: number }; vertices: [number, number][] }[] = [];
  const { x: bx, y: by, width, height } = bounds;
  const resolution = 2; // pixels per sample

  // For each site, find its Voronoi cell by sampling
  for (const site of sites) {
    const cellPoints: Set<string> = new Set();
    
    // Sample grid points and find which belong to this cell
    for (let py = by; py <= by + height; py += resolution) {
      for (let px = bx; px <= bx + width; px += resolution) {
        // Find closest site
        let minDist = Infinity;
        let closest = site;
        for (const s of sites) {
          const d = (px - s.x) ** 2 + (py - s.y) ** 2;
          if (d < minDist) {
            minDist = d;
            closest = s;
          }
        }
        if (closest === site) {
          cellPoints.add(`${px},${py}`);
        }
      }
    }

    // Convert sampled points to convex hull for cell boundary
    const points: [number, number][] = Array.from(cellPoints).map(s => {
      const [x, y] = s.split(',').map(Number);
      return [x, y] as [number, number];
    });

    if (points.length > 2) {
      const hull = convexHull(points);
      cells.push({ center: site, vertices: hull });
    }
  }

  return cells;
}

/** Compute convex hull using Graham scan */
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;

  // Find bottom-most point (or left-most in case of tie)
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][1] < points[start][1] ||
        (points[i][1] === points[start][1] && points[i][0] < points[start][0])) {
      start = i;
    }
  }
  [points[0], points[start]] = [points[start], points[0]];
  const pivot = points[0];

  // Sort by polar angle
  const sorted = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
    const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
    return angleA - angleB;
  });

  // Build hull
  const hull: [number, number][] = [pivot];
  for (const p of sorted) {
    while (hull.length > 1) {
      const a = hull[hull.length - 2];
      const b = hull[hull.length - 1];
      const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      if (cross <= 0) hull.pop();
      else break;
    }
    hull.push(p);
  }

  return hull;
}

/** Iterate Voronoi cells, yielding scope steps with x, y (center), vertices, i */
function* iterateVoronoi(data: VoronoiIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  // Evaluate seed points
  const sites = data.points.map(([xExpr, yExpr]) => ({
    x: evalExpr(xExpr, parentScope),
    y: evalExpr(yExpr, parentScope)
  }));

  // Get bounds (default to bounding box of points with padding)
  let bounds: { x: number; y: number; width: number; height: number };
  if (data.bounds) {
    bounds = {
      x: evalExpr(data.bounds.x, parentScope),
      y: evalExpr(data.bounds.y, parentScope),
      width: evalExpr(data.bounds.width, parentScope),
      height: evalExpr(data.bounds.height, parentScope)
    };
  } else {
    const xs = sites.map(s => s.x);
    const ys = sites.map(s => s.y);
    const padding = 20;
    bounds = {
      x: Math.min(...xs) - padding,
      y: Math.min(...ys) - padding,
      width: Math.max(...xs) - Math.min(...xs) + padding * 2,
      height: Math.max(...ys) - Math.min(...ys) + padding * 2
    };
  }

  const cells = computeVoronoi(sites, bounds);

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const t = cells.length > 1 ? i / (cells.length - 1) : 0;

    const stepScope = {
      x: cell.center.x,
      y: cell.center.y,
      vertices: cell.vertices,
      t,
      i
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Compute Delaunay triangulation using Bowyer-Watson algorithm */
function computeDelaunay(points: { x: number; y: number }[]): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }[] {
  if (points.length < 3) return [];

  // Find bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const dx = maxX - minX;
  const dy = maxY - minY;
  const deltaMax = Math.max(dx, dy) * 2;

  // Create super-triangle
  const p1 = { x: minX - deltaMax, y: minY - deltaMax };
  const p2 = { x: minX + deltaMax * 2, y: minY - deltaMax };
  const p3 = { x: minX + dx / 2, y: maxY + deltaMax };

  interface Triangle { p1: { x: number; y: number }; p2: { x: number; y: number }; p3: { x: number; y: number } }

  function circumcircleContains(tri: Triangle, p: { x: number; y: number }): boolean {
    const ax = tri.p1.x, ay = tri.p1.y;
    const bx = tri.p2.x, by = tri.p2.y;
    const cx = tri.p3.x, cy = tri.p3.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-10) return false;

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const r2 = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);

    const dist2 = (p.x - ux) * (p.x - ux) + (p.y - uy) * (p.y - uy);
    return dist2 <= r2;
  }

  let triangles: Triangle[] = [{ p1, p2, p3 }];

  // Add points one at a time
  for (const point of points) {
    const badTriangles: Triangle[] = [];
    
    for (const tri of triangles) {
      if (circumcircleContains(tri, point)) {
        badTriangles.push(tri);
      }
    }

    // Find boundary polygon
    const polygon: { p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];
    for (const tri of badTriangles) {
      const edges = [
        { p1: tri.p1, p2: tri.p2 },
        { p1: tri.p2, p2: tri.p3 },
        { p1: tri.p3, p2: tri.p1 }
      ];
      for (const edge of edges) {
        let shared = false;
        for (const other of badTriangles) {
          if (other === tri) continue;
          const otherEdges = [
            [other.p1, other.p2], [other.p2, other.p3], [other.p3, other.p1]
          ];
          for (const [oe1, oe2] of otherEdges) {
            if ((edge.p1 === oe1 && edge.p2 === oe2) || (edge.p1 === oe2 && edge.p2 === oe1)) {
              shared = true;
              break;
            }
          }
          if (shared) break;
        }
        if (!shared) polygon.push(edge);
      }
    }

    // Remove bad triangles
    triangles = triangles.filter(t => !badTriangles.includes(t));

    // Create new triangles
    for (const edge of polygon) {
      triangles.push({ p1: edge.p1, p2: edge.p2, p3: point });
    }
  }

  // Remove triangles that share vertices with super-triangle
  triangles = triangles.filter(tri => 
    tri.p1 !== p1 && tri.p1 !== p2 && tri.p1 !== p3 &&
    tri.p2 !== p1 && tri.p2 !== p2 && tri.p2 !== p3 &&
    tri.p3 !== p1 && tri.p3 !== p2 && tri.p3 !== p3
  );

  return triangles.map(tri => ({
    x1: tri.p1.x, y1: tri.p1.y,
    x2: tri.p2.x, y2: tri.p2.y,
    x3: tri.p3.x, y3: tri.p3.y
  }));
}

/** Iterate Delaunay triangles, yielding scope steps with x1,y1,x2,y2,x3,y3, cx,cy, i */
function* iterateDelaunay(data: DelaunayIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const points = data.points.map(([xExpr, yExpr]) => ({
    x: evalExpr(xExpr, parentScope),
    y: evalExpr(yExpr, parentScope)
  }));

  const triangles = computeDelaunay(points);

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    const t = triangles.length > 1 ? i / (triangles.length - 1) : 0;
    const cx = (tri.x1 + tri.x2 + tri.x3) / 3;
    const cy = (tri.y1 + tri.y2 + tri.y3) / 3;

    const stepScope = {
      x: cx,
      y: cy,
      x1: tri.x1, y1: tri.y1,
      x2: tri.x2, y2: tri.y2,
      x3: tri.x3, y3: tri.y3,
      cx, cy,
      vertices: [[tri.x1, tri.y1], [tri.x2, tri.y2], [tri.x3, tri.y3]] as [number, number][],
      t,
      i
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
  }
}

/** Iterate tiles in a regular pattern, yielding scope steps with x, y, vertices, row, col, i */
function* iterateTile(data: TileIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const type = evalExpr(data.type, parentScope);
  const size = evalExpr(data.size, parentScope);
  const cols = evalExpr(data.cols, parentScope);
  const rows = evalExpr(data.rows, parentScope);
  const offsetX = data.x ? evalExpr(data.x, parentScope) : 0;
  const offsetY = data.y ? evalExpr(data.y, parentScope) : 0;

  let i = 0;
  const total = cols * rows;

  // Generate tile vertices based on type
  function getSquareVertices(cx: number, cy: number, s: number): [number, number][] {
    const h = s / 2;
    return [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]];
  }

  function getHexVertices(cx: number, cy: number, s: number): [number, number][] {
    const vertices: [number, number][] = [];
    for (let a = 0; a < 6; a++) {
      const angle = (a * 60 - 30) * Math.PI / 180;
      vertices.push([cx + s * Math.cos(angle), cy + s * Math.sin(angle)]);
    }
    return vertices;
  }

  function getTriangleVertices(cx: number, cy: number, s: number, pointUp: boolean): [number, number][] {
    const h = s * Math.sqrt(3) / 2;
    if (pointUp) {
      return [[cx, cy - h * 2/3], [cx - s/2, cy + h/3], [cx + s/2, cy + h/3]];
    } else {
      return [[cx, cy + h * 2/3], [cx - s/2, cy - h/3], [cx + s/2, cy - h/3]];
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const t = total > 1 ? i / (total - 1) : 0;
      let x: number, y: number;
      let vertices: [number, number][];

      switch (type) {
        case 'square':
          x = offsetX + col * size + size / 2;
          y = offsetY + row * size + size / 2;
          vertices = getSquareVertices(x, y, size);
          break;

        case 'hex': {
          const hexW = size * Math.sqrt(3);
          const hexH = size * 1.5;
          x = offsetX + col * hexW + (row % 2 === 1 ? hexW / 2 : 0) + hexW / 2;
          y = offsetY + row * hexH + size;
          vertices = getHexVertices(x, y, size);
          break;
        }

        case 'triangle': {
          const triW = size;
          const triH = size * Math.sqrt(3) / 2;
          const pointUp = (row + col) % 2 === 0;
          x = offsetX + col * (size / 2) + size / 2;
          y = offsetY + row * triH + triH / 2;
          vertices = getTriangleVertices(x, y, size, pointUp);
          break;
        }

        case 'penrose':
          // Simplified - just use rhombus for now
          x = offsetX + col * size + size / 2;
          y = offsetY + row * size + size / 2;
          vertices = getSquareVertices(x, y, size);
          break;

        default:
          x = offsetX + col * size + size / 2;
          y = offsetY + row * size + size / 2;
          vertices = getSquareVertices(x, y, size);
      }

      const stepScope = { x, y, vertices, row, col, t, i };
      const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
      yield { ...stepScope, ...innerScope };
      i++;
    }
  }
}

/** Pack circles within a bounding shape using front-chain algorithm */
function* iteratePack(data: PackIterator, parentScope: Record<string, ScopeValue>): Generator<IteratorStep> {
  const count = evalExpr(data.count, parentScope);
  const minRadius = data.minRadius ? evalExpr(data.minRadius, parentScope) : 5;
  const maxRadius = data.maxRadius ? evalExpr(data.maxRadius, parentScope) : 20;
  const padding = data.padding ? evalExpr(data.padding, parentScope) : 2;

  // Get bounds
  let boundsType: 'circle' | 'rect';
  let boundsCx: number, boundsCy: number, boundsR: number;
  let boundsX: number, boundsY: number, boundsW: number, boundsH: number;

  if (data.bounds.type === 'circle') {
    boundsType = 'circle';
    boundsCx = evalExpr(data.bounds.cx, parentScope);
    boundsCy = evalExpr(data.bounds.cy, parentScope);
    boundsR = evalExpr(data.bounds.r, parentScope);
    boundsX = boundsCx - boundsR;
    boundsY = boundsCy - boundsR;
    boundsW = boundsR * 2;
    boundsH = boundsR * 2;
  } else {
    boundsType = 'rect';
    boundsX = evalExpr(data.bounds.x, parentScope);
    boundsY = evalExpr(data.bounds.y, parentScope);
    boundsW = evalExpr(data.bounds.width, parentScope);
    boundsH = evalExpr(data.bounds.height, parentScope);
    boundsCx = boundsX + boundsW / 2;
    boundsCy = boundsY + boundsH / 2;
    boundsR = Math.min(boundsW, boundsH) / 2;
  }

  // Check if circle fits within bounds
  function fitsInBounds(x: number, y: number, r: number): boolean {
    if (boundsType === 'circle') {
      const dist = Math.sqrt((x - boundsCx) ** 2 + (y - boundsCy) ** 2);
      return dist + r <= boundsR;
    } else {
      return x - r >= boundsX && x + r <= boundsX + boundsW &&
             y - r >= boundsY && y + r <= boundsY + boundsH;
    }
  }

  // Check if circle overlaps with existing circles
  function overlaps(x: number, y: number, r: number, circles: { x: number; y: number; r: number }[]): boolean {
    for (const c of circles) {
      const dist = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
      if (dist < r + c.r + padding) return true;
    }
    return false;
  }

  const circles: { x: number; y: number; r: number }[] = [];
  let attempts = 0;
  const maxAttempts = count * 500;

  // Simple random placement with collision detection
  while (circles.length < count && attempts < maxAttempts) {
    attempts++;

    // Random position and radius
    const r = minRadius + Math.random() * (maxRadius - minRadius);
    let x: number, y: number;

    if (boundsType === 'circle') {
      // Random point in circle
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (boundsR - r);
      x = boundsCx + Math.cos(angle) * dist;
      y = boundsCy + Math.sin(angle) * dist;
    } else {
      // Random point in rect
      x = boundsX + r + Math.random() * (boundsW - r * 2);
      y = boundsY + r + Math.random() * (boundsH - r * 2);
    }

    if (fitsInBounds(x, y, r) && !overlaps(x, y, r, circles)) {
      circles.push({ x, y, r });
    }
  }

  // Sort by size (largest first) for nicer output
  circles.sort((a, b) => b.r - a.r);

  // Yield circles
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const t = circles.length > 1 ? i / (circles.length - 1) : 0;

    const stepScope = {
      x: c.x,
      y: c.y,
      r: c.r,
      t,
      i
    };
    const innerScope = data.let ? createScope(data.let as AnyLetBlock, { ...parentScope, ...stepScope }) : stepScope;
    yield { ...stepScope, ...innerScope };
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
  if (data.fractal) return iterateFractal(data.fractal, scope);
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
  if (data.fractal) result.push({ iterator: iterateFractal(data.fractal, scope), output: data.fractal as AnyShapeOutput });
  if (data.voronoi) result.push({ iterator: iterateVoronoi(data.voronoi, scope), output: data.voronoi as AnyShapeOutput });
  if (data.delaunay) result.push({ iterator: iterateDelaunay(data.delaunay, scope), output: data.delaunay as AnyShapeOutput });
  if (data.tile) result.push({ iterator: iterateTile(data.tile, scope), output: data.tile as AnyShapeOutput });
  if (data.pack) result.push({ iterator: iteratePack(data.pack, scope), output: data.pack as AnyShapeOutput });
  // Not yet implemented
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
