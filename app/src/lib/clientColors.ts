// Client.colorTag (§3/§11.7) — a fixed palette of visually distinct hues.
// Direct-create (§11.1) only ever asks for a name, so a new client's
// color is auto-assigned from here rather than left at one shared
// default; CLIENT_COLOR_PALETTE is also reused by ClientProfileCard's
// swatch picker so "auto-assigned" and "manually chosen" draw from the
// same set.
export const CLIENT_COLOR_PALETTE = [
  "#8a90e8", // indigo
  "#d9a94a", // ochre
  "#5b9fd6", // sky
  "#d987a6", // rose
  "#4fb3a4", // teal
  "#b784e0", // violet
  "#8fb573", // sage
  "#8fa3b8", // slate
];

export function nextClientColor(existingClientCount: number): string {
  return CLIENT_COLOR_PALETTE[existingClientCount % CLIENT_COLOR_PALETTE.length];
}
