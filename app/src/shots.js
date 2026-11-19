// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// size, layout and grade the query names; ?shot=editor shows the editor
// with a photo loaded. window.__shotReady is set once painted, after the
// display fonts have arrived and the cover has been drawn a second time.
import { sampleById, chipFor } from './photos.js';
import { layoutById } from './layouts.js';

/** Builds a panels array for a layout from a list of sample ids, cycling. */
export function panelsFor(layoutId, photoIds) {
  const layout = layoutById(layoutId);
  return layout.panels.map((panel, i) => {
    const sample = sampleById(photoIds[i % photoIds.length] ?? 'car');
    return { photo: sample.id, chip: chipFor(sample), zoom: 1, dx: 0, dy: 0 };
  });
}

/** Fits the cover canvas into the window without changing its aspect. */
export function fitShotCanvas() {
  const canvas = document.getElementById('cover');
  if (!canvas || !document.body.classList.contains('shot-cover')) return;
  const scale = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}

/** Runs one shot scene, then marks the page ready for a screenshot. */
export async function runShot(shot, query, apply) {
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const layoutId = query.get('layout') ?? 'hero-left';
    const photoIds = (query.get('photos') ?? 'car,neon,coast')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    await apply({
      sizeId: query.get('size') ?? '1920x1080',
      layoutId,
      gradeId: query.get('grade') ?? 'sunset',
      title: query.get('title') ?? 'VICE COAST',
      subtitle: query.get('subtitle') ?? 'Neon Tide',
      panels: panelsFor(layoutId, photoIds),
    });
  } else if (shot === 'editor') {
    const sample = sampleById(query.get('photo') ?? 'car');
    await apply({
      sizeId: '1920x1080',
      layoutId: 'hero-left',
      gradeId: 'sunset',
      title: 'VICE COAST',
      subtitle: 'Neon Tide',
      panels: panelsFor('hero-left', [sample.id, 'neon', 'coast']),
    });
  }
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch {
    // Fonts are a nicety here; the shot still counts if they fall back.
  }
  await apply({});
  fitShotCanvas();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
