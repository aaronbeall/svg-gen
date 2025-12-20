// ============================================================================
// Core Types
// ============================================================================

/** The scope type - index signature avoids implicit any errors */
export interface Scope {
  [key: string]: any;
}

/** Expression: either a static value or a function of scope */
export type Expr<T, S extends Scope = Scope> = T | (($: S) => T);

/** A let block: static values or expressions */
export type LetBlock<S extends Scope = Scope> = {
  [key: string]: Expr<number | string | boolean, S>;
};

// ============================================================================
// Modifiers (transform points or values)
// ============================================================================

/** Noise configuration */
export interface NoiseConfig<S extends Scope = Scope> {
  /** Noise scale/frequency (default: 1) */
  scale?: Expr<number, S>;
  /** Displacement amplitude */
  amplitude?: Expr<number, S>;
  /** Random seed for reproducibility */
  seed?: Expr<number, S>;
  /** Noise type (default: 'simplex') */
  type?: Expr<'perlin' | 'simplex' | 'value', S>;
  /** Octaves for fractal noise (default: 1) */
  octaves?: Expr<number, S>;
  /** Lacunarity for fractal noise (default: 2) */
  lacunarity?: Expr<number, S>;
  /** Persistence for fractal noise (default: 0.5) */
  persistence?: Expr<number, S>;
}

/** Jitter configuration */
export interface JitterConfig<S extends Scope = Scope> {
  /** Max X offset */
  x?: Expr<number, S>;
  /** Max Y offset */
  y?: Expr<number, S>;
  /** Random seed */
  seed?: Expr<number, S>;
}

/** Subdivision configuration */
export interface SubdivideConfig<S extends Scope = Scope> {
  /** Number of subdivision iterations */
  iterations?: Expr<number, S>;
  /** Algorithm (default: 'chaikin') */
  algorithm?: Expr<'chaikin' | 'midpoint', S>;
}

/** Smooth configuration */
export interface SmoothConfig<S extends Scope = Scope> {
  /** Smoothing strength 0-1 (default: 0.5) */
  strength?: Expr<number, S>;
  /** Number of iterations (default: 1) */
  iterations?: Expr<number, S>;
}

/** Mirror configuration */
export interface MirrorConfig<S extends Scope = Scope> {
  /** Mirror axis: 'x' | 'y' | 'both' */
  axis: Expr<'x' | 'y' | 'both', S>;
  /** Axis position (default: center of points) */
  at?: Expr<number, S>;
  /** Include original points (default: true) */
  includeOriginal?: Expr<boolean, S>;
}

/** Point modifiers that transform point arrays */
export interface PointModifiers<S extends Scope = Scope> {
  /** Apply noise displacement to points */
  noise?: NoiseConfig<S>;
  /** Apply random jitter to points */
  jitter?: JitterConfig<S>;
  /** Subdivide path segments */
  subdivide?: SubdivideConfig<S>;
  /** Smooth the path */
  smooth?: SmoothConfig<S>;
  /** Mirror points across axis */
  mirror?: MirrorConfig<S>;
}

// ============================================================================
// Style Properties
// ============================================================================

/** Common style properties for rendered elements */
export interface StyleProps<S extends Scope = Scope> {
  fill?: Expr<string, S>;
  stroke?: Expr<string, S>;
  strokeWidth?: Expr<number, S>;
}

// ============================================================================
// Scope Properties
// ============================================================================

/** Properties for scope creation - shared by iterators, groups, and SvgDef */
export interface ScopeProps<S extends Scope = Scope> {
  /** Scope variables */
  let?: LetBlock<S>;
}

// ============================================================================
// Iterator Scope Types
// ============================================================================

/** For iterator provides i, t */
export type ForIteratorScope = Scope & { i: number; t: number };

/** Spiral iterator provides x, y, t, theta, r, i */
export type SpiralIteratorScope = Scope & { x: number; y: number; t: number; theta: number; r: number; i: number };

