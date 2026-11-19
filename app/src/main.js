// Wires the page: the editor controls, the live preview canvas, undo/redo,
// drag-to-crop and wheel-to-zoom on the selected panel, photo uploads and
// the three-size PNG export. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import { drawCover, sizeById, SIZES } from './cover.js';
import { layoutById, LAYOUTS } from './layouts.js';
import { gradeById, GRADES } from './grades.js';
import { SAMPLES, sampleById, chipFor } from './photos.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const images = new Map();
const customPhotos = [];
let uploadCount = 0;
let selected = 0;

/** The fresh editor state: a sunset hero-left cover called VICE COAST. */
export function defaultState() {
  return {
    sizeId: '1920x1080',
    layoutId: 'hero-left',
    gradeId: 'sunset',
    title: 'VICE COAST',
    subtitle: 'Neon Tide',
    quote: 'The coast has never looked this good',
    quoteBy: 'VICE DAILY',
    tagline: 'ONE COAST · NO RULES · COMING SOON',
    panels: [],
    badges: { wanted: true, seal: true, vol: true, ribbon: true, starburst: true, quote: true },
    fillOne: false,
  };
}

const state = defaultState();
const history = [];
let future = [];

/** Makes the panels array match the layout: keeps assignments, fills gaps. */
export function syncPanels(current) {
  const layout = layoutById(current.layoutId);
  const next = [];
  for (let i = 0; i < layout.panels.length; i += 1) {
    const kept = current.panels[i];
    if (kept) {
      next.push(kept);
    } else {
      const sample = SAMPLES[(i * 2 + 1) % SAMPLES.length];
      next.push({ photo: sample.id, chip: chipFor(sample), zoom: 1, dx: 0, dy: 0 });
    }
  }
  current.panels = next;
  selected = Math.min(selected, next.length - 1);
}

syncPanels(state);

/** Finds a photo by id among the samples and the user's uploads. */
export function resolvePhoto(id) {
  return customPhotos.find((entry) => entry.id === id) ?? sampleById(id);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads every photo the panels use into the image cache. */
export async function ensureImages() {
  const jobs = state.panels.map(async (panel) => {
    if (images.has(panel.photo)) return;
    const photo = resolvePhoto(panel.photo);
    try {
      images.set(panel.photo, await loadImage(photo.src));
    } catch {
      // A photo that will not load draws as a dark panel; never throw.
    }
  });
  await Promise.all(jobs);
}

/** Draws the current state onto the canvas at its export size. */
export function render() {
  const size = sizeById(state.sizeId);
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, images);
  syncPanelControls();
}

/** Pushes a snapshot so undo can return to the state before this change. */
export function pushHistory() {
  history.push(JSON.stringify(state));
  if (history.length > 50) history.shift();
  future = [];
  syncUndoButtons();
}

/** Restores a snapshot taken from the history stacks. */
export function restore(snapshot) {
  const parsed = JSON.parse(snapshot);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, parsed);
  syncPanels(state);
  syncControls();
  render();
}

export function undo() {
  if (!history.length) return;
  future.push(JSON.stringify(state));
  restore(history.pop());
  syncUndoButtons();
}

