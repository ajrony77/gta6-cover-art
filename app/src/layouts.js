// Six multi-panel layouts for the cover. Every panel is a normalized rect
// (fractions of the canvas width and height) with an optional tilt in
// degrees; the renderer insets each panel by half the gutter so a cream
// frame shows around the whole collage. The first panel of a layout is its
// hero: the photo the eye lands on first.
export const LAYOUTS = [
  {
    id: 'hero-left',
    name: 'Hero Left',
    blurb: 'One tall hero, two stacked panels',
    panels: [
      { x: 0, y: 0, w: 0.6, h: 1, tilt: 0, hero: true },
      { x: 0.6, y: 0, w: 0.4, h: 0.49, tilt: 1.2 },
      { x: 0.6, y: 0.51, w: 0.4, h: 0.49, tilt: -1 },
    ],
  },
  {
    id: 'hero-right',
    name: 'Hero Right',
    blurb: 'Two stacked panels, one tall hero',
    panels: [
      { x: 0, y: 0, w: 0.4, h: 0.49, tilt: -1.2 },
      { x: 0, y: 0.51, w: 0.4, h: 0.49, tilt: 1 },
      { x: 0.4, y: 0, w: 0.6, h: 1, tilt: 0, hero: true },
    ],
  },
  {
    id: 'hero-top',
    name: 'Hero Top',
    blurb: 'Wide hero over three small panels',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.56, tilt: 0, hero: true },
      { x: 0, y: 0.58, w: 0.32, h: 0.42, tilt: -1 },
      { x: 0.34, y: 0.58, w: 0.32, h: 0.42, tilt: 0.8 },
      { x: 0.68, y: 0.58, w: 0.32, h: 0.42, tilt: -0.6 },
    ],
  },
  {
    id: 'showcase',
    name: 'Showcase',
    blurb: 'Five panels, hero top-left',
    panels: [
      { x: 0, y: 0, w: 0.66, h: 0.49, tilt: 0, hero: true },
      { x: 0.68, y: 0, w: 0.32, h: 0.49, tilt: 1.2 },
      { x: 0, y: 0.51, w: 0.32, h: 0.49, tilt: -0.8 },
      { x: 0.34, y: 0.51, w: 0.32, h: 0.49, tilt: 0.6 },
      { x: 0.68, y: 0.51, w: 0.32, h: 0.49, tilt: -1.1 },
    ],
  },
  {
    id: 'grid',
    name: 'Four Square',
    blurb: 'Four equal panels, no hero',
    panels: [
      { x: 0, y: 0, w: 0.49, h: 0.49, tilt: -0.8 },
      { x: 0.51, y: 0, w: 0.49, h: 0.49, tilt: 0.8 },
      { x: 0, y: 0.51, w: 0.49, h: 0.49, tilt: 0.8 },
      { x: 0.51, y: 0.51, w: 0.49, h: 0.49, tilt: -0.8 },
    ],
  },
  {
    id: 'tall-sides',
    name: 'Tall Sides',
    blurb: 'Two tall side panels around a hero',
    panels: [
      { x: 0, y: 0, w: 0.24, h: 1, tilt: -1 },
      { x: 0.26, y: 0, w: 0.48, h: 1, tilt: 0, hero: true },
      { x: 0.76, y: 0, w: 0.24, h: 1, tilt: 1 },
    ],
  },
];

/** Returns the layout with this id, or the first layout when unknown. */
export function layoutById(id) {
  return LAYOUTS.find((entry) => entry.id === id) ?? LAYOUTS[0];
}
