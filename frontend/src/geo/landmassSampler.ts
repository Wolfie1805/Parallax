/**
 * landmassSampler.ts
 *
 * Converts a GeoJSON FeatureCollection of country polygons into a compact
 * BufferGeometry-ready particle dataset.
 *
 * Algorithm:
 *   1. Draw every country onto an offscreen canvas using encoded index colors
 *      (country index+1 encoded in R+G channels, ocean = black).
 *   2. Rejection-sample pixels from the canvas:
 *      - Skip ocean pixels (r=0 and g=0)
 *      - Apply cosine-latitude weighting so the sphere surface is sampled
 *        uniformly (equirectangular canvas over-represents polar regions)
 *   3. Convert each accepted canvas pixel to a 3D point on the unit sphere
 *      using the canonical lat/lng → THREE.Vector3 conversion.
 *   4. Assign each particle the holographic color for its country.
 *
 * The sampled data is returned as compact Float32Arrays ready to be uploaded
 * directly to a THREE.BufferGeometry. The canvas is discarded after sampling.
 *
 * Coordinate convention (canonical, shared with all other modules):
 *   x = R * cos(lat) * sin(lng)
 *   y = R * sin(lat)
 *   z = R * cos(lat) * cos(lng)
 */

import * as THREE from 'three'
import { getCountryColor } from './countryColors'

// Offscreen canvas resolution for the country lookup texture.
// Higher = better geographic accuracy, but slower to draw/read.
// 2048×1024 gives ~0.18° per pixel — accurate enough for 20k particles.
const LUT_W = 2048
const LUT_H = 1024

// Earth radius used by the canonical coordinate system
const GLOBE_RADIUS = 1.0

// ── GeoJSON type helpers ────────────────────────────────────────────────────
type Ring = number[][]       // [[lng, lat], …]
type Polygon = Ring[]        // [exteriorRing, …holeRings]
type MultiPolygon = Polygon[]

interface GeoFeature {
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: Polygon | MultiPolygon
  } | null
  properties: Record<string, string | number | null>
}

interface GeoFeatureCollection {
  features: GeoFeature[]
}

export interface EarthParticles {
  /** Flat array: [x0,y0,z0, x1,y1,z1, …] — one unit-sphere position per particle */
  positions: Float32Array
  /** Flat array: [r0,g0,b0, r1,g1,b1, …] — country color per particle (0–1 range) */
  colors: Float32Array
  /** Number of particles successfully placed */
  count: number
}

// ── Canvas drawing helpers ──────────────────────────────────────────────────

/** Converts a geographic [lng, lat] pair to canvas pixel coordinates. */
function lngLatToXY(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * LUT_W
  const y = ((90 - lat) / 180) * LUT_H
  return [x, y]
}

/** Appends a single polygon ring to the current canvas path. */
function traceRing(ctx: CanvasRenderingContext2D, ring: Ring): void {
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i]
    const [x, y] = lngLatToXY(lng, lat)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/**
 * Draws a GeoJSON feature (Polygon or MultiPolygon) filled with `fillStyle`.
 * Uses the even-odd winding rule so polygon holes are correctly excluded.
 */
function drawFeature(
  ctx: CanvasRenderingContext2D,
  feature: GeoFeature,
  fillStyle: string
): void {
  if (!feature.geometry) return
  ctx.fillStyle = fillStyle
  ctx.beginPath()

  const { type, coordinates } = feature.geometry

  if (type === 'Polygon') {
    const rings = coordinates as Polygon
    rings.forEach((ring) => traceRing(ctx, ring))
  } else if (type === 'MultiPolygon') {
    const polys = coordinates as MultiPolygon
    polys.forEach((poly) => poly.forEach((ring) => traceRing(ctx, ring)))
  }

  ctx.fill('evenodd')
}

// ── Main sampler ────────────────────────────────────────────────────────────

/**
 * Samples `particleCount` geographically accurate land particles from a
 * country-level GeoJSON FeatureCollection.
 *
 * @param geoJson        Natural Earth (or equivalent) country FeatureCollection
 * @param particleCount  Number of land particles to generate (default 20 000)
 * @returns              `EarthParticles` with positions, colors, and count
 */