/** Lissajous iterator provides x, y, t, i */
export type LissajousIteratorScope = Scope & { x: number; y: number; t: number; i: number };

/** Rose iterator provides x, y, theta, r, i */
export type RoseIteratorScope = Scope & { x: number; y: number; theta: number; r: number; i: number };

/** Parametric iterator provides x, y, t, i */
export type ParametricIteratorScope = Scope & { x: number; y: number; t: number; i: number };

/** Superformula iterator provides x, y, theta, r, t, i */
export type SuperformulaIteratorScope = Scope & { x: number; y: number; theta: number; r: number; t: number; i: number };

/** Epitrochoid iterator provides x, y, theta, t, i */
export type EpitrochoidIteratorScope = Scope & { x: number; y: number; theta: number; t: number; i: number };

/** Hypotrochoid iterator provides x, y, theta, t, i */
export type HypotrochoidIteratorScope = Scope & { x: number; y: number; theta: number; t: number; i: number };

/** Flowfield iterator provides x, y, vx, vy, t, i */
export type FlowfieldIteratorScope = Scope & { x: number; y: number; vx: number; vy: number; t: number; i: number };

/** Attractor iterator provides x, y, z, t, i */
export type AttractorIteratorScope = Scope & { x: number; y: number; z: number; t: number; i: number };

/** Fractal iterator provides x1, y1, x2, y2, depth, i */
export type FractalIteratorScope = Scope & { x1: number; y1: number; x2: number; y2: number; depth: number; i: number };

/** Voronoi iterator provides x, y (cell center), vertices (cell polygon), i */
export type VoronoiIteratorScope = Scope & { x: number; y: number; vertices: [number, number][]; i: number };

/** Delaunay iterator provides x1, y1, x2, y2, x3, y3 (triangle vertices), cx, cy (centroid), i */
export type DelaunayIteratorScope = Scope & { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; cx: number; cy: number; i: number };

/** Tile iterator provides x, y (tile center), vertices (tile polygon), row, col, i */
export type TileIteratorScope = Scope & { x: number; y: number; vertices: [number, number][]; row: number; col: number; i: number };

/** Pack iterator provides x, y, r (packed circle), i */
export type PackIteratorScope = Scope & { x: number; y: number; r: number; i: number };

/** Distribute iterator provides x, y, t, i */
export type DistributeIteratorScope = Scope & { x: number; y: number; t: number; i: number };

/** Random iterator provides x, y, t, i */
export type RandomIteratorScope = Scope & { x: number; y: number; t: number; i: number };

/** Poisson iterator provides x, y, t, i */
export type PoissonIteratorScope = Scope & { x: number; y: number; t: number; i: number };

/** Noise iterator provides x, y, value, i - samples noise at grid positions */
export type NoiseIteratorScope = Scope & { x: number; y: number; value: number; i: number };

/** Grid iterator provides x, y, row, col, i, t */
export type GridIteratorScope = Scope & { x: number; y: number; row: number; col: number; i: number; t: number };

/** Collect scope provides points array and count */
export type CollectScope = Scope & { points: [number, number][]; count: number };

// ============================================================================
// Iterator Types (provide scope variables at each step)
// ============================================================================

/** For loop iterator - provides i, t in scope */
export interface ForIterator extends ScopeProps<ForIteratorScope> {
  /** Starting index */
  i: number;
  /** End index (exclusive) */
  to: Expr<number>;
}

/** Grid iterator - provides x, y, row, col, i, t in scope */
export interface GridIterator extends ScopeProps<GridIteratorScope> {
  /** Number of columns */
  cols: Expr<number>;
  /** Number of rows */
  rows: Expr<number>;
  /** Cell width (default: 1) */
  cellWidth?: Expr<number>;
  /** Cell height (default: 1) */
  cellHeight?: Expr<number>;
  /** X offset (default: 0) */
  x?: Expr<number>;
  /** Y offset (default: 0) */
  y?: Expr<number>;
}

