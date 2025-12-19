// ============================================================================
// Core Types
// ============================================================================

/** The scope type - index signature avoids implicit any errors */
export interface Scope {
  [key: string]: any;
}

/** Expression: either a static value or a function of scope */
export type Expr<T> = T | (($: Scope) => T);

/** A let block: static values or expressions */
export interface LetBlock {
  [key: string]: Expr<number | string | boolean>;
}

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
export interface ScopeProps {
  /** Scope variables */
  let?: LetBlock;
}

// ============================================================================
// Iterator Types (provide scope variables at each step)
// ============================================================================

/** Common properties for iterators */
export interface IteratorBaseProps extends ScopeProps {
  /** Iterator scope variables */
  $?: string[];
}

/** Iterator scope */
export type IteratorScope<T extends IteratorBaseProps> = Scope & {
  // declare the iterator variables as properties
  [key in NonNullable<T['$']>[number]]: number;
}

/** For loop iterator - provides i, t in scope */
export interface ForIterator extends IteratorBaseProps {
  /** Starting index */
  i: number;
  /** End index (exclusive) */
  to: Expr<number>;
  /** Iterator scope variables */
  $?: ['i', 't'];
}

/** For iterator scope */
export type ForIteratorScope = IteratorScope<ForIterator>;

/** Spiral iterator - provides x, y, t, theta, r, i in scope */
export interface SpiralIterator extends IteratorBaseProps {
  cx: Expr<number>;
  cy: Expr<number>;
  startRadius: Expr<number>;
  endRadius: Expr<number>;
  turns: Expr<number>;
  type?: Expr<'archimedean' | 'logarithmic' | 'fermat'>;
  samples?: Expr<number>;
  /** Iterator scope variables */
  $?: ['x', 'y', 't', 'theta', 'r', 'i'];
}

/** Spiral iterator scope */
export type SpiralIteratorScope = IteratorScope<SpiralIterator>;

/** Lissajous iterator - provides x, y, t, i in scope */
export interface LissajousIterator extends IteratorBaseProps {
  cx: Expr<number>;
  cy: Expr<number>;
  ax: Expr<number>;
  ay: Expr<number>;
  fx: Expr<number>;
  fy: Expr<number>;
  delta?: Expr<number>;
  samples?: Expr<number>;
  /** Iterator scope variables */
  $?: ['x', 'y', 't', 'i'];
}

/** Lissajous iterator scope */
export type LissajousIteratorScope = IteratorScope<LissajousIterator>;

/** Rose iterator - provides x, y, theta, r, i in scope */
export interface RoseIterator extends IteratorBaseProps {
  cx: Expr<number>;
  cy: Expr<number>;
  r: Expr<number>;
  k: Expr<number>;
  samples?: Expr<number>;
  /** Iterator scope variables */
  $?: ['x', 'y', 'theta', 'r', 'i'];
}

/** Rose iterator scope */
export type RoseIteratorScope = IteratorScope<RoseIterator>;

/** Parametric iterator - provides x, y, t, i in scope */
export interface ParametricIterator extends IteratorBaseProps {
  x: ($: Scope & { t: number }) => number;
  y: ($: Scope & { t: number }) => number;
  t: [Expr<number>, Expr<number>];
  samples?: Expr<number>;
  /** Iterator scope variables */
  $?: ['x', 'y', 't', 'i'];
}

/** Parametric iterator scope */
export type ParametricIteratorScope = IteratorScope<ParametricIterator>;

// ============================================================================
// Iterator Output Types (what iterators produce)
// ============================================================================

/** Point output for point-based shapes */
export interface PointOutput {
  /** Point(s) to produce at each step (default is [$.x, $.y] when available, e.g. with curve iterators) */
  point?: OneOrMany<[Expr<number>, Expr<number>]>;
}