export async function sampleEarthParticles(
  geoJson: GeoFeatureCollection,
  particleCount = 20_000
): Promise<EarthParticles> {
  const features = geoJson.features

  // ── Step 1: Build offscreen lookup canvas ─────────────────────────────────
  //
  // Each country is rasterized with a unique, losslessly recoverable color:
  //   encodedValue = featureIndex + 1   (1-based; 0 = ocean)
  //   r = encodedValue & 0xff
  //   g = (encodedValue >> 8) & 0xff
  //   b = 0
  //
  // This safely encodes up to 65 535 countries.

  const canvas = document.createElement('canvas')
  canvas.width = LUT_W
  canvas.height = LUT_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = false

  // Ocean background: pure black (r=0, g=0, b=0)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, LUT_W, LUT_H)

  // Draw each country
  features.forEach((feature, idx) => {
    const enc = idx + 1                     // 1-based
    const r   = enc & 0xff
    const g   = (enc >> 8) & 0xff
    drawFeature(ctx, feature, `rgb(${r},${g},0)`)
  })

  // ── Step 2: Read rasterized pixels ───────────────────────────────────────
  const imageData = ctx.getImageData(0, 0, LUT_W, LUT_H)
  const pixels = imageData.data             // Uint8ClampedArray [R,G,B,A, …]

  // ── Step 3: Rejection-sample land particles ───────────────────────────────
  const positions   = new Float32Array(particleCount * 3)
  const colors      = new Float32Array(particleCount * 3)
  const tmpColor    = new THREE.Color()

  let accepted  = 0
  let attempts  = 0
  const MAX_ATTEMPTS = particleCount * 40   // upper bound (~40× expected for poles)
  const PI = Math.PI

  while (accepted < particleCount && attempts < MAX_ATTEMPTS) {
    attempts++

    // Random pixel in the equirectangular canvas
    const px = Math.floor(Math.random() * LUT_W)
    const py = Math.floor(Math.random() * LUT_H)

    // ── Cosine-latitude rejection ────────────────────────────────────────
    // An equirectangular pixel at latitude φ represents a sphere patch of
    // area ∝ cos(φ).  We must reject high-latitude pixels with probability
    // proportional to (1 − cos(φ)) so the final sample is uniform on the
    // sphere surface.
    const lat = 90 - (py / LUT_H) * 180   // degrees, −90…90
    const cosW = Math.abs(Math.cos((lat * PI) / 180))
    if (Math.random() > cosW + 0.04) continue   // +0.04 keeps sparse polar land

    // ── Ocean / invalid pixel check ──────────────────────────────────────
    const i4 = (py * LUT_W + px) * 4
    const r  = pixels[i4]
    const g  = pixels[i4 + 1]
    if (r === 0 && g === 0) continue            // ocean

    const enc        = r | (g << 8)
    const countryIdx = enc - 1
    if (countryIdx < 0 || countryIdx >= features.length) continue

    // ── Convert to 3D unit-sphere position ───────────────────────────────
    // Add sub-pixel jitter so neighboring particles don't stack on exact
    // pixel-center positions.
    const lng      = ((px + Math.random()) / LUT_W) * 360 - 180
    const latFinal = 90 - ((py + Math.random()) / LUT_H) * 180

    const latRad = (latFinal * PI) / 180
    const lngRad = (lng      * PI) / 180
    const cosLat = Math.cos(latRad)

    positions[accepted * 3 + 0] = GLOBE_RADIUS * cosLat * Math.sin(lngRad)
    positions[accepted * 3 + 1] = GLOBE_RADIUS * Math.sin(latRad)
    positions[accepted * 3 + 2] = GLOBE_RADIUS * cosLat * Math.cos(lngRad)

    // ── Assign country color ──────────────────────────────────────────────
    const feature = features[countryIdx]
    const iso     = feature?.properties?.ISO_A3 as string | null
    const name    = (feature?.properties?.NAME ?? `IDX_${countryIdx}`) as string
    const key     = iso && iso !== '-99' ? iso : name

    tmpColor.set(getCountryColor(key))
    colors[accepted * 3 + 0] = tmpColor.r
    colors[accepted * 3 + 1] = tmpColor.g
    colors[accepted * 3 + 2] = tmpColor.b

    accepted++
  }

  const finalCount = accepted

  // If we couldn't fill all slots (very edge case at extreme polar bias),
  // return sliced arrays so the geometry doesn't have stale zeros at the end.
  const finalPositions = finalCount === particleCount
    ? positions
    : positions.slice(0, finalCount * 3)
  const finalColors = finalCount === particleCount
    ? colors
    : colors.slice(0, finalCount * 3)

  // Release the temporary canvas
  canvas.width = 0
  canvas.height = 0

  console.info(
    `[landmassSampler] ${finalCount}/${particleCount} particles placed ` +
    `(${attempts} attempts, efficiency ${((finalCount / attempts) * 100).toFixed(1)}%)`
  )

  return { positions: finalPositions, colors: finalColors, count: finalCount }
}
