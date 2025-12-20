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
      fill: $ => `hsl(${$.t * 360}, 70%, 50%)`,
      stroke: 'none'
    }
  }
};

output('circles-spiral', circlesOnSpiral);

// Spiral iterator with circle output
const groupIterator: SvgDef = {
  size: [400, 400],

  let: {
    cx: 200,
    cy: 200
  },

  group: [
    {
      rect: {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: 'none',
        stroke: 'black',
        strokeWidth: 2
      }
    },
    {
      circle: {
        cx: $ => $.cx,
        cy: $ => $.cy,
        r: 8,
        fill: 'coral',
        stroke: 'darkred'
      }
    },
    {
      for: {
        i: 0,
        to: 20,
        let: {
          r: $ => 8 + $.i * 2
        },
        circle: {
          cx: $ => $.cx,
          cy: $ => $.cy,
          r: $ => $.r,
          fill: 'coral',
          stroke: 'darkred'
        }
      }
    },
    {
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
    }
  ]
};

output('group-iterator', groupIterator);

// Grid iterator example - creates a grid of circles
const gridExample: SvgDef = {
  size: [400, 400],

  grid: {
    cols: 8,
    rows: 8,
    cellWidth: 50,
    cellHeight: 50,
    circle: {
      cx: $ => $.x,
      cy: $ => $.y,
      r: $ => 10 + $.t * 10,
      fill: $ => `hsl(${$.col * 45}, 70%, ${50 + $.row * 5}%)`,
      stroke: 'none'
    }
  }
};

output('grid', gridExample);

// Superformula examples - various organic shapes
const superformulaExample: SvgDef = {
  size: [600, 200],

  group: [
    // Starfish shape (m=5)
    {
      path: {
        superformula: {
          cx: 100,
          cy: 100,
          scale: 80,
          m: 5,
          n1: 0.3,
          n2: 0.3,
          n3: 0.3
        },
        close: true,
        fill: 'coral',
        stroke: 'darkred',
        strokeWidth: 2
      }
    },
    // Flower shape (m=8)
    {
      path: {
        superformula: {
          cx: 300,
          cy: 100,
          scale: 80,
          m: 8,
          n1: 0.5,
          n2: 4,
          n3: 8
        },
        close: true,
        fill: 'lightblue',
        stroke: 'navy',
        strokeWidth: 2
      }
    },
    // Rounded square (m=4)
    {
      path: {
        superformula: {
          cx: 500,
          cy: 100,
          scale: 70,
          m: 4,
          n1: 2,
          n2: 2,
          n3: 2
        },
        close: true,
        fill: 'lightgreen',
        stroke: 'darkgreen',
        strokeWidth: 2
      }
    }
  ]
};

output('superformula', superformulaExample);

// Spirograph examples - epitrochoid and hypotrochoid
const spirographExample: SvgDef = {
  size: [600, 300],

  group: [
    // Epitrochoid - circle rolling outside (like a spirograph with outer gear)
    {
      path: {
        epitrochoid: {
          cx: 150,
          cy: 150,
          R: 60,   // Fixed circle radius
          r: 20,   // Rolling circle radius
          d: 30    // Pen distance from rolling circle center
        },
        close: true,
        fill: 'none',
        stroke: 'crimson',
        strokeWidth: 1.5
      }
    },
    // Hypotrochoid - circle rolling inside (classic spirograph)
    {
      path: {
        hypotrochoid: {
          cx: 450,
          cy: 150,
          R: 100,  // Fixed circle radius
          r: 40,   // Rolling circle radius
          d: 30    // Pen distance from rolling circle center
        },
        close: true,
        fill: 'none',
        stroke: 'navy',
        strokeWidth: 1.5
      }
    }
  ]
};

output('spirograph', spirographExample);

