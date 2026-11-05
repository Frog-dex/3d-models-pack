// The single source of truth for the pack: names, groups and measured stats for every model.
// `npm run check` verifies triangles and bytes against the real files, so keep them in sync.
// `height` is a rough real-world height in metres, used to lay the models out in the Study scene.

export const GROUPS = {
  study: 'Observatory study',
  terminals: 'Terminals',
  creatures: 'Creatures',
  structures: 'Structures',
};

export const MODELS = [
  { id: 'desk', file: 'desk.glb', name: 'Writing desk', group: 'study', triangles: 5268, bytes: 229728, height: 1.25,
    blurb: 'A roll-top writing desk with pigeonholes and brass pulls: the centrepiece of the observatory study.' },
  { id: 'lamp', file: 'lamp.glb', name: 'Oil lamp', group: 'study', triangles: 2243, bytes: 214964, height: 0.42,
    blurb: 'A brass oil lamp with a smoked glass chimney.' },
  { id: 'globe', file: 'globe.glb', name: 'Armillary globe', group: 'study', triangles: 2272, bytes: 211444, height: 0.55,
    blurb: 'Brass rings around a red lacquered stand, for charting the sky.' },
  { id: 'telescope', file: 'telescope.glb', name: 'Telescope', group: 'study', triangles: 2612, bytes: 304520, height: 1.5,
    blurb: 'A brass and leather refractor on a wooden tripod.' },
  { id: 'clock', file: 'clock.glb', name: 'Mantel clock', group: 'study', triangles: 5721, bytes: 264440, height: 0.48,
    blurb: 'A mahogany mantel clock with a gilt crest and a swinging pendulum window.' },
  { id: 'books', file: 'books.glb', name: 'Books', group: 'study', triangles: 2386, bytes: 209972, height: 0.4,
    blurb: 'A stack of worn leather volumes with a candle on top.' },
  { id: 'signalscope', file: 'signalscope.glb', name: 'Signalscope', group: 'terminals', triangles: 4232, bytes: 320628, height: 0.6,
    blurb: 'A wooden listening set with twin brass horns and dials.' },
  { id: 'terminal', file: 'terminal.glb', name: 'Terminal', group: 'terminals', triangles: 2066, bytes: 184040, height: 0.75,
    blurb: 'A wood-cased CRT terminal with a brass bezel.' },
  { id: 'retro-computer', file: 'retro-computer.glb', name: 'Lizard Terminal', group: 'terminals', triangles: 79960, bytes: 956652, height: 0.5,
    blurb: 'A red lizard-faced desktop computer with its keyboard and coiled cable. The detailed one of the pack.' },
  { id: 'lizard', file: 'lizard.glb', name: 'Lizard', group: 'creatures', triangles: 3261, bytes: 114616, height: 0.95,
    blurb: 'The red lizard, dressed in a black-and-white suit.' },
  { id: 'dome', file: 'dome.glb', name: 'Observatory dome', group: 'structures', triangles: 3400, bytes: 258372, height: 2.6,
    blurb: 'A riveted brass dome with a slatted vent at the crown.' },
  { id: 'tunnelA', file: 'tunnelA.glb', name: 'Tunnel A', group: 'structures', triangles: 4155, bytes: 230364, height: 2.2,
    blurb: 'A wide banded copper tunnel section.' },
  { id: 'tunnelB', file: 'tunnelB.glb', name: 'Tunnel B', group: 'structures', triangles: 2182, bytes: 318788, height: 0.8,
    blurb: 'A long, narrow ribbed tunnel section.' },
];

export const modelUrl = (m, base = '') => `${base}models/${m.file}`;
export const thumbUrl = (m, base = '') => `${base}docs/thumbs/${m.id}.webp`;

export function formatBytes(n) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}