export function redo() {
  if (!future.length) return;
  history.push(JSON.stringify(state));
  restore(future.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = !history.length;
  document.getElementById('redo').disabled = !future.length;
}

/** Builds the sample thumbnails, layout and grade pickers and badge toggles. */
export function buildControls() {
  const samples = document.getElementById('samples');
  samples.innerHTML = '';
  [...SAMPLES, ...customPhotos].forEach((photo) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = photo.label;
    button.dataset.photo = photo.id;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.label;
    button.appendChild(img);
    const label = document.createElement('span');
    label.textContent = photo.label;
    button.appendChild(label);
    button.addEventListener('click', () => assignPhoto(photo.id));
    samples.appendChild(button);
  });

  const layouts = document.getElementById('layouts');
  layouts.innerHTML = '';
  LAYOUTS.forEach((layout) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.dataset.layout = layout.id;
    button.textContent = layout.name;
    button.title = layout.blurb;
    button.addEventListener('click', () => {
      pushHistory();
      state.layoutId = layout.id;
      syncPanels(state);
      render();
      syncControls();
    });
    layouts.appendChild(button);
  });

  const grades = document.getElementById('grades');
  grades.innerHTML = '';
  GRADES.forEach((grade) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.dataset.grade = grade.id;
    button.textContent = grade.name;
    button.addEventListener('click', () => {
      pushHistory();
      state.gradeId = grade.id;
      render();
      syncControls();
    });
    grades.appendChild(button);
  });

  const badges = document.getElementById('badges');
  badges.innerHTML = '';
  const names = {
    wanted: 'WANTED stars + HEAT',
    seal: 'EST. 2026 gold seal',
    vol: 'VOL. 06 chip',
    ribbon: "Collector's ribbon",
    starburst: 'ORIGINAL starburst',
    quote: 'Press-quote strip',
  };
  Object.keys(names).forEach((key) => {
    const label = document.createElement('label');
    label.className = 'check';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.badges[key];
    box.addEventListener('change', () => {
      pushHistory();
      state.badges[key] = box.checked;
      render();
    });
    label.appendChild(box);
    label.appendChild(document.createTextNode(` ${names[key]}`));
    badges.appendChild(label);
  });

  const sizes = document.getElementById('sizes');
  sizes.innerHTML = '';
  SIZES.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.dataset.size = size.id;
    button.textContent = size.label;
    button.addEventListener('click', () => {
      pushHistory();
      state.sizeId = size.id;
      render();
      syncControls();
    });
    sizes.appendChild(button);
  });
}

/** Marks the active layout, grade and size buttons. */
export function syncControls() {
  document.querySelectorAll('#layouts .pick').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layoutId);
  });
  document.querySelectorAll('#grades .pick').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.gradeId);
  });
  document.querySelectorAll('#sizes .pick').forEach((button) => {
    button.classList.toggle('active', button.dataset.size === state.sizeId);
  });
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('quote').value = state.quote;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('fillOne').checked = state.fillOne;
  syncPanelControls();
}

/** Shows the selected panel's chip and zoom in the panel section. */
export function syncPanelControls() {
  const panel = state.panels[selected];
  if (!panel) return;
  document.getElementById('panelName').textContent =
    `Panel ${selected + 1} of ${state.panels.length} — ${resolvePhoto(panel.photo).label}`;
  const chip = document.getElementById('chip');
  if (document.activeElement !== chip) chip.value = panel.chip;
  const zoom = document.getElementById('zoom');
  if (document.activeElement !== zoom) zoom.value = String(panel.zoom ?? 1);
}

/** Assigns a photo to the selected panel, or to every panel when fill-one is on. */
export function assignPhoto(id) {
  pushHistory();
  const photo = resolvePhoto(id);
  const applyTo = state.fillOne ? state.panels : [state.panels[selected]];
  applyTo.forEach((panel) => {
    panel.photo = id;
    panel.chip = chipFor(photo);
    panel.zoom = 1;
    panel.dx = 0;
    panel.dy = 0;
  });
  ensureImages().then(render);
}

/** Exports the canvas at its current size as a PNG download. */
export function exportPNG() {
  render();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed: the canvas would not make a PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-${state.sizeId}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    status.textContent = `Saved vice-coast-${state.sizeId}.png`;
  }, 'image/png');
}

/** Applies a shot scene's patch (from ./shots.js), then renders it. */
export async function applyShot(patch) {
  if (patch.sizeId) state.sizeId = patch.sizeId;
  if (patch.layoutId) state.layoutId = patch.layoutId;
  if (patch.gradeId) state.gradeId = patch.gradeId;
  if (patch.title !== undefined) state.title = patch.title;
  if (patch.subtitle !== undefined) state.subtitle = patch.subtitle;
  if (patch.panels) state.panels = patch.panels;
  syncPanels(state);
  await ensureImages();
  render();
}