// Flowfield example - particles following a vector field
const flowfieldExample: SvgDef = {
  size: [400, 400],

  // Use a grid iterator to create multiple flow lines
  for: {
    i: 0,
    to: 20,
    let: {
      startX: $ => 20 + ($.i % 5) * 90,
      startY: $ => 20 + Math.floor($.i / 5) * 90
    },
    path: {
      flowfield: {
        field: $ => {
          // Swirling field based on position
          const angle = Math.atan2($.y - 200, $.x - 200) + Math.PI / 2;
          const dist = Math.sqrt(($.x - 200) ** 2 + ($.y - 200) ** 2);
          const strength = 0.5 + dist / 400;
          return [Math.cos(angle) * strength, Math.sin(angle) * strength];
        },
        start: [{ x: $ => $.startX, y: $ => $.startY }],
        steps: 100,
        stepSize: 3
      },
      fill: 'none',
      stroke: $ => `hsl(${$.i * 18}, 70%, 50%)`,
      strokeWidth: 1.5
    }
  }
};

output('flowfield', flowfieldExample);

// Flowfield example 2 - Perlin-like noise field using sine waves
const flowfieldNoise: SvgDef = {
  size: [500, 500],

  for: {
    i: 0,
    to: 100,
    let: {
      startX: $ => ($.i % 10) * 50 + 25,
      startY: $ => Math.floor($.i / 10) * 50 + 25
    },
    path: {
      flowfield: {
        field: $ => {
          // Pseudo-noise using overlapping sine waves
          const scale = 0.02;
          const angle = Math.sin($.x * scale) * Math.cos($.y * scale) * Math.PI * 2;
          return [Math.cos(angle), Math.sin(angle)];
        },
        start: [{ x: $ => $.startX, y: $ => $.startY }],
        steps: 50,
        stepSize: 4
      },
      fill: 'none',
      stroke: $ => `hsla(${200 + $.i * 1.5}, 60%, 50%, 0.6)`,
      strokeWidth: 1
    }
  }
};

output('flowfield-noise', flowfieldNoise);

// Flowfield example 3 - Sink/source field (converging to center)
const flowfieldSink: SvgDef = {
  size: [400, 400],

  for: {
    i: 0,
    to: 36,
    let: {
      // Start points in a circle around the edge
      angle: $ => ($.i / 36) * Math.PI * 2,
      startX: $ => 200 + Math.cos($.angle) * 180,
      startY: $ => 200 + Math.sin($.angle) * 180
    },
    path: {
      flowfield: {
        field: $ => {
          // Point toward center with slight spiral
          const dx = 200 - $.x;
          const dy = 200 - $.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const spiral = 0.3;
          return [
            (dx / dist) + (-dy / dist) * spiral,
            (dy / dist) + (dx / dist) * spiral
          ];
        },
        start: [{ x: $ => $.startX, y: $ => $.startY }],
        steps: 80,
        stepSize: 2
      },
      fill: 'none',
      stroke: $ => `hsl(${$.i * 10}, 70%, 50%)`,
      strokeWidth: 2
    }
  }
};

output('flowfield-sink', flowfieldSink);

// Flowfield example 4 - Dipole field (two poles)
const flowfieldDipole: SvgDef = {
  size: [500, 400],

  for: {
    i: 0,
    to: 40,
    let: {
      startX: $ => 20,
      startY: $ => 10 + $.i * 10
    },
    path: {
      flowfield: {
        field: $ => {
          // Two poles - one positive (source), one negative (sink)
          const p1 = { x: 150, y: 200 }; // source
          const p2 = { x: 350, y: 200 }; // sink

          const dx1 = $.x - p1.x, dy1 = $.y - p1.y;
          const dx2 = $.x - p2.x, dy2 = $.y - p2.y;
          const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

          // Repel from p1, attract to p2
          const strength = 50;
          return [
            (dx1 / d1) * (strength / d1) - (dx2 / d2) * (strength / d2),
            (dy1 / d1) * (strength / d1) - (dy2 / d2) * (strength / d2)
          ];
        },
        start: [{ x: $ => $.startX, y: $ => $.startY }],
        steps: 150,
        stepSize: 2
      },
      fill: 'none',
      stroke: $ => `hsl(${180 + $.startY * 0.4}, 60%, 50%)`,
      strokeWidth: 1.5
    }
  }
};

