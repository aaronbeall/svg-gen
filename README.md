# svg-gen

A declarative eDSL for generating SVGs in TypeScript with full type safety and scoped evaluation.

## Features

- **Declarative syntax** - Define geometry using plain objects and arrow expressions
- **Scoped evaluation** - Variables defined in `let` blocks are available in nested expressions
- **Type-safe** - Full TypeScript support with inference for scope variables
- **For loops** - Generate points programmatically with `for` constructs
- **Multiple primitives** - Support for `path`, `circle`, `rect`, `line`, `polygon`, `polyline` (single or arrays)
- **Multiple outputs** - Render to SVG string, HTML page, or DOM elements (browser)

## Usage

```typescript
import { render, SvgDef } from 'svg-gen';

const star: SvgDef = {
  size: [200, 200],

  let: {
    cx: 100,
    cy: 100,
    spikes: 5,
    outer: 80,
    inner: 35,
    rot: -90 * Math.PI / 180,
    step: $ => Math.PI / $.spikes  // computed from other values
  },

  path: {
    for: {
      i: 0,
      to: $ => $.spikes * 2,

      let: {
        r: $ => $.i % 2 === 0 ? $.outer : $.inner,
        a: $ => $.rot + $.i * $.step
      },

      point: [
        $ => $.cx + Math.cos($.a) * $.r,
        $ => $.cy + Math.sin($.a) * $.r
      ]
    },
    close: true
  }
};

const result = render(star);

result.ast;         // Evaluated AST with resolved values
result.svgString(); // SVG as string
result.html();      // HTML page with embedded SVG
result.svg();       // SVGSVGElement (browser only)
```

### How It Works

- **`let` block**: Define scope variables as static values or expressions (`$ => ...`)
- **Expressions**: Arrow functions receive the accumulated scope as `$`
- **Lazy evaluation**: The evaluator resolves expressions via getters, so `$.step` works even if `step` is a function
- **Scoped `for` loops**: Loop variables (`i`) and inner `let` blocks extend the parent scope
- **Arrays**: Each primitive (`path`, `circle`, etc.) accepts a single definition or an array
- **Groups**: `group` accepts an array of elements and an optional transform

## API

### `render(svg: SvgDef): RenderResult`

Evaluates and renders a geometry. Returns:
- `ast` - The evaluated AST with all expressions resolved
- `svgString()` - Lazily renders SVG as a string
- `html()` - Lazily renders an HTML page with the SVG embedded
- `svg()` - Lazily creates SVG DOM elements (browser only)

### `evaluate(svg: SvgDef): EvalSvg`

Evaluates an SVG definition to an AST without rendering.

### `renderSvgString(ast: EvalSvg): string`

Renders an evaluated AST to an SVG string.

### `renderSvg(ast: EvalSvg): SVGSVGElement`

Renders an evaluated AST to SVG DOM elements (browser only).

### `renderHtml(svgString: string): string`

Wraps an SVG string in an HTML page.

## Examples

| Name | SVG | HTML |
|------|-----|------|
| Star | [star.svg](output/star.svg) | [star.html](output/star.html) |
| Circle | [circle.svg](output/circle.svg) | [circle.html](output/circle.html) |
| Hexagon | [hexagon.svg](output/hexagon.svg) | [hexagon.html](output/hexagon.html) |

## Running

```bash
npm install
npm start
```

This compiles TypeScript and runs the examples, outputting SVG and HTML files to the `output/` directory.