/** Spiral iterator - provides x, y, t, theta, r, i in scope */
export interface SpiralIterator extends ScopeProps<SpiralIteratorScope>, ShapeOutput<SpiralIteratorScope> {
  cx: Expr<number>;
  cy: Expr<number>;
  startRadius: Expr<number>;
  endRadius: Expr<number>;
  turns: Expr<number>;
  type?: Expr<'archimedean' | 'logarithmic' | 'fermat'>;
  samples?: Expr<number>;
}

/** Lissajous iterator - provides x, y, t, i in scope */
export interface LissajousIterator extends ScopeProps<LissajousIteratorScope> {
  cx: Expr<number>;
  cy: Expr<number>;
  ax: Expr<number>;
  ay: Expr<number>;
  fx: Expr<number>;
  fy: Expr<number>;
  delta?: Expr<number>;
  samples?: Expr<number>;
}

/** Rose iterator - provides x, y, theta, r, i in scope */
export interface RoseIterator extends ScopeProps<RoseIteratorScope> {
  cx: Expr<number>;
  cy: Expr<number>;
  r: Expr<number>;
  k: Expr<number>;
  samples?: Expr<number>;
}

/** Parametric iterator - provides x, y, t, i in scope */
export interface ParametricIterator extends ScopeProps<ParametricIteratorScope> {
  x: ($: Scope & { t: number }) => number;
  y: ($: Scope & { t: number }) => number;
  t: [Expr<number>, Expr<number>];
  samples?: Expr<number>;
}

/** Superformula iterator - Gielis superformula for generalized shapes */
export interface SuperformulaIterator extends ScopeProps<SuperformulaIteratorScope> {
  cx: Expr<number>;
  cy: Expr<number>;
  /** Scale factor */
  scale?: Expr<number>;
  /** Symmetry parameter (number of rotational symmetries) */
  m: Expr<number>;
  /** Shape parameters */
  n1: Expr<number>;
  n2: Expr<number>;
  n3: Expr<number>;
  /** Optional a, b parameters (default 1) */
  a?: Expr<number>;
  b?: Expr<number>;
  samples?: Expr<number>;
}

/** Epitrochoid iterator - curve traced by point on circle rolling outside another circle */
export interface EpitrochoidIterator extends ScopeProps<EpitrochoidIteratorScope> {
  cx: Expr<number>;
  cy: Expr<number>;
  /** Radius of fixed circle */
  R: Expr<number>;
  /** Radius of rolling circle */
  r: Expr<number>;
  /** Distance from center of rolling circle to tracing point */
  d: Expr<number>;
  /** Number of revolutions */
  revolutions?: Expr<number>;
  samples?: Expr<number>;
}

/** Hypotrochoid iterator - curve traced by point on circle rolling inside another circle */
export interface HypotrochoidIterator extends ScopeProps<HypotrochoidIteratorScope> {
  cx: Expr<number>;
  cy: Expr<number>;
  /** Radius of fixed circle */
  R: Expr<number>;
  /** Radius of rolling circle */
  r: Expr<number>;
  /** Distance from center of rolling circle to tracing point */
  d: Expr<number>;
  /** Number of revolutions */
  revolutions?: Expr<number>;
  samples?: Expr<number>;
}

/** Flowfield iterator - points following a vector field */
export interface FlowfieldIterator extends ScopeProps<FlowfieldIteratorScope> {
  /** Vector field function returning [vx, vy] for each position */
  field: ($: Scope & { x: number; y: number }) => [number, number];
  /** Starting points or grid definition */
  start: { x: Expr<number>; y: Expr<number> }[] | { cols: Expr<number>; rows: Expr<number>; width: Expr<number>; height: Expr<number> };
  /** Number of steps to follow field */
  steps: Expr<number>;
  /** Step size */
  stepSize?: Expr<number>;
}

