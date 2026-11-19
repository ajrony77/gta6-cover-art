// Five colour grades, each a wash laid over the whole collage after the
// panels are drawn: a top-to-bottom overlay gradient, a flat tint and a
// vignette strength. The values are small on purpose — the photos stay the
// subject, the grade just pushes them toward sunset or neon.
export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    top: 'rgba(255, 120, 60, 0.10)',
    bottom: 'rgba(190, 40, 140, 0.18)',
    tint: 'rgba(255, 110, 60, 0.06)',
    vignette: 0.26,
  },
  {
    id: 'neon',
    name: 'Neon Night',
    top: 'rgba(255, 0, 170, 0.12)',
    bottom: 'rgba(0, 200, 255, 0.14)',
    tint: 'rgba(20, 0, 40, 0.08)',
    vignette: 0.34,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    top: 'rgba(255, 200, 80, 0.14)',
    bottom: 'rgba(255, 120, 0, 0.12)',
    tint: 'rgba(255, 170, 40, 0.05)',
    vignette: 0.22,
  },
  {
    id: 'teal',
    name: 'Teal Tide',
    top: 'rgba(0, 210, 190, 0.10)',
    bottom: 'rgba(0, 90, 150, 0.16)',
    tint: 'rgba(0, 160, 160, 0.05)',
    vignette: 0.26,
  },
  {
    id: 'purple',
    name: 'Vice Purple',
    top: 'rgba(150, 50, 255, 0.12)',
    bottom: 'rgba(255, 40, 130, 0.14)',
    tint: 'rgba(60, 0, 90, 0.07)',
    vignette: 0.3,
  },
];

/** Returns the grade with this id, or the first grade when unknown. */
export function gradeById(id) {
  return GRADES.find((entry) => entry.id === id) ?? GRADES[0];
}
