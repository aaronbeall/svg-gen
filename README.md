# svg-gen

A declarative eDSL for generating SVGs in TypeScript with full type safety and scoped evaluation.

## Features

- **Declarative syntax** - Define geometry using plain objects and arrow expressions
- **Scoped evaluation** - Variables defined in `let` blocks are available in nested expressions
- **Type-safe** - Full TypeScript support with inference for scope variables
- **For loops** - Generate points programmatically with `for` constructs
- **Multiple primitives** - Support for `path`, `circle`, `rect`, `line`, `polygon`, `polyline`

## Usage

```typescript
import { defineGeometry, render } from './index.js';

type StarScope = {
  cx: number; cy: number;
  spikes: number; outer: number; inner: number;
  rot: number; step: number;
};

const star = defineGeometry<StarScope>()({
  size: [200, 200],
  let: {
    cx: 100, cy: 100,
    spikes: 5, outer: 80, inner: 35,
    rot: $ => -90 * Math.PI / 180,
    step: $ => Math.PI / $.spikes
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
});

const { svg, html } = render(star);
```

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