/** Attractor iterator - strange attractor (Lorenz, etc.) */
export interface AttractorIterator extends ScopeProps<AttractorIteratorScope> {
  /** Attractor type */
  type: Expr<'lorenz' | 'rossler' | 'thomas' | 'aizawa' | 'halvorsen'>;
  /** Center position for 2D projection */
  cx: Expr<number>;
  cy: Expr<number>;
  /** Scale factor */
  scale?: Expr<number>;
  /** Number of iterations */
  iterations: Expr<number>;
  /** Time step (dt) */
  dt?: Expr<number>;
  /** Attractor-specific parameters */
  params?: Record<string, Expr<number>>;
}

/** Fractal iterator - L-system or recursive fractal curves */
export interface FractalIterator extends ScopeProps<FractalIteratorScope> {
  /** Fractal type */
  type: Expr<'koch' | 'dragon' | 'hilbert' | 'sierpinski' | 'levy'>;
  /** Starting position */
  x: Expr<number>;
  y: Expr<number>;
  /** Initial segment length */
  length: Expr<number>;
  /** Initial angle (degrees) */
  angle?: Expr<number>;
  /** Recursion depth */
  depth: Expr<number>;
}

/** Points can be: static array, array with expressions, or expression returning array */
export type PointsExpr<S extends Scope = Scope> = Expr<[number, number][], S> | [Expr<number, S>, Expr<number, S>][];

/** Voronoi iterator - iterates over Voronoi cells from seed points */
export interface VoronoiIterator<S extends Scope = Scope> extends ScopeProps<VoronoiIteratorScope> {
  /** Seed points - static array, array with expressions, or expression returning points */
  points: PointsExpr<S>;
  /** Bounding box */
  bounds?: { x: Expr<number>; y: Expr<number>; width: Expr<number>; height: Expr<number> };
}

/** Delaunay iterator - iterates over Delaunay triangles from points */
export interface DelaunayIterator<S extends Scope = Scope> extends ScopeProps<DelaunayIteratorScope> {
  /** Input points - static array, array with expressions, or expression returning points */
  points: PointsExpr<S>;
}

/** Tile iterator - regular tiling patterns */
export interface TileIterator extends ScopeProps<TileIteratorScope> {
  /** Tile type */
  type: Expr<'square' | 'hex' | 'triangle' | 'penrose'>;
  /** Tile size */
  size: Expr<number>;
  /** Grid dimensions */
  cols: Expr<number>;
  rows: Expr<number>;
  /** Origin offset */
  x?: Expr<number>;
  y?: Expr<number>;
}

/** Pack iterator - circle packing */
export interface PackIterator extends ScopeProps<PackIteratorScope> {
  /** Bounding shape */
  bounds: { type: 'circle'; cx: Expr<number>; cy: Expr<number>; r: Expr<number> }
    | { type: 'rect'; x: Expr<number>; y: Expr<number>; width: Expr<number>; height: Expr<number> };
  /** Number of circles to pack */
  count: Expr<number>;
  /** Min/max radius */
  minRadius?: Expr<number>;
  maxRadius?: Expr<number>;
  /** Padding between circles */
  padding?: Expr<number>;
}

/** Distribute iterator - evenly distribute points along a path or within an area */
export interface DistributeIterator extends ScopeProps<DistributeIteratorScope> {
  /** Number of points */
  count: Expr<number>;
  /** Distribution mode */
  along?: { path: PathData } | { circle: { cx: Expr<number>; cy: Expr<number>; r: Expr<number> } };
  within?: { rect: { x: Expr<number>; y: Expr<number>; width: Expr<number>; height: Expr<number> } }
    | { circle: { cx: Expr<number>; cy: Expr<number>; r: Expr<number> } };
}

/** Random iterator - uniformly random points within bounds */
export interface RandomIterator extends ScopeProps<RandomIteratorScope> {
  /** Number of points */
  count: Expr<number>;
  /** Bounding area */
  bounds: { x: Expr<number>; y: Expr<number>; width: Expr<number>; height: Expr<number> };
  /** Random seed for reproducibility */
  seed?: Expr<number>;
}

