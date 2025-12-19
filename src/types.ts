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
  [key: string]: number | string | boolean | (($: Scope) => number | string | boolean);
}

// ============================================================================
// Geometry Primitives
// ============================================================================

export interface ForLoop {
  i: number;
  to: Expr<number>;
  let?: LetBlock;
  point: [Expr<number>, Expr<number>];
}

export interface PathData {
  for?: ForLoop;
  close?: boolean;
}

export interface CircleData {
  cx: Expr<number>;
  cy: Expr<number>;
  r: Expr<number>;
  fill?: Expr<string>;
  stroke?: Expr<string>;
  strokeWidth?: Expr<number>;
}

export interface RectData {
  x: Expr<number>;
  y: Expr<number>;
  width: Expr<number>;
  height: Expr<number>;
  fill?: Expr<string>;
  stroke?: Expr<string>;
  strokeWidth?: Expr<number>;
}

export interface LineData {
  x1: Expr<number>;
  y1: Expr<number>;
  x2: Expr<number>;
  y2: Expr<number>;
  stroke?: Expr<string>;
  strokeWidth?: Expr<number>;
}

export interface PolylineData {
  for?: ForLoop;
  fill?: Expr<string>;
  stroke?: Expr<string>;
  strokeWidth?: Expr<number>;
}

export interface PolygonData {
  for?: ForLoop;
  fill?: Expr<string>;
  stroke?: Expr<string>;
  strokeWidth?: Expr<number>;
}

export interface GroupData {
  transform?: Expr<string>;
  path?: PathData;
  circle?: CircleData;
  rect?: RectData;
  line?: LineData;
}

// ============================================================================
// SVG Element & Geometry
// ============================================================================

/** Single item or array of items */
type OneOrMany<T> = T | T[];

export interface SvgDef {
  size: [number, number];
  let?: LetBlock;
  path?: OneOrMany<PathData>;
  circle?: OneOrMany<CircleData>;
  rect?: OneOrMany<RectData>;
  line?: OneOrMany<LineData>;
  polyline?: OneOrMany<PolylineData>;
  polygon?: OneOrMany<PolygonData>;
  group?: GroupData[];
}

export interface Geometry {
  svg: SvgDef;
}

// ============================================================================
// Builder
// ============================================================================

/**
 * Creates an SVG geometry definition.
 *
 * The `let` block defines scope variables. Values can be:
 * - Static: `cx: 100`
 * - Computed: `step: $ => Math.PI / $.spikes`
 *
 * Computed values can reference any other let value via `$`.
 * The evaluator resolves these in order, accumulating the scope.
 *
 * @example
 * const star = svg({
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
 * });
 */
export function svg(def: SvgDef): Geometry {
  return { svg: def };
}
