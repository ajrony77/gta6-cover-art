// The sample photos shipped with the app. The six webp files were made with
// an image model for this entry and are free to use; boulevard.jpg and
// pier.jpg are the kit's own samples, also free to use. Each photo carries
// the caption chip it suggests: a place, a time and a flavour line, in the
// style of the multi-panel posters this app imitates. No photo shows a real
// person, a Rockstar logo or any game's artwork.
export const SAMPLES = [
  {
    id: 'car',
    src: 'samples/car.webp',
    label: 'Supercar',
    place: 'OCEAN DRIVE',
    time: '7:40 PM',
    flavor: 'NO WITNESSES',
  },
  {
    id: 'neon',
    src: 'samples/neon.webp',
    label: 'Neon Row',
    place: 'NEON ROW',
    time: '11:58 PM',
    flavor: 'EVERY LIGHT ON',
  },
  {
    id: 'coast',
    src: 'samples/coast.webp',
    label: 'Palm Bay',
    place: 'PALM BAY',
    time: '6:12 PM',
    flavor: 'GOLDEN HOUR',
  },
  {
    id: 'boat',
    src: 'samples/boat.webp',
    label: 'Speedboat',
    place: 'BISCAYNE BAY',
    time: '6:47 PM',
    flavor: 'FULL THROTTLE',
  },
  {
    id: 'heli',
    src: 'samples/heli.webp',
    label: 'Helicopter',
    place: 'DOWNTOWN',
    time: '8:15 PM',
    flavor: 'EYES IN THE SKY',
  },
  {
    id: 'beach',
    src: 'samples/beach.webp',
    label: 'Beach Club',
    place: 'SOUTH BEACH',
    time: '5:30 PM',
    flavor: 'LAST LIGHT',
  },
  {
    id: 'boulevard',
    src: 'samples/boulevard.jpg',
    label: 'Boulevard',
    place: 'BOULEVARD',
    time: '7:05 PM',
    flavor: 'CRUISE CONTROL',
  },
  {
    id: 'pier',
    src: 'samples/pier.jpg',
    label: 'Pier',
    place: 'PIER 26',
    time: '6:02 PM',
    flavor: 'END OF THE LINE',
  },
];

/** Returns the sample with this id, or the first sample when unknown. */
export function sampleById(id) {
  return SAMPLES.find((entry) => entry.id === id) ?? SAMPLES[0];
}

/** Builds the default caption chip for a sample: "PLACE — TIME, FLAVOR". */
export function chipFor(sample) {
  return `${sample.place} — ${sample.time}, ${sample.flavor}`;
}
