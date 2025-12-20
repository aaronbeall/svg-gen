# svg-gen

A declarative eDSL for generating SVGs in TypeScript with full type safety and scoped evaluation.

## Features

- **Declarative syntax** - Define geometry using plain objects and arrow expressions
- **Scoped evaluation** - Variables defined in `let` blocks are available in nested expressions
- **Type-safe** - Full TypeScript support with inference for scope variables
- **Iterators** - Spirals, grids, fractals, attractors, Voronoi, Delaunay, and more
- **Point modifiers** - Noise, jitter, subdivision, smoothing, and mirroring
- **Multiple outputs** - Render to SVG string, HTML page, or DOM elements (browser)

## Core Concepts

### Shapes

Basic SVG primitives that can be styled with `fill`, `stroke`, and `strokeWidth`:

```typescript
// Fixed shapes
circle: { cx: 100, cy: 100, r: 50, fill: 'blue' }
rect: { x: 10, y: 10, width: 80, height: 60 }
line: { x1: 0, y1: 0, x2: 100, y2: 100, stroke: 'black' }

// Point-based shapes (can use iterators to generate points)
path: { for: { i: 0, to: 10, point: [$ => $.i * 10, $ => $.i * 5] }, close: true }
polygon: { points: [[0, 0], [50, 100], [100, 0]] }
polyline: { spiral: { cx: 100, cy: 100, startRadius: 10, endRadius: 80, turns: 3 } }
```

### Iterators

Generate sequences of values with scope variables (`x`, `y`, `i`, `t`, etc.):

```typescript
// For loop - basic iteration
for: { i: 0, to: 10, circle: { cx: $ => $.i * 20, cy: 50, r: 5 } }

// Grid - rows and columns
grid: { cols: 5, rows: 5, cellWidth: 20, cellHeight: 20, circle: { cx: $ => $.x, cy: $ => $.y, r: 3 } }

// Spiral - archimedean, logarithmic, or fermat
spiral: { cx: 200, cy: 200, startRadius: 10, endRadius: 150, turns: 5, samples: 100 }

// Mathematical curves
lissajous: { cx: 200, cy: 200, ax: 100, ay: 100, kx: 3, ky: 2 }
rose: { cx: 200, cy: 200, r: 100, k: 5 }
superformula: { cx: 200, cy: 200, scale: 80, m: 5, n1: 0.3, n2: 0.3, n3: 0.3 }

// Fractals
fractal: { type: 'koch', x: 50, y: 300, length: 300, depth: 4 }

// Strange attractors
attractor: { type: 'lorenz', cx: 200, cy: 200, scale: 5, iterations: 5000 }

// Tessellations
tile: { type: 'hex', cols: 8, rows: 6, size: 30 }
voronoi: { points: [[...]], bounds: { x: 0, y: 0, width: 400, height: 400 } }
delaunay: { points: [[...]] }

// Random distributions
random: { count: 100, bounds: { x: 0, y: 0, width: 400, height: 400 } }
poisson: { radius: 20, bounds: { x: 0, y: 0, width: 400, height: 400 } }
pack: { bounds: { x: 0, y: 0, width: 400, height: 400 }, count: 50 }

// Noise sampling
noise: { cols: 20, rows: 20, scale: 3, octaves: 2, circle: { cx: $ => $.x, cy: $ => $.y, r: $ => $.value * 5 } }
```

### Groups

Combine multiple shapes and iterators. Use `group` as an array:

```typescript
group: [
  { rect: { x: 0, y: 0, width: 100, height: 100, fill: 'lightgray' } },
  { circle: { cx: 50, cy: 50, r: 30, fill: 'blue' } },
  { for: { i: 0, to: 4, circle: { cx: $ => 20 + $.i * 20, cy: 80, r: 5 } } }
]
```

### Collect

Accumulate points from an iterator to feed into batch consumers like Voronoi or Delaunay:

