/**
 * countryColors.ts
 *
 * Rich, saturated, high-contrast holographic country palette.
 * Eliminates washed-out / whitish pastel shades so the Earth particle field
 * remains dark, sleek, and colorful, preventing satellite camouflage.
 */

const PALETTE: readonly string[] = [
  '#00e5ff', // Electric Cyan
  '#00e676', // Luminous Emerald
  '#2979ff', // Cobalt Azure
  '#7c4dff', // Deep Violet
  '#ffab00', // Deep Gold
  '#00bfa5', // Deep Teal
  '#ff2a8d', // Neon Magenta
  '#00b0ff', // Electric Blue
  '#651fff', // Royal Purple
  '#1de9b6', // Electric Mint
  '#ff9100', // Electric Amber
  '#00e5ff', // Vivid Cyan
] as const

function djb2(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
    h = h >>> 0
  }
  return h
}

export function getCountryColor(isoOrName: string): string {
  const idx = djb2(isoOrName) % PALETTE.length
  return PALETTE[idx]
}

export function getPalette(): readonly string[] {
  return PALETTE
}