/** Shape output for iterators and groups */
export interface ShapeOutput {
  // Basic primitives
  circle?: OneOrMany<CircleData>;
  rect?: OneOrMany<RectData>;
  line?: OneOrMany<LineData>;
  path?: OneOrMany<PathData>;
  polyline?: OneOrMany<PolylineData>;
  polygon?: OneOrMany<PolygonData>;
  /** Nested groups and shapes with explicit stacking order */
  group?: OneOrMany<GroupData>;
}

// These "shapes" aren't implement and may become iterators or modifiers instead
interface NOT_YET_IMPLEMENT {
  // Curve generators (not yet implemented)
  bezier?: OneOrMany<BezierData>;
  spline?: OneOrMany<SplineData>;

  // Fractals & recursive (not yet implemented)
  fractal?: OneOrMany<FractalData>;
  recursive?: OneOrMany<RecursiveData>;

  // Field-based generation (not yet implemented)
  flowfield?: OneOrMany<FlowFieldData>;
  attractor?: OneOrMany<AttractorData>;
  isoline?: OneOrMany<IsolineData>;

  // Complex parametric curves (not yet implemented)
  superformula?: OneOrMany<SuperformulaData>;
  epitrochoid?: OneOrMany<EpitrochoidData>;
  hypotrochoid?: OneOrMany<HypotrochoidData>;

  // Tiling & patterns (not yet implemented)
  tile?: OneOrMany<TileData>;
  voronoi?: OneOrMany<VoronoiData>;
  delaunay?: OneOrMany<DelaunayData>;

  // Constraints & physics (not yet implemented)
  spring?: OneOrMany<SpringData>;
  pack?: OneOrMany<PackData>;
  distribute?: OneOrMany<DistributeData>;
}

// ============================================================================
// Point-based Shapes (iterators produce points)
// ============================================================================