```typescript
collect: {
  points: {
    poisson: { radius: 30, bounds: { x: 0, y: 0, width: 400, height: 400 } }
  },
  voronoi: {
    points: $ => $.points,  // Access collected points
    polygon: { points: $ => $.vertices, fill: $ => `hsl(${$.i * 10}, 70%, 60%)` }
  }
}
```

### Modifiers

Transform point arrays on `path`, `polyline`, and `polygon`:

```typescript
path: {
  for: { i: 0, to: 64, point: [$ => 200 + Math.cos($.i * 0.1) * 100, $ => 200 + Math.sin($.i * 0.1) * 100] },
  
  // Noise displacement
  noise: { scale: 0.02, amplitude: 15, seed: 42 },
  
  // Random jitter
  jitter: { x: 5, y: 5, seed: 123 },
  
  // Subdivision (smoothing)
  subdivide: { iterations: 2, algorithm: 'chaikin' },
  
  // Averaging neighbors
  smooth: { strength: 0.5, iterations: 1 },
  
  // Mirror across axis
  mirror: { axis: 'x', at: 200 }
}
```

### Expressions

Any value can be a static value or an expression function receiving scope `$`:

```typescript
{
  let: {
    cx: 200,
    cy: 200,
    count: 12,
    step: $ => Math.PI * 2 / $.count  // Computed from other values
  },
  
  for: {
    i: 0,
    to: $ => $.count,
    let: {
      angle: $ => $.i * $.step,
      x: $ => $.cx + Math.cos($.angle) * 100,
      y: $ => $.cy + Math.sin($.angle) * 100
    },
    circle: {
      cx: $ => $.x,
      cy: $ => $.y,
      r: 10,
      fill: $ => `hsl(${$.i * 30}, 70%, 50%)`  // Dynamic color
    }
  }
}
```

## Quick Start

```typescript
import { render, SvgDef } from 'svg-gen';

const star: SvgDef = {
  size: [200, 200],
  let: { cx: 100, cy: 100, spikes: 5, outer: 80, inner: 35 },
  path: {
    for: {
      i: 0,
      to: $ => $.spikes * 2,
      let: {
        r: $ => $.i % 2 === 0 ? $.outer : $.inner,
        a: $ => -Math.PI/2 + $.i * Math.PI / $.spikes
      },
      point: [$ => $.cx + Math.cos($.a) * $.r, $ => $.cy + Math.sin($.a) * $.r]
    },
    close: true,
    fill: 'gold'
  }
};

const result = render(star);
console.log(result.svgString());
```

## API

### `render(svg: SvgDef): RenderResult`

Evaluates and renders a geometry. Returns:
- `ast` - The evaluated AST with all expressions resolved
- `svgString()` - Lazily renders SVG as a string
- `html()` - Lazily renders an HTML page with the SVG embedded
- `svg()` - Lazily creates SVG DOM elements (browser only)

### `evaluate(svg: SvgDef): EvalSvg`

Evaluates an SVG definition to an AST without rendering.

## Examples

### Basic Shapes
| Example | Preview |
|---------|---------|
| [Star](output/star.html) | Basic 5-pointed star |
| [Circle](output/circle.html) | Simple circle |
| [Hexagon](output/hexagon.html) | Regular hexagon |
| [Heart](output/heart.html) | Heart shape using parametric curve |

### Iterators
| Example | Preview |
|---------|---------|
| [Spiral](output/spiral.html) | Archimedean spiral |
| [Grid](output/grid.html) | Grid of circles with color gradient |
| [Lissajous](output/lissajous.html) | Lissajous curve |
| [Rose](output/rose.html) | Rose curve (rhodonea) |
| [Superformula](output/superformula.html) | Superformula shapes |
| [Spirograph](output/spirograph.html) | Epitrochoid and hypotrochoid |

### Fractals
| Example | Preview |
|---------|---------|
| [Koch Snowflake](output/fractal-koch.html) | Koch curve fractal |
| [Dragon Curve](output/fractal-dragon.html) | Dragon curve |
| [Hilbert Curve](output/fractal-hilbert.html) | Space-filling Hilbert curve |
| [Sierpinski](output/fractal-sierpinski.html) | Sierpinski triangle |
| [Lévy C Curve](output/fractal-levy.html) | Lévy C curve |

