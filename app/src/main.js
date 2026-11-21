// VICE PRESS editor wiring: photo upload and sample photos, caption inputs,
// layout / grade / size pickers, per-panel pan and zoom, photo assignment,
// export, undo / redo, and the fixed screenshot scenes (./shots.js).
// Photos are read locally with object URLs and never uploaded anywhere.
import { drawCover } from './cover.js';
import { LAYOUTS } from './layouts.js';
import { GRADES } from './grades.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const badgeInput = document.getElementById('badge');
const zoomRange = document.getElementById('zoom');
const panelLabel = document.getElementById('panel-label');

export const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard' },
  { id: 'pier', label: 'Pier' },
  { id: 'convertible', label: 'Convertible' },
  { id: 'neon', label: 'Neon' },
];

export const SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  story: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

const DEFAULT_PANELS = {
  hero: [2, 3, 0, 1],
  grid: [2, 3, 0, 1],
  full: [2],
  nine: [2, 3, 0, 1, 2, 3, 0, 1, 2],
  polaroid: [2, 0, 3],
  triptych: [2, 3, 1],
};

function freshPanels(layout) {
  return (DEFAULT_PANELS[layout] || [0]).map((photo) => ({ photo, panX: 0, panY: 0, zoom: 1 }));
}

function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: 'square',
    title: 'Neon Shore',
    subtitle: 'Vice City nights',
    titlePos: 'bottom',
    stars: 4,
    badge: 'Vice City',
    selected: 0,
    panels: freshPanels('hero'),
  };
}

let state = defaultState();
// photos[i] is an HTMLImageElement (or null while loading); labels[i] names it.
const photos = [];
const labels = [];
const undoStack = [];
const redoStack = [];

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}

function applySnapshot(snap) {
  state = JSON.parse(JSON.stringify(snap));
  syncControls();
  redraw();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, { ...state, photos });
}

function syncControls() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  zoomRange.value = String((state.panels[state.selected] || { zoom: 1 }).zoom);
  document.getElementById('title-pos').textContent =
    state.titlePos === 'top' ? 'Title: top' : 'Title: bottom';
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.querySelectorAll('[data-stars]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.stars) === state.stars);
  });
  const count = (LAYOUTS[state.layout] || { count: 1 }).count;
  panelLabel.textContent = `Panel ${state.selected + 1} of ${count} — drag on the cover to pan it`;
  document.querySelectorAll('[data-assign]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.assign) === (state.panels[state.selected] || {}).photo);
  });
}

function buildPicker(containerId, items, attr, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  for (const [id, label] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset[attr] = id;
    b.addEventListener('click', () => { pushUndo(); onPick(id); syncControls(); redraw(); });
    box.appendChild(b);
  }
}

function buildPhotoStrip() {
  const strip = document.getElementById('photo-strip');
  strip.innerHTML = '';
  labels.forEach((label, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'photo-thumb';
    b.dataset.assign = String(i);
    b.textContent = label;
    b.title = 'Put this photo in the selected panel';
    b.addEventListener('click', () => {
      pushUndo();
      state.panels[state.selected].photo = i;
      syncControls();
      redraw();
    });
    strip.appendChild(b);
  });
}

// ---- Canvas interaction: click selects a panel, drag pans the photo ----
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

let drag = null;

canvas.addEventListener('pointerdown', async (e) => {
  const { layoutPanels } = await import('./layouts.js');
  const p = canvasPoint(e);
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  let hit = -1;
  rects.forEach((r, i) => {
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) hit = i;
  });
  if (hit === -1) return;
  canvas.setPointerCapture(e.pointerId);
  if (hit !== state.selected) {
    pushUndo();
    state.selected = hit;
    syncControls();
  }
  drag = { x: p.x, y: p.y, panX: state.panels[hit].panX, panY: state.panels[hit].panY, rect: rects[hit] };
  redraw();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const spec = state.panels[state.selected];
  const img = photos[spec.photo];
  if (!img) return;
  const scale = Math.max(drag.rect.w / img.naturalWidth, drag.rect.h / img.naturalHeight) * spec.zoom;
  const slackX = Math.max(1, (img.naturalWidth * scale - drag.rect.w) / 2);
  const slackY = Math.max(1, (img.naturalHeight * scale - drag.rect.h) / 2);
  spec.panX = Math.max(-1, Math.min(1, drag.panX + ((p.x - drag.x) / slackX) * 0.9));
  spec.panY = Math.max(-1, Math.min(1, drag.panY + ((p.y - drag.y) / slackY) * 0.9));
  redraw();
});

