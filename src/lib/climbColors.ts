/** Marker colours: theme gold and royal blue first, then distinct hues on the same lightness */
const MARKER_COLORS = [
  'hsl(var(--gold))',
  'hsl(205 80% 55%)',
  'hsl(152 55% 42%)',
  'hsl(12 80% 60%)',
  'hsl(265 55% 60%)',
  'hsl(330 65% 58%)',
];

/** Colour of a boy's marker on the climb (same index order everywhere) */
export function markerColor(index: number): string {
  return MARKER_COLORS[index % MARKER_COLORS.length];
}
