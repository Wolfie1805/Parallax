const fs = require('fs')
const path = require('path')

const GLOBE_RADIUS = 1.0
const PI = Math.PI

// Rich, saturated, high-contrast holographic palette
const PALETTE = [
  '#00e5ff', '#00e676', '#2979ff', '#7c4dff', '#ffab00', '#00bfa5',
  '#ff2a8d', '#00b0ff', '#651fff', '#1de9b6', '#ff9100', '#00e5ff'
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

// Ray-casting point-in-polygon test
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

function generateParticleData() {
  console.log('Loading countries.geojson...')
  const geoPath = path.join(__dirname, '../frontend/public/geo/countries.geojson')
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'))
  const features = geo.features
  console.log(`Loaded ${features.length} country features. Beginning sampling 60,000 particles for solid high-density landmass...`)

  const PARTICLE_COUNT = 60000
  const positions = []
  const colors = []

  let accepted = 0
  let attempts = 0

  while (accepted < PARTICLE_COUNT && attempts < 3500000) {
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

      const cosLat = Math.cos(latRad)
      const x = GLOBE_RADIUS * cosLat * Math.sin(lngRad)
      const y = GLOBE_RADIUS * Math.sin(latRad)
      const z = GLOBE_RADIUS * cosLat * Math.cos(lngRad)

      positions.push(Math.round(x * 10000) / 10000)
      positions.push(Math.round(y * 10000) / 10000)
      positions.push(Math.round(z * 10000) / 10000)

      colors.push(Math.round(rgb[0] * 1000) / 1000)
      colors.push(Math.round(rgb[1] * 1000) / 1000)
      colors.push(Math.round(rgb[2] * 1000) / 1000)

      accepted++
      if (accepted % 10000 === 0) {
        console.log(`Accepted ${accepted} / ${PARTICLE_COUNT} particles...`)
      }
    }
  }

  console.log(`Sampling complete: ${accepted} particles placed in ${attempts} attempts.`)

  const outputData = {
    count: accepted,
    positions,
    colors
  }

  const outPath = path.join(__dirname, '../frontend/src/geo/earthParticlesData.json')
  fs.writeFileSync(outPath, JSON.stringify(outputData))
  console.log(`Saved pre-sampled particle dataset to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)
}

generateParticleData()
