// Panel rectangles for each VICE PRESS layout. All coordinates are in canvas
// pixels for a cover of width W and height H. A panel may carry an `angle`
// (degrees) for the tilted polaroid layout; the renderer rotates around the
// panel centre. `count` is how many photos a layout shows at once.

export const LAYOUTS = {
  hero: { label: 'Hero + three', count: 4 },
  grid: { label: '2 x 2 grid', count: 4 },
  full: { label: 'Full bleed', count: 1 },
  nine: { label: '3 x 3 grid', count: 9 },
  polaroid: { label: 'Tilted snapshots', count: 3 },
  triptych: { label: 'Triptych', count: 3 },
};

/** Returns the panel rectangles for `layout` on a W x H cover. */
export function layoutPanels(layout, W, H) {
  const gap = Math.max(6, Math.round(Math.min(W, H) * 0.008));
  const third = (H - gap * 2) / 3;
  switch (layout) {
    case 'hero': {
      const leftW = Math.round(W * 0.62) - gap;
      const rightX = Math.round(W * 0.62);
      const rightW = W - rightX;
      return [
        { x: 0, y: 0, w: leftW, h: H },
        { x: rightX, y: 0, w: rightW, h: third },
        { x: rightX, y: third + gap, w: rightW, h: third },
        { x: rightX, y: (third + gap) * 2, w: rightW, h: third },
      ];
    }
    case 'grid': {
      const cw = (W - gap) / 2;
      const ch = (H - gap) / 2;
      return [
        { x: 0, y: 0, w: cw, h: ch },
        { x: cw + gap, y: 0, w: cw, h: ch },
        { x: 0, y: ch + gap, w: cw, h: ch },
        { x: cw + gap, y: ch + gap, w: cw, h: ch },
      ];
    }
    case 'full':
      return [{ x: 0, y: 0, w: W, h: H }];
    case 'nine': {
      const cw = (W - gap * 2) / 3;
      const ch = (H - gap * 2) / 3;
      const panels = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          panels.push({ x: c * (cw + gap), y: r * (ch + gap), w: cw, h: ch });
        }
      }
      return panels;
    }
    case 'polaroid': {
      // Three overlapping frames on a coloured backdrop; each is rotated a
      // little so the cover feels like snapshots tossed on a table.
      const pw = W * 0.46;
      const ph = H * 0.56;
      const cy = H * 0.44 - ph / 2;
      return [
        { x: W * 0.04, y: cy + H * 0.03, w: pw, h: ph, angle: -8 },
        { x: W * 0.28, y: cy - H * 0.02, w: pw, h: ph, angle: 4 },
        { x: W * 0.52, y: cy + H * 0.05, w: pw, h: ph, angle: -3 },
      ];
    }
    case 'triptych':
    default: {
      const cw = (W - gap * 2) / 3;
      return [
        { x: 0, y: 0, w: cw, h: H },
        { x: cw + gap, y: 0, w: cw, h: H },
        { x: (cw + gap) * 2, y: 0, w: cw, h: H },
      ];
    }
  }
}