/** Poisson disk sampling iterator - evenly-spaced random points */
export interface PoissonIterator extends ScopeProps<PoissonIteratorScope> {
  /** Minimum distance between points */
  radius: Expr<number>;
  /** Bounding area */
  bounds: { x: Expr<number>; y: Expr<number>; width: Expr<number>; height: Expr<number> };
  /** Random seed for reproducibility */
  seed?: Expr<number>;
  /** Max attempts per point (default 30) */
  maxAttempts?: Expr<number>;
}

/** Noise iterator - samples noise values at grid positions */
export interface NoiseIterator extends ScopeProps<NoiseIteratorScope>, NoiseConfig {
  /** Number of columns */
  cols: Expr<number>;
  /** Number of rows */
  rows: Expr<number>;
  /** Sampling area */
  bounds?: { x: Expr<number>; y: Expr<number>; width: Expr<number>; height: Expr<number> };
}

// ============================================================================
// Collect - accumulates iterator points into an array for batch consumers
// ============================================================================

/**
 * Collect runs an iterator and accumulates all [x, y] points into an array,
 * then provides that array as `points` in scope for consumers like Voronoi/Delaunay.
 */
export interface Collect extends ShapeOutput<CollectScope>, ScopeProps<CollectScope> {
  /** Source iterator that produces x, y coordinates */
  points: ShapeIteratorProps;
  /** Voronoi iterator with access to collected points */
  voronoi?: VoronoiIterator<CollectScope> & ShapeOutput<VoronoiIteratorScope>;
  /** Delaunay iterator with access to collected points */
  delaunay?: DelaunayIterator<CollectScope> & ShapeOutput<DelaunayIteratorScope>;
}

// ============================================================================
// Iterator Output Types (what iterators produce)
// ============================================================================

/** Point output for point-based shapes */
export interface PointOutput<S extends Scope = Scope> {
  /** Point(s) to produce at each step (default is [$.x, $.y] when available, e.g. with curve iterators) */
  point?: OneOrMany<[Expr<number, S>, Expr<number, S>]>;
}

/** Shape output for iterators and groups */
export interface ShapeOutput<S extends Scope = Scope> {
  circle?: CircleData<S>;
  rect?: RectData<S>;
  line?: LineData<S>;
  path?: PathData<S>;
  polyline?: PolylineData<S>;
  polygon?: PolygonData<S>;
  /** Nested groups */
  group?: GroupData[];
  /** Collect iterator points into array for batch consumers */
  collect?: Collect;
}

// ============================================================================
// Point-based Shapes (iterators produce points)
// ============================================================================

/** Base for shapes that use point iterators */
export interface PointIteratorProps {
  /** For loop iterator (point required) */
  for?: ForIterator & PointOutput<ForIteratorScope>;
  /** Spiral iterator */
  spiral?: SpiralIterator & PointOutput<SpiralIteratorScope>;
  /** Lissajous iterator */
  lissajous?: LissajousIterator & PointOutput<LissajousIteratorScope>;
  /** Rose iterator */
  rose?: RoseIterator & PointOutput<RoseIteratorScope>;
  /** Parametric iterator */
  parametric?: ParametricIterator & PointOutput<ParametricIteratorScope>;
  /** Superformula iterator */
  superformula?: SuperformulaIterator & PointOutput<SuperformulaIteratorScope>;
  /** Epitrochoid iterator (spirograph outer) */
  epitrochoid?: EpitrochoidIterator & PointOutput<EpitrochoidIteratorScope>;
  /** Hypotrochoid iterator (spirograph inner) */
  hypotrochoid?: HypotrochoidIterator & PointOutput<HypotrochoidIteratorScope>;
  /** Fractal iterator */
  fractal?: FractalIterator & PointOutput<FractalIteratorScope>;
  /** Attractor iterator */
  attractor?: AttractorIterator & PointOutput<AttractorIteratorScope>;
  /** Flowfield iterator */
  flowfield?: FlowfieldIterator & PointOutput<FlowfieldIteratorScope>;
  /** Grid iterator */
  grid?: GridIterator & PointOutput<GridIteratorScope>;
}

