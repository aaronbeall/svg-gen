import type { SvgDef } from './types.js';
import { evaluate, type EvalSvg, type EvalElement, type EvalPoint } from './evaluator.js';

// ============================================================================
// String Generation (EvalAST -> String)
// ============================================================================

function pointsToAttr(points: EvalPoint[]): string {
  return points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

function elementToString(el: EvalElement, indent = '  '): string {
  switch (el.type) {
    case 'path':
      return `${indent}<path d="${el.d}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"/>`;
    case 'circle':
      return `${indent}<circle cx="${el.cx}" cy="${el.cy}" r="${el.r}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"/>`;
    case 'rect':
      return `${indent}<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"/>`;
    case 'line':
      return `${indent}<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"/>`;
    case 'polyline':
      return `${indent}<polyline points="${pointsToAttr(el.points)}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"/>`;
    case 'polygon':
      return `${indent}<polygon points="${pointsToAttr(el.points)}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"/>`;
    case 'group': {
      const transformAttr = el.transform ? ` transform="${el.transform}"` : '';
      const childStrings = el.children.map(c => elementToString(c, indent + '  ')).join('\n');
      return `${indent}<g${transformAttr}>\n${childStrings}\n${indent}</g>`;
    }
  }
}

export function renderSvgString(evalSvg: EvalSvg): string {
  const content = evalSvg.elements.map(el => elementToString(el)).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${evalSvg.width}" height="${evalSvg.height}" viewBox="0 0 ${evalSvg.width} ${evalSvg.height}">
${content}
</svg>`;
}

// ============================================================================
// DOM Generation (EvalAST -> SVGElement)
// ============================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgElement(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key.replace(/([A-Z])/g, '-$1').toLowerCase(), String(value));
  }
  return el;
}

function elementToDom(el: EvalElement): SVGElement {
  switch (el.type) {
    case 'path':
      return createSvgElement('path', { d: el.d, fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth });
    case 'circle':
      return createSvgElement('circle', { cx: el.cx, cy: el.cy, r: el.r, fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth });
    case 'rect':
      return createSvgElement('rect', { x: el.x, y: el.y, width: el.width, height: el.height, fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth });
    case 'line':
      return createSvgElement('line', { x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2, stroke: el.stroke, strokeWidth: el.strokeWidth });
    case 'polyline':
      return createSvgElement('polyline', { points: pointsToAttr(el.points), fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth });
    case 'polygon':
      return createSvgElement('polygon', { points: pointsToAttr(el.points), fill: el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth });
    case 'group': {
      const g = createSvgElement('g', el.transform ? { transform: el.transform } : {});
      for (const child of el.children) g.appendChild(elementToDom(child));
      return g;
    }
  }
}

export function renderSvg(evalSvg: EvalSvg): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('width', String(evalSvg.width));
  svg.setAttribute('height', String(evalSvg.height));
  svg.setAttribute('viewBox', `0 0 ${evalSvg.width} ${evalSvg.height}`);
  for (const el of evalSvg.elements) svg.appendChild(elementToDom(el));
  return svg;
}

// ============================================================================
// HTML Generation
// ============================================================================

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderHtml(svgString: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>SVG Output</title>
  <style>
    body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f0f0; font-family: system-ui, sans-serif; }
    .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px; }
    h2 { margin-top: 0; color: #333; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Rendered SVG</h2>
    ${svgString}
  </div>
  <div class="container">
    <h2>SVG Source</h2>
    <pre>${escapeHtml(svgString)}</pre>
  </div>
</body>
</html>`;
}

// ============================================================================
// Main Render Function
// ============================================================================

export interface RenderResult {
  /** The evaluated AST */
  ast: EvalSvg;
  /** Returns SVG as string */
  svgString: () => string;
  /** Returns HTML page with embedded SVG */
  html: () => string;
  /** Returns SVG DOM element. Only available in browser environments. */
  svg: () => SVGSVGElement;
}

export function render(svg: SvgDef): RenderResult {
  const ast = evaluate(svg);
  let svgStringCache: string | null = null;

  const svgString = () => {
    if (!svgStringCache) svgStringCache = renderSvgString(ast);
    return svgStringCache;
  };

  return {
    ast,
    svgString,
    html: () => renderHtml(svgString()),
    svg: () => renderSvg(ast)
  };
}
