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
// Modifiers (transform points)
// ============================================================================

/** Noise displacement modifier */
export interface NoiseModifier {
  noise: {
    /** Noise scale (frequency) */
    scale?: Expr<number>;
    /** Displacement amplitude */
    amplitude: Expr<number>;
    /** Random seed for reproducibility */
    seed?: Expr<number>;
    /** Noise type */
    type?: Expr<'perlin' | 'simplex' | 'value'>;
  };
}

/** Random jitter modifier */
export interface JitterModifier {
  jitter: {
    /** Max X offset */
    dx: Expr<number>;
    /** Max Y offset */
    dy: Expr<number>;
    /** Random seed */
    seed?: Expr<number>;
  };
}

/** Subdivision smoothing modifier */
export interface SubdivideModifier {
  subdivide: {
    /** Number of subdivision iterations */
    iterations: Expr<number>;
    /** Algorithm: 'chaikin' | 'midpoint' */
    algorithm?: Expr<'chaikin' | 'midpoint'>;
  };
}

/** Morph between current and target shape */
export interface MorphModifier {
  morph: {
    /** Target shape points */
    to: ForIterator;
    /** Interpolation factor 0-1 */
    t: Expr<number>;
  };
}

/** Repeat modifier (radial or linear) */
export interface RepeatModifier {
  repeat: {
    /** Number of repetitions */
    count: Expr<number>;
    /** Radial repeat around center */
    radial?: {
      cx: Expr<number>;
      cy: Expr<number>;
    };
    /** Linear repeat with offset */
    linear?: {
      dx: Expr<number>;
      dy: Expr<number>;
    };
  };
}

/** Mirror modifier */
export interface MirrorModifier {
  mirror: {
    /** Mirror axis: 'x' | 'y' | 'both' */
    axis: Expr<'x' | 'y' | 'both'>;
    /** Axis position */
    at?: Expr<number>;
    /** Include original */
    includeOriginal?: boolean;
  };
}

/** Union of all modifier types */
export type Modifier =
  | NoiseModifier
  | JitterModifier
  | SubdivideModifier
  | MorphModifier
  | RepeatModifier
  | MirrorModifier;

/** Inline modifier properties that can be added to any generator */
export interface InlineModifiers {
  /** Noise displacement */
  noise?: OneOrMany<NoiseModifier['noise']>;
  /** Random jitter */
  jitter?: OneOrMany<JitterModifier['jitter']>;
  /** Subdivision smoothing */
  subdivide?: OneOrMany<SubdivideModifier['subdivide']>;
  /** Repeat (radial or linear) */
  repeat?: OneOrMany<RepeatModifier['repeat']>;
  /** Mirror across axis */
  mirror?: OneOrMany<MirrorModifier['mirror']>;
  /** Explicit modifier stack (applied in order after inline modifiers) */
  modifiers?: OneOrMany<Modifier>;
}

// ============================================================================
// Style Properties
// ============================================================================

/** Common style properties for rendered elements */
export interface StyleProps {
  fill?: Expr<string>;
  stroke?: Expr<string>;
  strokeWidth?: Expr<number>;
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

/** Grid iterator provides x, y, row, col, i, t */
export type GridIteratorScope = Scope & { x: number; y: number; row: number; col: number; i: number; t: number };

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
export interface SpiralIterator extends ScopeProps<SpiralIteratorScope> {
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

/** Voronoi iterator - iterates over Voronoi cells from seed points */
export interface VoronoiIterator extends ScopeProps<VoronoiIteratorScope> {
  /** Seed points */
  points: [Expr<number>, Expr<number>][];
  /** Bounding box */
  bounds?: { x: Expr<number>; y: Expr<number>; width: Expr<number>; height: Expr<number> };
}

/** Delaunay iterator - iterates over Delaunay triangles from points */
export interface DelaunayIterator extends ScopeProps<DelaunayIteratorScope> {
  /** Input points */
  points: [Expr<number>, Expr<number>][];
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
  // Basic primitives
  circle?: OneOrMany<CircleData<S>>;
  rect?: OneOrMany<RectData<S>>;
  line?: OneOrMany<LineData<S>>;
  path?: OneOrMany<PathData>;
  polyline?: OneOrMany<PolylineData>;
  polygon?: OneOrMany<PolygonData>;
  /** Nested groups and shapes */
  group?: OneOrMany<GroupData>;
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

/** Path from points */
export interface PathData extends PointIteratorProps, StyleProps, InlineModifiers {
  /** Close the path */
  close?: boolean;
}

/** Polyline from points */
export interface PolylineData extends PointIteratorProps, StyleProps, InlineModifiers {}

/** Polygon from points */
export interface PolygonData extends PointIteratorProps, StyleProps, InlineModifiers {}

// ============================================================================
// Fixed Shapes (no iterators - use container iterators to produce multiples)
// ============================================================================

/** Circle - single circle, use group iterator for multiples */
export interface CircleData<S extends Scope = Scope> extends StyleProps {
  cx: Expr<number, S>;
  cy: Expr<number, S>;
  r: Expr<number, S>;
}

/** Rectangle - single rect, use group iterator for multiples */
export interface RectData<S extends Scope = Scope> extends StyleProps {
  x: Expr<number, S>;
  y: Expr<number, S>;
  width: Expr<number, S>;
  height: Expr<number, S>;
}

/** Line - single line, use group iterator for multiples */
export interface LineData<S extends Scope = Scope> extends Omit<StyleProps, 'fill'> {
  x1: Expr<number, S>;
  y1: Expr<number, S>;
  x2: Expr<number, S>;
  y2: Expr<number, S>;
}

// ============================================================================
// Curve & Path Generators
// ============================================================================

/** Bezier curve with control points */
export interface BezierData extends StyleProps, InlineModifiers {
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
export interface SplineData extends StyleProps, InlineModifiers {
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
  | DistributeIterator;

// ============================================================================
// Iterator Properties (shared by SvgDef and GroupData)
// ============================================================================

/** Shape iterators that produce shapes at each step */
export interface ShapeIteratorProps {
  /** For loop iterator */
  for?: ForIterator & ShapeOutput<ForIteratorScope>;
  /** Spiral iterator */
  spiral?: SpiralIterator & ShapeOutput<SpiralIteratorScope>;
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