### Strange Attractors
| Example | Preview |
|---------|---------|
| [Lorenz](output/attractor-lorenz.html) | Lorenz attractor |
| [Rössler](output/attractor-rossler.html) | Rössler attractor |
| [Thomas](output/attractor-thomas.html) | Thomas attractor |
| [Aizawa](output/attractor-aizawa.html) | Aizawa attractor |
| [Halvorsen](output/attractor-halvorsen.html) | Halvorsen attractor |

### Flow Fields
| Example | Preview |
|---------|---------|
| [Basic Flowfield](output/flowfield.html) | Simple flow field |
| [Dipole](output/flowfield-dipole.html) | Dipole field |
| [Sink](output/flowfield-sink.html) | Sink/source field |
| [Turbulent](output/flowfield-turbulent.html) | Turbulent noise field |
| [Noise Field](output/flowfield-noise.html) | Perlin noise flow |
| [Dynamic Flow](output/dynamic-flow-field.html) | Animated-style flow with varying stroke width |

### Tessellations & Distributions
| Example | Preview |
|---------|---------|
| [Square Tiles](output/tile-square.html) | Square tessellation |
| [Hex Tiles](output/tile-hex.html) | Hexagonal tessellation |
| [Triangle Tiles](output/tile-triangle.html) | Triangular tessellation |
| [Voronoi](output/voronoi.html) | Voronoi diagram |
| [Delaunay](output/delaunay.html) | Delaunay triangulation |
| [Random Points](output/random-points.html) | Uniform random distribution |
| [Poisson Points](output/poisson-points.html) | Poisson disk sampling |
| [Circle Packing](output/pack-circle.html) | Circle packing |

### Modifiers
| Example | Preview |
|---------|---------|
| [Noise Modifier](output/noise-modifier-path.html) | Noise displacement on path |
| [Jitter Modifier](output/jitter-modifier-polygon.html) | Random jitter on polygon |
| [Subdivide](output/subdivide-modifier.html) | Chaikin subdivision smoothing |
| [Combined](output/combined-modifiers.html) | Multiple modifiers combined |
| [Mirror](output/mirror-modifier.html) | Mirror across axis |
| [Mirror Both](output/mirror-both.html) | 4-way symmetry |

### Noise Iterator
| Example | Preview |
|---------|---------|
| [Noise Visualization](output/noise-visualization.html) | Simplex noise as circles |
| [Noise Terrain](output/noise-terrain.html) | Terrain-like coloring |

### Compositions
| Example | Preview |
|---------|---------|
| [Random Voronoi](output/random-voronoi.html) | Random points → Voronoi |
| [Poisson Delaunay](output/poisson-delaunay.html) | Poisson → Delaunay |
| [Circles on Spiral](output/circles-spiral.html) | Circles along spiral path |
| [Group Iterator](output/group-iterator.html) | Nested groups and iterators |

### Showcase (Complex Generative Art)
| Example | Preview |
|---------|---------|
| [Organic Mandala](output/organic-mandala.html) | Layered mandala with spirals and superformula |
| [Crystalline Structure](output/crystalline-structure.html) | Delaunay with gradient fills |
| [Flowing Curves](output/flowing-curves.html) | Layered spirals with noise |
| [Organic Foliage](output/organic-foliage.html) | Nature-inspired noise pattern |
| [Cosmic Galaxy](output/cosmic-galaxy.html) | Spiral galaxy visualization |
| [Art Deco Pattern](output/art-deco-pattern.html) | Geometric synthwave design |
| [Bioluminescent Ocean](output/bioluminescent-ocean.html) | Glowing Voronoi cells |

## Running

```bash
npm install
npm run build
npm start
```

This compiles TypeScript and runs the examples, outputting SVG and HTML files to the `output/` directory.
