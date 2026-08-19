const fs = require('fs')
const path = require('path')

const GLOBE_RADIUS = 1.0
const PI = Math.PI

// 64-color high-contrast holographic palette
const PALETTE = [
  '#00e5ff', '#00e676', '#2979ff', '#7c4dff', '#ffab00', '#00bfa5',
  '#ff2a8d', '#00b0ff', '#651fff', '#1de9b6', '#ff9100', '#40c4ff',
  '#69f0ae', '#b39ddb', '#ffd740', '#448aff', '#1de9b6', '#ff4081',
  '#00e5ff', '#76ff03', '#80d8ff', '#9575cd', '#ffe082', '#00e676'
]

function djb2(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
    h = h >>> 0
  }
  return h
}

function getCountryColorHex(isoOrName) {
  const idx = djb2(isoOrName) % PALETTE.length
  return PALETTE[idx]
}

function hexToRgb(hex) {
  const num = parseInt(hex.replace('#', ''), 16)
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255]
}

function latLngToCoords(lat, lng, r = GLOBE_RADIUS) {
  const latRad = (lat * PI) / 180
  const lngRad = (lng * PI) / 180
  const cosLat = Math.cos(latRad)
  return [
    Math.round(r * cosLat * Math.sin(lngRad) * 10000) / 10000,
    Math.round(r * Math.sin(latRad) * 10000) / 10000,
    Math.round(r * cosLat * Math.cos(lngRad) * 10000) / 10000
  ]
}

// Point in polygon test
function pointInRing(pt, ring) {
  const x = pt[0], y = pt[1]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function pointInPolygon(pt, polygon) {
  if (!pointInRing(pt, polygon[0])) return false
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(pt, polygon[i])) return false
  }
  return true
}

function pointInFeature(pt, feature) {
  if (!feature.geometry) return false
  const type = feature.geometry.type
  const coords = feature.geometry.coordinates
  if (type === 'Polygon') {
    return pointInPolygon(pt, coords)
  } else if (type === 'MultiPolygon') {
    for (let i = 0; i < coords.length; i++) {
      if (pointInPolygon(pt, coords[i])) return true
    }
  }
  return false
}

function interpolateSegment(p1, p2, stepDeg = 0.22) {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const dist = Math.sqrt(dx * dx + dy * dy)
  const steps = Math.max(1, Math.ceil(dist / stepDeg))
  const pts = []
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    pts.push([p1[0] + dx * t, p1[1] + dy * t])
  }
  return pts
}

function generateLandmassParticles() {
  console.log('Loading countries.geojson for full landmass & coastline particle sampling...')
  const geoPath = path.join(__dirname, '../frontend/public/geo/countries.geojson')
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'))
  const features = geo.features

  const positions = []
  const colors = []
  const densities = [] // 1.0 = dense coastline, 0.4 = interior fill

  // 1. Coastlines & Borders (Dense, Bright, High Density = 1.0)
  features.forEach((feature) => {
    if (!feature.geometry) return
    const iso = feature.properties.ISO_A3
    const name = feature.properties.NAME || 'Unknown'
    const key = iso && iso !== '-99' ? iso : name
    const rgb = hexToRgb(getCountryColorHex(key))

    const type = feature.geometry.type
    const coords = feature.geometry.coordinates

    const processRing = (ring) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const seg = interpolateSegment(ring[i], ring[i + 1], 0.22)
        for (let pt of seg) {
          const c = latLngToCoords(pt[1], pt[0], 1.002)
          positions.push(c[0], c[1], c[2])
          colors.push(rgb[0], rgb[1], rgb[2])
          densities.push(1.0) // Coastline tag
        }
      }
    }

    if (type === 'Polygon') coords.forEach(processRing)
    else if (type === 'MultiPolygon') coords.forEach((poly) => poly.forEach(processRing))
  })

  console.log(`Coastline particles generated: ${positions.length / 3}. Generating interior land fill...`)

  // 2. Interior Landmass Fill (Sparser, Dimmer, Density = 0.45)
  const INTERIOR_COUNT = 25000
  let accepted = 0
  let attempts = 0

  while (accepted < INTERIOR_COUNT && attempts < 1500000) {
    attempts++
    const u = Math.random()
    const v = Math.random()
    const latRad = Math.asin(2 * u - 1)
    const lngRad = (v * 2 - 1) * PI

    const lat = (latRad * 180) / PI
    const lng = (lngRad * 180) / PI
    const pt = [lng, lat]

    let foundFeature = null
    for (let f of features) {
      if (pointInFeature(pt, f)) {
        foundFeature = f
        break
      }
    }

    if (foundFeature) {
      const iso = foundFeature.properties.ISO_A3
      const name = foundFeature.properties.NAME || 'Unknown'
      const key = iso && iso !== '-99' ? iso : name
      const rgb = hexToRgb(getCountryColorHex(key))

      const c = latLngToCoords(lat, lng, 1.0)
      positions.push(c[0], c[1], c[2])
      // Slightly dim interior fill colors
      colors.push(rgb[0] * 0.75, rgb[1] * 0.75, rgb[2] * 0.75)
      densities.push(0.45) // Interior fill tag
      accepted++
    }
  }

  const totalCount = positions.length / 3
  console.log(`Total particles: ${totalCount} (${accepted} interior land fill points). Saving dataset...`)

  const outputData = {
    count: totalCount,
    positions,
    colors,
    densities
  }

  const outPath = path.join(__dirname, '../frontend/src/geo/earthParticlesData.json')
  fs.writeFileSync(outPath, JSON.stringify(outputData))
  console.log(`Saved landmass particle dataset to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)
}

generateLandmassParticles()
