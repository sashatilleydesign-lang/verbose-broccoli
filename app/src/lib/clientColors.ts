// Client.colorTag (§3/§11.7) — a fixed palette of visually distinct hues.
// Direct-create (§11.1) only ever asks for a name, so a new client's
// color is auto-assigned from here rather than left at one shared
// default; CLIENT_COLOR_PALETTE is also reused by ClientProfileCard's
// swatch picker so "auto-assigned" and "manually chosen" draw from the
// same set.
export const CLIENT_COLOR_PALETTE = [
  "#ff4b1f", // orange
  "#00c875", // green
  "#579bfc", // blue
  "#a25ddc", // purple
  "#e2445c", // red
  "#fdab3d", // amber
  "#66ccff", // sky
  "#ff158a", // pink
];

export function nextClientColor(existingClientCount: number): string {
  return CLIENT_COLOR_PALETTE[existingClientCount % CLIENT_COLOR_PALETTE.length];
}
