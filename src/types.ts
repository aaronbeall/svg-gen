// ============================================================================
// Core Expression Types
// ============================================================================

/** Expression that evaluates against a scope - can be a value or a function */
export type Expr<T, S = any> = T | ((scope: S) => T);

/** Extract the evaluated type from a Let block entry */
export type EvalLetEntry<T> = T extends (scope: any) => infer R ? R : T;

/** Extract the evaluated types from a Let block */
export type EvalLetBlock<L> = {
  [K in keyof L]: EvalLetEntry<L[K]>;
};

// ============================================================================
// Scope type - the $ parameter type in expressions
// ============================================================================

/**
 * Defines the scope type that will be available in expressions.
 * Use this to declare what variables are available in your geometry.
 */
export type Scope<T extends Record<string, any>> = T;

// ============================================================================
// For Loop with nested let - the key to scoped evaluation
// ============================================================================

/** For loop construct with optional inner let block */
export interface ForLoop<
  ParentScope,
  InnerLet extends Record<string, Expr<any, any>> = {}
> {
  i: number;
  to: Expr<number, ParentScope & { i: number }>;
  let?: InnerLet;
  point: [
    Expr<number, ParentScope & { i: number } & EvalLetBlock<InnerLet>>,
    Expr<number, ParentScope & { i: number } & EvalLetBlock<InnerLet>>
  ];
}

// ============================================================================
// Geometry Primitives
// ============================================================================

export interface PathData<S, ForLet extends Record<string, Expr<any, any>> = {}> {
  for?: ForLoop<S, ForLet>;
  close?: boolean;
}

export interface CircleData<S> {
  cx: Expr<number, S>;
  cy: Expr<number, S>;
  r: Expr<number, S>;
  fill?: Expr<string, S>;
  stroke?: Expr<string, S>;
  strokeWidth?: Expr<number, S>;
}

export interface RectData<S> {
  x: Expr<number, S>;
  y: Expr<number, S>;
  width: Expr<number, S>;
  height: Expr<number, S>;
  fill?: Expr<string, S>;
  stroke?: Expr<string, S>;
  strokeWidth?: Expr<number, S>;
}

export interface LineData<S> {
  x1: Expr<number, S>;
  y1: Expr<number, S>;
  x2: Expr<number, S>;
  y2: Expr<number, S>;
  stroke?: Expr<string, S>;
  strokeWidth?: Expr<number, S>;
}

export interface PolylineData<S, ForLet extends Record<string, Expr<any, any>> = {}> {
  for?: ForLoop<S, ForLet>;
  fill?: Expr<string, S>;
  stroke?: Expr<string, S>;
  strokeWidth?: Expr<number, S>;
}

export interface PolygonData<S, ForLet extends Record<string, Expr<any, any>> = {}> {
  for?: ForLoop<S, ForLet>;
  fill?: Expr<string, S>;
  stroke?: Expr<string, S>;
  strokeWidth?: Expr<number, S>;
}

export interface GroupData<S> {
  transform?: Expr<string, S>;
  path?: PathData<S>;
  circle?: CircleData<S>;
  rect?: RectData<S>;
  line?: LineData<S>;
}

// ============================================================================
// SVG Root Element
// ============================================================================

export interface SvgElement<
  LetBlock extends Record<string, Expr<any, any>> = {},
  PathForLet extends Record<string, Expr<any, any>> = {},
  PolylineForLet extends Record<string, Expr<any, any>> = {},
  PolygonForLet extends Record<string, Expr<any, any>> = {}
> {
  size: [number, number];
  let?: LetBlock;
  path?: PathData<EvalLetBlock<LetBlock>, PathForLet>;
  circle?: CircleData<EvalLetBlock<LetBlock>>;
  rect?: RectData<EvalLetBlock<LetBlock>>;
  line?: LineData<EvalLetBlock<LetBlock>>;
  polyline?: PolylineData<EvalLetBlock<LetBlock>, PolylineForLet>;
  polygon?: PolygonData<EvalLetBlock<LetBlock>, PolygonForLet>;
  group?: GroupData<EvalLetBlock<LetBlock>>[];
}

/** Root geometry definition */
export interface Geometry {
  svg: SvgElement<any, any, any, any>;
}

// ============================================================================
// Builder functions for type-safe geometry definitions
// ============================================================================

/**
 * Creates a type-safe geometry definition.
 * The type parameters are inferred from the structure you provide.
 */
export function svg<
  L extends Record<string, Expr<any, EvalLetBlock<L>>>,
  PathL extends Record<string, Expr<any, EvalLetBlock<L> & { i: number } & EvalLetBlock<PathL>>>,
  PolylineL extends Record<string, Expr<any, EvalLetBlock<L> & { i: number } & EvalLetBlock<PolylineL>>>,
  PolygonL extends Record<string, Expr<any, EvalLetBlock<L> & { i: number } & EvalLetBlock<PolygonL>>>
>(def: SvgElement<L, PathL, PolylineL, PolygonL>): Geometry {
  return { svg: def };
}

/**
 * Alternative: Define geometry with an explicit scope type.
 * This allows you to use `$` without type annotations in arrow functions.
 * 
 * @example
 * type MyScope = { cx: number; cy: number; r: number };
 * const geo = defineGeometry<MyScope>()({
 *   size: [200, 200],
 *   let: { cx: 100, cy: 100, r: 50 },
 *   circle: { cx: $ => $.cx, cy: $ => $.cy, r: $ => $.r }
 * });
 */
export function defineGeometry<S extends Record<string, any>>() {
  return function<
    L extends { [K in keyof S]: Expr<S[K], S> },
    PathL extends Record<string, Expr<any, S & { i: number } & EvalLetBlock<PathL>>>,
    PolylineL extends Record<string, Expr<any, S & { i: number } & EvalLetBlock<PolylineL>>>,
    PolygonL extends Record<string, Expr<any, S & { i: number } & EvalLetBlock<PolygonL>>>
  >(def: {
    size: [number, number];
    let?: L;
    path?: PathData<S, PathL>;
    circle?: CircleData<S>;
    rect?: RectData<S>;
    line?: LineData<S>;
    polyline?: PolylineData<S, PolylineL>;
    polygon?: PolygonData<S, PolygonL>;
    group?: GroupData<S>[];
  }): Geometry {
    return { svg: def as any };
  };
}