/** Direct points array (alternative to iterator) */
export interface DirectPoints<S extends Scope = Scope> {
  /** Direct array of [x, y] points */
  points?: Expr<[number, number][], S>;
}

/** Path from points */
export interface PathData<S extends Scope = Scope> extends PointIteratorProps, DirectPoints<S>, StyleProps<S>, PointModifiers<S> {
  /** Close the path */
  close?: boolean;
}

/** Polyline from points */
export interface PolylineData<S extends Scope = Scope> extends PointIteratorProps, DirectPoints<S>, StyleProps<S>, PointModifiers<S> {}

/** Polygon from points */
export interface PolygonData<S extends Scope = Scope> extends PointIteratorProps, DirectPoints<S>, StyleProps<S>, PointModifiers<S> {}

// ============================================================================
// Fixed Shapes (no iterators - use container iterators to produce multiples)
// ============================================================================

/** Circle - single circle, use group iterator for multiples */
export interface CircleData<S extends Scope = Scope> extends StyleProps<S> {
  cx: Expr<number, S>;
  cy: Expr<number, S>;
  r: Expr<number, S>;
}

/** Rectangle - single rect, use group iterator for multiples */
export interface RectData<S extends Scope = Scope> extends StyleProps<S> {
  x: Expr<number, S>;
  y: Expr<number, S>;
  width: Expr<number, S>;
  height: Expr<number, S>;
}

/** Line - single line, use group iterator for multiples */
export interface LineData<S extends Scope = Scope> extends Omit<StyleProps<S>, 'fill'> {
  x1: Expr<number, S>;
  y1: Expr<number, S>;
  x2: Expr<number, S>;
  y2: Expr<number, S>;
}

// ============================================================================
// Curve & Path Generators
// ============================================================================

/** Bezier curve with control points */
export interface BezierData extends StyleProps, PointModifiers {
  /** Start point */
  start: [Expr<number>, Expr<number>];
  /** Control point 1 */
  cp1: [Expr<number>, Expr<number>];
  /** Control point 2 (cubic only) */
  cp2?: [Expr<number>, Expr<number>];
  /** End point */
  end: [Expr<number>, Expr<number>];
  /** Number of samples for path approximation */
  samples?: Expr<number>;
  close?: boolean;
}

/** Spline through points with tension control */
export interface SplineData extends StyleProps, PointModifiers {
  /** Points to interpolate through */
  points: [Expr<number>, Expr<number>][] | ForIterator;
  /** Tension: 0 = Catmull-Rom, 1 = linear */
  tension?: Expr<number>;
  /** Close the spline */
  close?: boolean;
}

// ============================================================================
// Union Types & Helpers
// ============================================================================

/** Single item or array of items */
type OneOrMany<T> = T | T[];

/** Union of all shape types */
export type Shape =
  | PathData
  | PolylineData
  | PolygonData
  | CircleData
  | RectData
  | LineData
  | BezierData
  | SplineData;

/** Union of all iterator types */
export type Iterator =
  | ForIterator
  | GridIterator
  | SpiralIterator
  | LissajousIterator
  | RoseIterator
  | ParametricIterator
  | SuperformulaIterator
  | EpitrochoidIterator
  | HypotrochoidIterator
  | FractalIterator
  | AttractorIterator
  | FlowfieldIterator
  | VoronoiIterator
  | DelaunayIterator
  | TileIterator
  | PackIterator
  | DistributeIterator
  | RandomIterator
  | PoissonIterator
  | NoiseIterator;

// ============================================================================
// Iterator Properties (shared by SvgDef and GroupData)
// ============================================================================