output('flowfield-dipole', flowfieldDipole);

// Flowfield example 5 - Turbulent field
const flowfieldTurbulent: SvgDef = {
  size: [500, 500],

  for: {
    i: 0,
    to: 64,
    let: {
      startX: $ => ($.i % 8) * 62.5 + 31,
      startY: $ => Math.floor($.i / 8) * 62.5 + 31
    },
    path: {
      flowfield: {
        field: $ => {
          // Multiple frequency sine waves for turbulence
          const a1 = Math.sin($.x * 0.03) + Math.sin($.y * 0.02);
          const a2 = Math.cos($.x * 0.05 + $.y * 0.03) * 0.5;
          const a3 = Math.sin(($.x + $.y) * 0.04) * 0.3;
          const angle = (a1 + a2 + a3) * Math.PI;
          return [Math.cos(angle), Math.sin(angle)];
        },
        start: [{ x: $ => $.startX, y: $ => $.startY }],
        steps: 60,
        stepSize: 3
      },
      fill: 'none',
      stroke: $ => `hsla(${280 + $.i * 1.2}, 70%, 55%, 0.7)`,
      strokeWidth: 1.2
    }
  }
};

output('flowfield-turbulent', flowfieldTurbulent);

// Attractor examples - strange attractors
const lorenzAttractor: SvgDef = {
  size: [500, 400],
  path: {
    attractor: {
      type: 'lorenz',
      cx: 250,
      cy: 280,
      scale: 8,
      iterations: 10000,
      dt: 0.005
    },
    fill: 'none',
    stroke: 'steelblue',
    strokeWidth: 0.5
  }
};

output('attractor-lorenz', lorenzAttractor);

const rosslerAttractor: SvgDef = {
  size: [400, 400],
  path: {
    attractor: {
      type: 'rossler',
      cx: 200,
      cy: 200,
      scale: 15,
      iterations: 8000,
      dt: 0.02
    },
    fill: 'none',
    stroke: 'crimson',
    strokeWidth: 0.5
  }
};

output('attractor-rossler', rosslerAttractor);

const thomasAttractor: SvgDef = {
  size: [400, 400],
  path: {
    attractor: {
      type: 'thomas',
      cx: 200,
      cy: 200,
      scale: 60,
      iterations: 15000,
      dt: 0.1
    },
    fill: 'none',
    stroke: 'darkgreen',
    strokeWidth: 0.4
  }
};

output('attractor-thomas', thomasAttractor);

const aizawaAttractor: SvgDef = {
  size: [400, 400],
  path: {
    attractor: {
      type: 'aizawa',
      cx: 200,
      cy: 200,
      scale: 100,
      iterations: 10000,
      dt: 0.01
    },
    fill: 'none',
    stroke: 'purple',
    strokeWidth: 0.5
  }
};

output('attractor-aizawa', aizawaAttractor);

const halvorsenAttractor: SvgDef = {
  size: [400, 400],
  path: {
    attractor: {
      type: 'halvorsen',
      cx: 200,
      cy: 200,
      scale: 20,
      iterations: 10000,
      dt: 0.005
    },
    fill: 'none',
    stroke: 'darkorange',
    strokeWidth: 0.5
  }
};

output('attractor-halvorsen', halvorsenAttractor);

// Fractal examples - L-system curves
const kochCurve: SvgDef = {
  size: [500, 200],
  path: {
    fractal: {
      type: 'koch',
      x: 50,
      y: 150,
      length: 400,
      angle: 0,
      depth: 4
    },
    fill: 'none',
    stroke: 'steelblue',
    strokeWidth: 1
  }
};

output('fractal-koch', kochCurve);

const dragonCurve: SvgDef = {
  size: [500, 400],
  path: {
    fractal: {
      type: 'dragon',
      x: 200,
      y: 250,
      length: 300,
      angle: 0,
      depth: 12
    },
    fill: 'none',
    stroke: 'crimson',
    strokeWidth: 0.5
  }
};

