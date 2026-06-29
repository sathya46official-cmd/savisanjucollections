/**
 * Curated saree colour palette.
 *
 * The boutique admin does NOT need to know hex codes. They pick a named swatch
 * and we store the canonical hex for them automatically. This keeps colour
 * naming consistent across the whole catalogue (so the shop colour filter
 * groups variants correctly instead of creating a new colour per saree).
 *
 * Names are traditional Indian textile colours customers actually search for.
 */

export interface SareeColor {
  name: string;
  hex: string;
}

export const SAREE_COLORS: SareeColor[] = [
  // Reds & maroons
  { name: "Crimson Red", hex: "#9B1C2E" },
  { name: "Maroon", hex: "#5C1A1B" },
  { name: "Rani Pink", hex: "#C71585" },
  { name: "Rose Pink", hex: "#E6A4B4" },
  { name: "Coral", hex: "#E26D5A" },

  // Oranges & yellows
  { name: "Marigold", hex: "#E8A33D" },
  { name: "Mustard", hex: "#C99A2E" },
  { name: "Turmeric Yellow", hex: "#E4B429" },
  { name: "Saffron", hex: "#E67E22" },

  // Greens
  { name: "Emerald Green", hex: "#1F6F54" },
  { name: "Bottle Green", hex: "#0B3D2E" },
  { name: "Olive", hex: "#6B6B3A" },
  { name: "Mint", hex: "#A8D5BA" },

  // Blues
  { name: "Royal Blue", hex: "#1F3A93" },
  { name: "Navy", hex: "#1B2A4A" },
  { name: "Peacock Blue", hex: "#0C6B8C" },
  { name: "Teal", hex: "#117A86" },
  { name: "Sky Blue", hex: "#7CB7D6" },

  // Purples
  { name: "Royal Purple", hex: "#5B2C6F" },
  { name: "Lavender", hex: "#B79CCB" },
  { name: "Wine", hex: "#722F37" },

  // Neutrals & metallics
  { name: "Ivory", hex: "#F4ECD8" },
  { name: "Cream", hex: "#EFE6D2" },
  { name: "Beige", hex: "#D9C7A3" },
  { name: "Gold", hex: "#C9A227" },
  { name: "Antique Gold", hex: "#9A7B4F" },
  { name: "Copper", hex: "#A45A33" },
  { name: "Silver Grey", hex: "#B7B7B2" },
  { name: "Charcoal", hex: "#2C2C2C" },
  { name: "Black", hex: "#1A1A1A" },
  { name: "White", hex: "#FBFBF8" },
];

/** Validate a #RRGGBB hex string. */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/** Find the canonical palette entry that matches a hex (case-insensitive). */
export function findColorByHex(hex: string): SareeColor | undefined {
  if (!hex) return undefined;
  const normalized = hex.toLowerCase();
  return SAREE_COLORS.find((c) => c.hex.toLowerCase() === normalized);
}
