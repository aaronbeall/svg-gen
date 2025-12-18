import { svg, defineGeometry, render } from './index.js';
import * as fs from 'fs';

// ============================================================================
// Star Geometry Example - Using defineGeometry with explicit scope type
// This approach provides full type safety with clean syntax
// ============================================================================

// Define the scope type - all variables available in expressions
type StarScope = {
  cx: number;
  cy: number;
  spikes: number;
  outer: number;
  inner: number;
  rot: number;
  step: number;
};

// Inner loop scope extends parent scope with loop variable and inner let bindings
type StarLoopScope = StarScope & { i: number; r: number; a: number };

const star = defineGeometry<StarScope>()({
  size: [200, 200],

  let: {
    cx: 100,
    cy: 100,
    spikes: 5,
    outer: 80,
    inner: 35,
    rot: $ => -90 * Math.PI / 180,
    step: $ => Math.PI / $.spikes
  },

  path: {
    for: {
      i: 0,
      to: $ => $.spikes * 2,

      let: {
        r: ($: StarScope & { i: number }) => $.i % 2 === 0 ? $.outer : $.inner,
        a: ($: StarScope & { i: number }) => $.rot + $.i * $.step
      },

      point: [
        ($: StarLoopScope) => $.cx + Math.cos($.a) * $.r,
        ($: StarLoopScope) => $.cy + Math.sin($.a) * $.r
      ]
    },

    close: true
  }
});

// Render and output
const result = render(star);

console.log('=== SVG Source ===');
console.log(result.svg);
console.log('\n=== Writing output files ===');

fs.writeFileSync('output.svg', result.svg);
fs.writeFileSync('output.html', result.html);

console.log('Written: output.svg');
console.log('Written: output.html');

// ============================================================================
// Additional Examples
// ============================================================================

// Circle example - using defineGeometry for clean syntax
type CircleScope = { centerX: number; centerY: number; radius: number };

const circleExample = defineGeometry<CircleScope>()({
  size: [100, 100],

  let: {
    centerX: 50,
    centerY: 50,
    radius: 40
  },

  circle: {
    cx: $ => $.centerX,
    cy: $ => $.centerY,
    r: $ => $.radius,
    fill: 'lightblue',
    stroke: 'navy',
    strokeWidth: 2
  }
});

console.log('\n=== Circle Example ===');
console.log(render(circleExample).svg);

// Hexagon example using polygon
type HexScope = { cx: number; cy: number; r: number; sides: number };
type HexLoopScope = HexScope & { i: number; angle: number };

const hexagon = defineGeometry<HexScope>()({
  size: [200, 200],

  let: {
    cx: 100,
    cy: 100,
    r: 80,
    sides: 6
  },

  polygon: {
    for: {
      i: 0,
      to: $ => $.sides,

      let: {
        angle: ($: HexScope & { i: number }) => ($.i * 2 * Math.PI / $.sides) - Math.PI / 2
      },

      point: [
        ($: HexLoopScope) => $.cx + Math.cos($.angle) * $.r,
        ($: HexLoopScope) => $.cy + Math.sin($.angle) * $.r
      ]
    },
    fill: 'gold',
    stroke: 'darkgoldenrod',
    strokeWidth: 3
  }
});

console.log('\n=== Hexagon Example ===');
console.log(render(hexagon).svg);