output('fractal-dragon', dragonCurve);

const hilbertCurve: SvgDef = {
  size: [400, 400],
  path: {
    fractal: {
      type: 'hilbert',
      x: 20,
      y: 380,
      length: 360,
      angle: 0,
      depth: 5
    },
    fill: 'none',
    stroke: 'darkgreen',
    strokeWidth: 1
  }
};

output('fractal-hilbert', hilbertCurve);

const sierpinskiCurve: SvgDef = {
  size: [500, 450],
  path: {
    fractal: {
      type: 'sierpinski',
      x: 50,
      y: 400,
      length: 400,
      angle: 0,
      depth: 6
    },
    fill: 'none',
    stroke: 'purple',
    strokeWidth: 0.5
  }
};

output('fractal-sierpinski', sierpinskiCurve);

const levyCurve: SvgDef = {
  size: [400, 400],
  path: {
    fractal: {
      type: 'levy',
      x: 100,
      y: 300,
      length: 200,
      angle: 0,
      depth: 12
    },
    fill: 'none',
    stroke: 'darkorange',
    strokeWidth: 0.5
  }
};

output('fractal-levy', levyCurve);

// Voronoi example - cells from seed points
const voronoiExample: SvgDef = {
  size: [400, 400],

  voronoi: {
    points: [
      [50, 80], [120, 40], [200, 60], [280, 30], [350, 70],
      [40, 150], [100, 180], [180, 140], [260, 160], [340, 130],
      [60, 240], [140, 280], [220, 220], [300, 260], [370, 200],
      [30, 320], [110, 360], [190, 340], [270, 380], [350, 330]
    ],
    bounds: { x: 0, y: 0, width: 400, height: 400 },
    // Draw each cell as a polygon using the vertices
    polygon: {
      points: $ => $.vertices,
      fill: $ => `hsl(${$.i * 18}, 70%, 85%)`,
      stroke: 'white',
      strokeWidth: 2
    },
    // Also draw a circle at each cell center
    circle: {
      cx: $ => $.x,
      cy: $ => $.y,
      r: 4,
      fill: $ => `hsl(${$.i * 18}, 70%, 40%)`,
      stroke: 'none'
    }
  }
};

output('voronoi', voronoiExample);

// Delaunay triangulation example
const delaunayExample: SvgDef = {
  size: [400, 400],

  delaunay: {
    points: [
      [50, 80], [120, 40], [200, 60], [280, 30], [350, 70],
      [40, 150], [100, 180], [180, 140], [260, 160], [340, 130],
      [60, 240], [140, 280], [220, 220], [300, 260], [370, 200],
      [30, 320], [110, 360], [190, 340], [270, 380], [350, 330]
    ],
    // Draw each triangle
    polygon: {
      points: $ => $.vertices,
      fill: $ => `hsla(${$.i * 12}, 60%, 70%, 0.7)`,
      stroke: 'white',
      strokeWidth: 1
    }
  }
};

output('delaunay', delaunayExample);

// Tile examples - different tiling patterns
const squareTiles: SvgDef = {
  size: [400, 400],

  tile: {
    type: 'square',
    size: 50,
    cols: 8,
    rows: 8,
    polygon: {
      points: $ => $.vertices,
      fill: $ => ($.row + $.col) % 2 === 0 ? '#4a90d9' : '#f5f5f5',
      stroke: '#333',
      strokeWidth: 1
    }
  }
};

output('tile-square', squareTiles);

const hexTiles: SvgDef = {
  size: [450, 400],

  tile: {
    type: 'hex',
    size: 30,
    cols: 8,
    rows: 8,
    polygon: {
      points: $ => $.vertices,
      fill: $ => `hsl(${($.row * 8 + $.col) * 5}, 60%, 70%)`,
      stroke: 'white',
      strokeWidth: 2
    }
  }
};

output('tile-hex', hexTiles);