/** Which panel, if any, holds the point given in canvas pixels. */
export function panelAt(x, y) {
  const layout = layoutById(state.layoutId);
  const gutter = Math.round(Math.min(canvas.width, canvas.height) * 0.012);
  for (let i = 0; i < layout.panels.length; i += 1) {
    const p = layout.panels[i];
    const rect = {
      x: p.x * canvas.width + gutter / 2,
      y: p.y * canvas.height + gutter / 2,
      w: p.w * canvas.width - gutter,
      h: p.h * canvas.height - gutter,
    };
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) return i;
  }
  return -1;
}

function bindEvents() {
  document.getElementById('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  document.getElementById('title').addEventListener('change', pushHistory);
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });
  document.getElementById('subtitle').addEventListener('change', pushHistory);
  document.getElementById('quote').addEventListener('input', (e) => {
    state.quote = e.target.value;
    render();
  });
  document.getElementById('quote').addEventListener('change', pushHistory);
  document.getElementById('tagline').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    render();
  });
  document.getElementById('tagline').addEventListener('change', pushHistory);
  document.getElementById('fillOne').addEventListener('change', (e) => {
    pushHistory();
    state.fillOne = e.target.checked;
    render();
  });
  document.getElementById('chip').addEventListener('input', (e) => {
    state.panels[selected].chip = e.target.value;
    render();
  });
  document.getElementById('chip').addEventListener('change', pushHistory);
  document.getElementById('zoom').addEventListener('input', (e) => {
    state.panels[selected].zoom = Number(e.target.value);
    render();
  });
  document.getElementById('zoom').addEventListener('change', pushHistory);
  document.getElementById('resetPan').addEventListener('click', () => {
    pushHistory();
    const panel = state.panels[selected];
    panel.zoom = 1;
    panel.dx = 0;
    panel.dy = 0;
    render();
  });
  document.getElementById('export').addEventListener('click', exportPNG);
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  document.getElementById('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    uploadCount += 1;
    const photo = { id: `upload-${uploadCount}`, src: url, label: file.name.replace(/\.[^.]+$/, '') || 'Upload' };
    customPhotos.push(photo);
    try {
      images.set(photo.id, await loadImage(url));
    } catch {
      status.textContent = 'That file would not load as a photo.';
      return;
    }
    pushHistory();
    assignPhotoWithoutHistory(photo.id);
    buildControls();
    render();
  });

  let dragging = false;
  let dragStart = null;
  let dragPanel = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const hit = panelAt(x, y);
    if (hit < 0) return;
    selected = hit;
    syncPanelControls();
    dragging = true;
    dragPanel = { ...state.panels[hit] };
    dragStart = { x, y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !dragStart) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const layout = layoutById(state.layoutId);
    const p = layout.panels[selected];
    const panel = state.panels[selected];
    panel.dx = Math.max(-0.4, Math.min(0.4, dragPanel.dx + (x - dragStart.x) / (p.w * canvas.width)));
    panel.dy = Math.max(-0.4, Math.min(0.4, dragPanel.dy + (y - dragStart.y) / (p.h * canvas.height)));
    render();
  });
  const endDrag = () => {
    if (dragging) pushHistory();
    dragging = false;
    dragStart = null;
    dragPanel = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  let wheelTimer = null;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selected];
    panel.zoom = Math.max(0.8, Math.min(2.5, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(pushHistory, 350);
  }, { passive: false });
}

/** Assigns a photo without touching history (used right after an upload). */
function assignPhotoWithoutHistory(id) {
  const photo = resolvePhoto(id);
  const applyTo = state.fillOne ? state.panels : [state.panels[selected]];
  applyTo.forEach((panel) => {
    panel.photo = id;
    panel.chip = chipFor(photo);
    panel.zoom = 1;
    panel.dx = 0;
    panel.dy = 0;
  });
}

/** Loads the display fonts, then renders; re-renders once they arrive. */
async function start() {
  buildControls();
  bindEvents();
  syncControls();
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  await ensureImages();
  render();
  try {
    await Promise.race([
      Promise.all([document.fonts.load('100px Anton'), document.fonts.load('100px Pacifico')]),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {
    // Missing fonts fall back to sans-serif; the cover still draws.
  }
  render();
  if (shot) {
    await runShot(shot, query, applyShot);
    render();
  }
}

start();
