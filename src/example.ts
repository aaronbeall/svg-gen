import { render, type SvgDef } from './index.js';
import * as fs from 'fs';

// ============================================================================
// Star Geometry Example
// `let` is a static block where values can be expressions ($ => ...)
// The evaluator resolves expressions via getters, so $.step just works
// ============================================================================

const star: SvgDef = {
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
      // point is inside for iterator
      point: [
        $ => $.cx + Math.cos($.a) * $.r,
        $ => $.cy + Math.sin($.a) * $.r
      ]
    },
    close: true
  }
};

// Output helper
const outputDir = 'output';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

function output(name: string, geometry: Parameters<typeof render>[0]) {
  const result = render(geometry);
  console.log(`\n=== ${name} ===`);
  console.log(result.svgString());
  fs.writeFileSync(`${outputDir}/${name}.svg`, result.svgString());
  fs.writeFileSync(`${outputDir}/${name}.html`, result.html());
  console.log(`Written: ${outputDir}/${name}.svg, ${outputDir}/${name}.html`);
}

output('star', star);

// ============================================================================
// Additional Examples
// ============================================================================

// Circle example
const circleExample: SvgDef = {
  size: [100, 100],

  circle: {
    cx: 50,
    cy: 50,
    r: 40,
    fill: 'lightblue',
    stroke: 'navy',
    strokeWidth: 2
  }
};

output('circle', circleExample);

// Hexagon example using polygon
const hexagon: SvgDef = {
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
      // point is inside for iterator
      point: [
        $ => $.cx + Math.cos($.angle) * $.r,
        $ => $.cy + Math.sin($.angle) * $.r
      ]
    },
    fill: 'gold',
    stroke: 'darkgoldenrod',
    strokeWidth: 3
  }
};

output('hexagon', hexagon);

// ============================================================================
// Iterator Examples - iterators are now on shapes, not standalone generators
// ============================================================================

// Spiral as path iterator - draws a spiral path
const spiralExample: SvgDef = {
  size: [300, 300],

  let: {
    cx: 150,
    cy: 150
  },

  path: {
    spiral: {
      cx: $ => $.cx,
      cy: $ => $.cy,
      startRadius: 10,
      endRadius: 120,
      turns: 5,
      type: 'archimedean'
    },
    stroke: 'purple',
    strokeWidth: 2
  }
};

output('spiral', spiralExample);

// Lissajous curve as path iterator
const lissajousExample: SvgDef = {
  size: [300, 300],

  let: {
    cx: 150,
    cy: 150,
    size: 100
  },

  path: {
    lissajous: {
      cx: $ => $.cx,
      cy: $ => $.cy,
      ax: $ => $.size,
      ay: $ => $.size,
      fx: 3,
      fy: 2,
      delta: Math.PI / 2,
      samples: 300
    },
    stroke: 'teal',
    strokeWidth: 2
  }
};

output('lissajous', lissajousExample);

// Rose curve as path iterator
const roseExample: SvgDef = {
  size: [300, 300],

  let: {
    cx: 150,
    cy: 150
  },

  path: {
    rose: {
      cx: $ => $.cx,
      cy: $ => $.cy,
      r: 120,
      k: 5,
      samples: 300
    },
    close: true,
    fill: 'pink',
    stroke: 'crimson',
    strokeWidth: 2
  }
};

output('rose', roseExample);

// Parametric curve as path iterator - heart shape
const heartExample: SvgDef = {
  size: [300, 300],

  let: {
    cx: 150,
    cy: 160,
    scale: 10
  },

  path: {
    parametric: {
      x: $ => $.cx + $.scale * 16 * Math.pow(Math.sin($.t), 3),
      y: $ => $.cy - $.scale * (13 * Math.cos($.t) - 5 * Math.cos(2 * $.t) - 2 * Math.cos(3 * $.t) - Math.cos(4 * $.t)),
      t: [0, 2 * Math.PI],
      samples: 100
    },
    close: true,
    fill: 'red',
    stroke: 'darkred',
    strokeWidth: 2
  }
};

output('heart', heartExample);

// Circles along a spiral - spiral iterator produces circles
const circlesOnSpiral: SvgDef = {
  size: [400, 400],

  let: {
    cx: 200,
    cy: 200
  },

  // Spiral iterator with circle output - produces one circle per step
  group: [{
    spiral: {
      cx: $ => $.cx,
      cy: $ => $.cy,
      startRadius: 30,
      endRadius: 150,
      turns: 3,
      samples: 30,
      // circle is inside spiral iterator
      circle: {
        cx: $ => $.x,  // x from spiral iterator
        cy: $ => $.y,  // y from spiral iterator
        r: $ => 5 + $.t * 15,  // radius grows with t (0-1)
        fill: ($: any) => `hsl(${$.t * 360}, 70%, 50%)`,
        stroke: 'none'
      }
    }
  }]
};

output('circles-spiral', circlesOnSpiral);

// Spiral iterator with circle output
const groupIterator: SvgDef = {
  size: [400, 400],

  let: {
    cx: 200,
    cy: 200
  },

  group: [{
    spiral: {
      cx: $ => $.cx,
      cy: $ => $.cy,
      startRadius: 40,
      endRadius: 150,
      turns: 2,
      samples: 20,
      // circle is inside spiral iterator
      circle: {
        cx: $ => $.x,
        cy: $ => $.y,
        r: 8,
        fill: 'coral',
        stroke: 'darkred'
      }
    }
  }]
};

output('group-iterator', groupIterator);

// Multiple paths example - array of paths with different styles
const multiExample: SvgDef = {
  size: [400, 400],

  let: {
    cx: 200,
    cy: 200
  },

  path: [
    // Blue spiral
    {
      spiral: {
        cx: $ => $.cx,
        cy: $ => $.cy,
        startRadius: 20,
        endRadius: 150,
        turns: 5,
        samples: 100
      },
      stroke: 'blue',
      strokeWidth: 1.5
    },
    // Green spiral offset
    {
      spiral: {
        cx: $ => $.cx,
        cy: $ => $.cy,
        startRadius: 20,
        endRadius: 150,
        turns: 5,
        samples: 100,
        let: {
          // Offset the angle slightly
          offsetX: $ => Math.cos($.theta + Math.PI / 5) * $.r * 0.1,
          offsetY: $ => Math.sin($.theta + Math.PI / 5) * $.r * 0.1
        },
        point: [
          $ => $.x + $.offsetX,
          $ => $.y + $.offsetY
        ]
      },
      stroke: 'green',
      strokeWidth: 1.5
    },
    // Red rose curve
    {
      rose: {
        cx: $ => $.cx,
        cy: $ => $.cy,
        r: 80,
        k: 4,
        samples: 200
      },
      stroke: 'red',
      strokeWidth: 1.5
    }
  ]
};

output('multi', multiExample);