/** Base for shapes that use point iterators */
export interface PointIteratorProps {
  /** For loop iterator (point required) */
  for?: ForIterator & PointOutput;
  /** Spiral iterator (point optional, defaults to [$.x, $.y]) */
  spiral?: SpiralIterator & PointOutput;
  /** Lissajous iterator */
  lissajous?: LissajousIterator & PointOutput;
  /** Rose iterator */
  rose?: RoseIterator & PointOutput;
  /** Parametric iterator */
  parametric?: ParametricIterator & PointOutput;
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
export interface CircleData extends StyleProps {
  cx: Expr<number>;
  cy: Expr<number>;
  r: Expr<number>;
}

/** Rectangle - single rect, use group iterator for multiples */
export interface RectData extends StyleProps {
  x: Expr<number>;
  y: Expr<number>;
  width: Expr<number>;
  height: Expr<number>;
}

/** Line - single line, use group iterator for multiples */
export interface LineData extends Omit<StyleProps, 'fill'> {
  x1: Expr<number>;
  y1: Expr<number>;
  x2: Expr<number>;
  y2: Expr<number>;
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

// Note: SpiralData, LissajousData, RoseData, ParametricData are now iterators
// defined in the Iterators section above (SpiralIterator, etc.)

// ============================================================================
// Fractals & Recursive
// ============================================================================

/** L-system fractal definition */
export interface FractalData extends StyleProps, InlineModifiers {
  /** Axiom (starting string) */
  axiom: string;
  /** Production rules */
  rules: Record<string, string>;
  /** Number of iterations */
  iterations: Expr<number>;
  /** Step length */
  length: Expr<number>;
  /** Turn angle in degrees */
  angle: Expr<number>;
  /** Starting position */
  start?: [Expr<number>, Expr<number>];
  /** Starting angle */
  startAngle?: Expr<number>;
}

/** Recursive self-similar geometry */
export interface RecursiveData extends StyleProps, InlineModifiers {
  /** Base shape generator */
  base: ForIterator;
  /** Transform to apply at each level */
  transform: Expr<string>;
  /** Scale factor per level */
  scale: Expr<number>;
  /** Maximum recursion depth */
  depth: Expr<number>;
  /** Minimum size to stop recursion */
  minSize?: Expr<number>;
}

// ============================================================================
// Field-Based Generation
// ============================================================================

/** Points/paths following a vector field */
export interface FlowFieldData extends StyleProps, InlineModifiers {
  /** Field function returning angle at (x, y) */
  field: ($: Scope & { x: number; y: number }) => number;
  /** Starting points */
  seeds: [Expr<number>, Expr<number>][] | ForIterator;
  /** Steps per path */
  steps: Expr<number>;
  /** Step size */
  stepSize: Expr<number>;
}

/** Strange attractor projected to 2D */
export interface AttractorData extends StyleProps, InlineModifiers {
  /** Attractor type or custom equations */
  type: Expr<'lorenz' | 'clifford' | 'dejong' | 'custom'>;
  /** Parameters (a, b, c, d, etc.) */
  params?: Record<string, Expr<number>>;
  /** Custom equations for 'custom' type */
  equations?: {
    x: ($: Scope & { x: number; y: number; z?: number }) => number;
    y: ($: Scope & { x: number; y: number; z?: number }) => number;
    z?: ($: Scope & { x: number; y: number; z?: number }) => number;
  };
  /** Number of iterations */
  iterations: Expr<number>;
  /** Scale factor */
  scale?: Expr<number>;
  /** Center offset */
  cx?: Expr<number>;
  cy?: Expr<number>;
}

/** Contour lines from scalar field */
export interface IsolineData extends StyleProps, InlineModifiers {
  /** Scalar field function */
  field: ($: Scope & { x: number; y: number }) => number;
  /** Contour value(s) */
  levels: Expr<number> | Expr<number>[];
  /** Sampling bounds */
  bounds: {
    x: [Expr<number>, Expr<number>];
    y: [Expr<number>, Expr<number>];
  };
  /** Grid resolution */
  resolution?: Expr<number>;
}

// ============================================================================
// Complex Parametric Curves (produce paths directly, not iterators)
// ============================================================================

/** Gielis superformula for organic shapes */
export interface SuperformulaData extends StyleProps, InlineModifiers {
  /** Center point */
  cx: Expr<number>;
  cy: Expr<number>;
  /** Scale */
  scale: Expr<number>;
  /** Superformula parameters */
  m: Expr<number>;
  n1: Expr<number>;
  n2: Expr<number>;
  n3: Expr<number>;
  a?: Expr<number>;
  b?: Expr<number>;
  /** Number of samples */
  samples?: Expr<number>;
  close?: boolean;
}

/** Epitrochoid (outer spirograph) */
export interface EpitrochoidData extends StyleProps, InlineModifiers {
  /** Center point */
  cx: Expr<number>;
  cy: Expr<number>;
  /** Fixed circle radius */
  R: Expr<number>;
  /** Rolling circle radius */
  r: Expr<number>;
  /** Pen distance from rolling center */
  d: Expr<number>;
  /** Number of rotations */
  rotations?: Expr<number>;
  /** Number of samples */
  samples?: Expr<number>;
  close?: boolean;
}

/** Hypotrochoid (inner spirograph) */
export interface HypotrochoidData extends StyleProps, InlineModifiers {
  /** Center point */
  cx: Expr<number>;
  cy: Expr<number>;
  /** Fixed circle radius */
  R: Expr<number>;
  /** Rolling circle radius */
  r: Expr<number>;
  /** Pen distance from rolling center */
  d: Expr<number>;
  /** Number of rotations */
  rotations?: Expr<number>;
  /** Number of samples */
  samples?: Expr<number>;
  close?: boolean;
}

// ============================================================================
// Tiling & Patterns
// ============================================================================

/** Tile with wallpaper group symmetry */
export interface TileData extends StyleProps {
  /** Base tile geometry */
  tile: Generator;
  /** Wallpaper group: 'p1' | 'p2' | 'pm' | 'pg' | 'cm' | 'p4' | 'p4m' | 'p6' | 'p6m' etc. */
  symmetry: Expr<string>;
  /** Tile size */
  size: [Expr<number>, Expr<number>];
  /** Grid dimensions */
  grid: [Expr<number>, Expr<number>];
}

/** Voronoi diagram from seed points */
export interface VoronoiData extends StyleProps, InlineModifiers {
  /** Seed points */
  seeds: [Expr<number>, Expr<number>][] | ForIterator;
  /** Bounding box */
  bounds: {
    x: [Expr<number>, Expr<number>];
    y: [Expr<number>, Expr<number>];
  };
  /** Output: 'cells' | 'edges' | 'both' */
  output?: Expr<'cells' | 'edges' | 'both'>;
}

/** Delaunay triangulation */
export interface DelaunayData extends StyleProps, InlineModifiers {
  /** Points to triangulate */
  points: [Expr<number>, Expr<number>][] | ForIterator;
  /** Output: 'triangles' | 'edges' | 'both' */
  output?: Expr<'triangles' | 'edges' | 'both'>;
}

// ============================================================================
// Constraints & Physics
// ============================================================================

/** Spring-connected points relaxation */
export interface SpringData extends StyleProps, InlineModifiers {
  /** Initial points */
  points: [Expr<number>, Expr<number>][] | ForIterator;
  /** Spring connections: pairs of point indices */
  connections: [number, number][];
  /** Rest length (or 'auto' for initial distances) */
  restLength?: Expr<number> | 'auto';
  /** Spring stiffness */
  stiffness?: Expr<number>;
  /** Relaxation iterations */
  iterations?: Expr<number>;
  /** Fixed point indices */
  fixed?: number[];
}

/** Circle packing within boundary */
export interface PackData extends StyleProps {
  /** Number of circles */
  count: Expr<number>;
  /** Boundary shape */
  boundary: CircleData | RectData | ForIterator;
  /** Min/max radius */
  radius: [Expr<number>, Expr<number>];
  /** Packing iterations */
  iterations?: Expr<number>;
  /** Random seed */
  seed?: Expr<number>;
}

/** Poisson disk distribution */
export interface DistributeData extends StyleProps {
  /** Bounding area */
  bounds: {
    x: [Expr<number>, Expr<number>];
    y: [Expr<number>, Expr<number>];
  };
  /** Minimum distance between points */
  minDistance: Expr<number>;
  /** Maximum attempts per point */
  maxAttempts?: Expr<number>;
  /** Random seed */
  seed?: Expr<number>;
  /** Output as circles with given radius */
  asCircles?: Expr<number>;
}

// ============================================================================
// Generator Union Type & Helpers
// ============================================================================

/** Single item or array of items */
type OneOrMany<T> = T | T[];

/** Union of all shape/generator types */
export type Generator =
  | PathData
  | PolylineData
  | PolygonData
  | CircleData
  | RectData
  | LineData
  | BezierData
  | SplineData
  | FractalData
  | RecursiveData
  | FlowFieldData
  | AttractorData
  | IsolineData
  | SuperformulaData
  | EpitrochoidData
  | HypotrochoidData
  | VoronoiData
  | DelaunayData
  | SpringData
  | PackData
  | DistributeData;

/** Union of all iterator types */
export type Iterator =
  | ForIterator
  | SpiralIterator
  | LissajousIterator
  | RoseIterator
  | ParametricIterator;

// ============================================================================
// Iterator Properties (shared by SvgDef and GroupData)
// ============================================================================

/** Shape iterators that produce shapes at each step */
export interface ShapeIteratorProps {
  /** For loop iterator that produces shapes */
  for?: ForIterator & ShapeOutput;
  /** Spiral iterator that produces shapes */
  spiral?: SpiralIterator & ShapeOutput;
  /** Lissajous iterator that produces shapes */
  lissajous?: LissajousIterator & ShapeOutput;
  /** Rose iterator that produces shapes */
  rose?: RoseIterator & ShapeOutput;
  /** Parametric iterator that produces shapes */
  parametric?: ParametricIterator & ShapeOutput;
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