const triangleTiles: SvgDef = {
  size: [400, 350],

  tile: {
    type: 'triangle',
    size: 50,
    cols: 16,
    rows: 8,
    polygon: {
      points: $ => $.vertices,
      fill: $ => `hsl(${$.i * 3}, 50%, ${60 + ($.row % 2) * 20}%)`,
      stroke: 'white',
      strokeWidth: 1
    }
  }
};

output('tile-triangle', triangleTiles);

// Circle packing examples
const packCircle: SvgDef = {
  size: [400, 400],

  pack: {
    bounds: { type: 'circle', cx: 200, cy: 200, r: 180 },
    count: 100,
    minRadius: 5,
    maxRadius: 30,
    padding: 2,
    circle: {
      cx: $ => $.x,
      cy: $ => $.y,
      r: $ => $.r,
      fill: $ => `hsl(${$.i * 3.6}, 70%, 60%)`,
      stroke: 'white',
      strokeWidth: 1
    }
  }
};

output('pack-circle', packCircle);

const packRect: SvgDef = {
  size: [500, 300],

  pack: {
    bounds: { type: 'rect', x: 20, y: 20, width: 460, height: 260 },
    count: 80,
    minRadius: 8,
    maxRadius: 40,
    padding: 3,
    circle: {
      cx: $ => $.x,
      cy: $ => $.y,
      r: $ => $.r,
      fill: $ => `hsl(${200 + $.r * 3}, 60%, ${50 + $.r}%)`,
      stroke: 'rgba(255,255,255,0.5)',
      strokeWidth: 2
    }
  }
};

output('pack-rect', packRect);

// Random points example
const randomPoints: SvgDef = {
  size: [400, 400],

  random: {
    count: 100,
    bounds: { x: 20, y: 20, width: 360, height: 360 },
    seed: 12345,
    circle: {
      cx: $ => $.x,
      cy: $ => $.y,
      r: 4,
      fill: $ => `hsl(${$.i * 3.6}, 70%, 50%)`,
      stroke: 'none'
    }
  }
};

output('random-points', randomPoints);

// Poisson disk sampling example
const poissonPoints: SvgDef = {
  size: [400, 400],

  poisson: {
    radius: 20,
    bounds: { x: 20, y: 20, width: 360, height: 360 },
    seed: 42,
    circle: {
      cx: $ => $.x,
      cy: $ => $.y,
      r: 8,
      fill: $ => `hsl(${$.i * 5}, 60%, 55%)`,
      stroke: 'white',
      strokeWidth: 1
    }
  }
};

output('poisson-points', poissonPoints);

// Composing random points with Voronoi using collect
const randomVoronoi: SvgDef = {
  size: [400, 400],

  // Collect random points, then pass to voronoi
  collect: {
    points: {
      random: {
        count: 30,
        bounds: { x: 20, y: 20, width: 360, height: 360 },
        seed: 12345
      }
    },
    // Now $.points contains all the collected [x, y] pairs
    voronoi: {
      points: $ => $.points,
      bounds: { x: 0, y: 0, width: 400, height: 400 },
      polygon: {
        points: $ => $.vertices,
        fill: $ => `hsl(${$.i * 12}, 50%, 80%)`,
        stroke: 'white',
        strokeWidth: 2
      },
      circle: {
        cx: $ => $.x,
        cy: $ => $.y,
        r: 3,
        fill: $ => `hsl(${$.i * 12}, 70%, 40%)`,
        stroke: 'none'
      }
    }
  }
};

output('random-voronoi', randomVoronoi);

// Poisson + Delaunay composition using collect
const poissonDelaunay: SvgDef = {
  size: [400, 400],

  collect: {
    points: {
      poisson: {
        radius: 30,
        bounds: { x: 20, y: 20, width: 360, height: 360 },
        seed: 42
      }
    },
    delaunay: {
      points: $ => $.points,
      polygon: {
        points: $ => $.vertices,
        fill: $ => `hsla(${200 + $.i * 3}, 60%, 70%, 0.8)`,
        stroke: 'white',
        strokeWidth: 1
      }
    }
  }
};

output('poisson-delaunay', poissonDelaunay);
