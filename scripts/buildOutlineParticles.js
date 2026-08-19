const fs = require('fs')
const path = require('path')

const GLOBE_RADIUS = 1.002
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

// Convert lat/lng to canonical 3D coordinates
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

// Linear interpolation between two 2D points [lng, lat]
function interpolateSegment(p1, p2, stepDeg = 0.25) {
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

function processRing(ring, rgb, positions, colors) {
  for (let i = 0; i < ring.length - 1; i++) {
    const segmentPts = interpolateSegment(ring[i], ring[i + 1], 0.2)
    for (let pt of segmentPts) {
      const coords = latLngToCoords(pt[1], pt[0])
      positions.push(coords[0], coords[1], coords[2])
      colors.push(rgb[0], rgb[1], rgb[2])
    }
  }
}

function generateOutlineData() {
  console.log('Loading countries.geojson for outline extraction...')
  const geoPath = path.join(__dirname, '../frontend/public/geo/countries.geojson')
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'))
  const features = geo.features
  console.log(`Loaded ${features.length} country features. Extracting country boundary outlines...`)

  const positions = []
  const colors = []

  features.forEach((feature) => {
    if (!feature.geometry) return
    const iso = feature.properties.ISO_A3
    const name = feature.properties.NAME || 'Unknown'
    const key = iso && iso !== '-99' ? iso : name
    const rgb = hexToRgb(getCountryColorHex(key))

    const type = feature.geometry.type
    const coords = feature.geometry.coordinates

    if (type === 'Polygon') {
      coords.forEach((ring) => processRing(ring, rgb, positions, colors))
    } else if (type === 'MultiPolygon') {
      coords.forEach((poly) => poly.forEach((ring) => processRing(ring, rgb, positions, colors)))
    }
  })

  const particleCount = positions.length / 3
  console.log(`Extraction complete: ${particleCount} outline particles generated for all country borders and coastlines.`)

  const outputData = {
    count: particleCount,
    positions,
    colors
  }

  const outPath = path.join(__dirname, '../frontend/src/geo/earthParticlesData.json')
  fs.writeFileSync(outPath, JSON.stringify(outputData))
  console.log(`Saved outline particle dataset to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)
}

generateOutlineData()
