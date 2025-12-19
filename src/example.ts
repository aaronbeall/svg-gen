import { svg, render } from './index.js';
import * as fs from 'fs';

// ============================================================================
// Star Geometry Example
// `let` is a static block where values can be expressions ($ => ...)
// The evaluator resolves expressions via getters, so $.step just works
// ============================================================================

const star = svg({
  size: [200, 200],

  let: {
    cx: 100,
    cy: 100,
    spikes: 5,
    outer: 80,
    inner: 35,
    rot: -90 * Math.PI / 180,
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

// Output helper
const outputDir = 'output';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

function output(name: string, geometry: Parameters<typeof render>[0]) {
  const result = render(geometry);
  console.log(`\n=== ${name} ===`);
  console.log(result.svg);
  fs.writeFileSync(`${outputDir}/${name}.svg`, result.svg);
  fs.writeFileSync(`${outputDir}/${name}.html`, result.html);
  console.log(`Written: ${outputDir}/${name}.svg, ${outputDir}/${name}.html`);
}

output('star', star);

// ============================================================================
// Additional Examples
// ============================================================================

// Circle example
const circleExample = svg({
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

output('circle', circleExample);

// Hexagon example using polygon
const hexagon = svg({
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
        angle: $ => ($.i * 2 * Math.PI / $.sides) - Math.PI / 2
      },

      point: [
        $ => $.cx + Math.cos($.angle) * $.r,
        $ => $.cy + Math.sin($.angle) * $.r
      ]
    },
    fill: 'gold',
    stroke: 'darkgoldenrod',
    strokeWidth: 3
  }
});

output('hexagon', hexagon);