/** Shape iterators that produce shapes at each step */
export interface ShapeIteratorProps {
  /** For loop iterator */
  for?: ForIterator & ShapeOutput<ForIteratorScope>;
  /** Spiral iterator */
  spiral?: SpiralIterator;
  /** Lissajous iterator */
  lissajous?: LissajousIterator & ShapeOutput<LissajousIteratorScope>;
  /** Rose iterator */
  rose?: RoseIterator & ShapeOutput<RoseIteratorScope>;
  /** Parametric iterator */
  parametric?: ParametricIterator & ShapeOutput<ParametricIteratorScope>;
  /** Superformula iterator */
  superformula?: SuperformulaIterator & ShapeOutput<SuperformulaIteratorScope>;
  /** Epitrochoid iterator */
  epitrochoid?: EpitrochoidIterator & ShapeOutput<EpitrochoidIteratorScope>;
  /** Hypotrochoid iterator */
  hypotrochoid?: HypotrochoidIterator & ShapeOutput<HypotrochoidIteratorScope>;
  /** Fractal iterator */
  fractal?: FractalIterator & ShapeOutput<FractalIteratorScope>;
  /** Attractor iterator */
  attractor?: AttractorIterator & ShapeOutput<AttractorIteratorScope>;
  /** Flowfield iterator */
  flowfield?: FlowfieldIterator & ShapeOutput<FlowfieldIteratorScope>;
  /** Voronoi iterator */
  voronoi?: VoronoiIterator & ShapeOutput<VoronoiIteratorScope>;
  /** Delaunay iterator */
  delaunay?: DelaunayIterator & ShapeOutput<DelaunayIteratorScope>;
  /** Tile iterator */
  tile?: TileIterator & ShapeOutput<TileIteratorScope>;
  /** Pack iterator */
  pack?: PackIterator & ShapeOutput<PackIteratorScope>;
  /** Distribute iterator */
  distribute?: DistributeIterator & ShapeOutput<DistributeIteratorScope>;
  /** Random iterator */
  random?: RandomIterator & ShapeOutput<RandomIteratorScope>;
  /** Poisson disk sampling iterator */
  poisson?: PoissonIterator & ShapeOutput<PoissonIteratorScope>;
  /** Noise iterator - samples noise values at grid positions */
  noise?: NoiseIterator & ShapeOutput<NoiseIteratorScope>;
  /** Grid iterator */
  grid?: GridIterator & ShapeOutput<GridIteratorScope>;
}

// ============================================================================
// Group (container for generators, can have iterator to produce multiples)
// ============================================================================

/** Group of generators with optional transform and shape iterators */
export interface GroupData extends ShapeOutput, ShapeIteratorProps, ScopeProps {
  transform?: Expr<string>;
}

// ============================================================================
// SVG Definition
// ============================================================================

/**
 * SVG definition - the main input type for rendering.
 *
 * The `let` block defines scope variables. Values can be:
 * - Static: `cx: 100`
 * - Computed: `step: $ => Math.PI / $.spikes`
 *
 * Computed values can reference any other let value via `$`.
 * The evaluator resolves these in order, accumulating the scope.
 *
 * @example
 * const star: SvgDef = {
 *   size: [200, 200],
 *   let: {
 *     cx: 100,
 *     cy: 100,
 *     spikes: 5,
 *     rot: -90 * Math.PI / 180,
 *     step: $ => Math.PI / $.spikes
 *   },
 *   path: {
 *     for: {
 *       i: 0,
 *       to: $ => $.spikes * 2,
 *       let: {
 *         r: $ => $.i % 2 === 0 ? $.outer : $.inner,
 *         a: $ => $.rot + $.i * $.step
 *       },
 *       point: [
 *         $ => $.cx + Math.cos($.a) * $.r,
 *         $ => $.cy + Math.sin($.a) * $.r
 *       ]
 *     },
 *     close: true
 *   }
 * };
 */
export interface SvgDef extends ShapeOutput, ShapeIteratorProps, ScopeProps {
  size: [number, number];
}