canvas.addEventListener('pointerup', () => { drag = null; });

// ---- Controls ----
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
titleInput.addEventListener('change', () => pushUndo());
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
subtitleInput.addEventListener('change', () => pushUndo());
badgeInput.addEventListener('input', () => { state.badge = badgeInput.value; redraw(); });
badgeInput.addEventListener('change', () => pushUndo());

document.getElementById('title-pos').addEventListener('click', () => {
  pushUndo();
  state.titlePos = state.titlePos === 'top' ? 'bottom' : 'top';
  syncControls();
  redraw();
});

zoomRange.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomRange.value);
  redraw();
});
zoomRange.addEventListener('change', () => pushUndo());

document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
  syncUndoButtons();
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
  syncUndoButtons();
});

document.getElementById('upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    photos.push(img);
    labels.push(file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Upload');
    pushUndo();
    state.panels[state.selected].photo = photos.length - 1;
    buildPhotoStrip();
    syncControls();
    redraw();
    statusEl.textContent = 'Loaded ' + file.name;
  } catch {
    statusEl.textContent = 'That file could not be read as a photo.';
  }
});

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, { ...state, photos });
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — please try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-press-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved vice-press-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KiB)`;
  }, 'image/png');
});

buildPicker('layout-picker', Object.entries(LAYOUTS).map(([id, v]) => [id, v.label]), 'layout', (id) => {
  state.layout = id;
  state.panels = freshPanels(id);
  state.selected = 0;
});
buildPicker('grade-picker', Object.entries(GRADES).map(([id, v]) => [id, v.label]), 'grade', (id) => {
  state.grade = id;
});
buildPicker('size-picker', Object.entries(SIZES).map(([id, v]) => [id, v.label]), 'size', (id) => {
  state.size = id;
});
buildPicker('stars-picker', [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], 'stars', (id) => {
  state.stars = Number(id);
});

// ---- Screenshot scenes ----
async function applyShot(params) {
  const size = SIZES[params.size] || SIZES.square;
  const img = await loadImage(`samples/${params.photo}.jpg`);
  photos.length = 0;
  labels.length = 0;
  photos.push(img);
  labels.push(params.photo);
  state = defaultState();
  state.layout = params.layout || 'hero';
  state.grade = params.grade || 'sunset';
  state.size = params.size || 'square';
  state.title = params.caption || 'Neon Shore';
  state.subtitle = params.subtitle || 'Vice City nights';
  state.panels = freshPanels(state.layout).map((p) => ({ ...p, photo: 0 }));
  state.selected = 0;
  if (params.mode === 'editor') {
    // Editor scene: load all four samples so the strip is full, as in use.
    for (const s of SAMPLES) {
      if (s.id === params.photo) continue;
      photos.push(await loadImage(`samples/${s.id}.jpg`));
      labels.push(s.label);
    }
    state.panels = freshPanels(state.layout).map((p, i) => ({ ...p, photo: i % photos.length }));
  }
  canvas.width = size.w;
  canvas.height = size.h;
  syncControls();
  buildPhotoStrip();
  await document.fonts.ready;
  redraw();
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, applyShot);
} else {
  (async () => {
    for (const s of SAMPLES) {
      try {
        photos.push(await loadImage(`samples/${s.id}.jpg`));
        labels.push(s.label);
      } catch {
        photos.push(null);
        labels.push(s.label);
      }
    }
    buildPhotoStrip();
    await document.fonts.ready;
    syncControls();
    syncUndoButtons();
    redraw();
  })();
}

// Test hook for the headless check: state, canvas and a PNG export probe.
window.__vicepress = {
  get state() { return state; },
  get canvas() { return canvas; },
  get photosLoaded() { return photos.filter(Boolean).length; },
  exportPng() {
    return new Promise((resolve) => {
      const size = SIZES[state.size];
      const off = document.createElement('canvas');
      off.width = size.w;
      off.height = size.h;
      drawCover(off, { ...state, photos });
      off.toBlob((b) => resolve(b ? b.size : 0), 'image/png');
    });
  },
};
