import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUniverseStore } from '../state/universeStore'
import type { UniverseType } from '../state/universeStore'
import { getSatelliteCategoryInfo } from '../universes/SatelliteUniverse'

function useEffectWindowWidthMobile(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return [isMobile, setIsMobile]
}

const THEMES: Record<UniverseType, {
  accent: string
  glow: string
  label: string
}> = {
  satellite: {
    accent: '#00e5ff',
    glow: 'rgba(0, 229, 255, 0.4)',
    label: 'SATELLITE TELEMETRY',
  },
  aircraft: {
    accent: '#00b0ff',
    glow: 'rgba(0, 176, 255, 0.4)',
    label: 'AIRCRAFT STATE VECTOR',
  },
  weather: {
    accent: '#00e676',
    glow: 'rgba(0, 230, 118, 0.4)',
    label: 'ATMOSPHERIC NODE',
  },
}

// Particle-built Weather Icon Shape Component
function ParticleWeatherIcon({ condition }: { condition?: string }) {
  const cond = (condition || '').toLowerCase()
  let symbol = '☀️'
  if (cond.includes('cloud')) symbol = '⛅'
  if (cond.includes('rain') || cond.includes('drizzle')) symbol = '🌧️'
  if (cond.includes('snow')) symbol = '❄️'
  if (cond.includes('thunder') || cond.includes('storm')) symbol = '🌩️'
  if (cond.includes('fog')) symbol = '🌫️'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgba(0, 230, 118, 0.12)',
        border: '1px solid rgba(0, 230, 118, 0.4)',
        fontSize: 22,
        boxShadow: '0 0 16px rgba(0, 230, 118, 0.3)',
      }}
    >
      {symbol}
    </div>
  )
}

// ── Airline ICAO prefix → name lookup (top 120 ICAO designators) ─────────────
function getAirlineInfo(callsign: string | null): { airline: string; type: string } {
  if (!callsign) return { airline: 'Unregistered / Private Flight', type: 'General Aviation' }
  const cs = callsign.trim().toUpperCase()
  const prefix3 = cs.slice(0, 3)
  const prefix2 = cs.slice(0, 2)

  const AIRLINES: Record<string, [string, string]> = {
    // 3-letter ICAO designators
    AAL: ['American Airlines', 'Commercial Airline'],
    UAL: ['United Airlines', 'Commercial Airline'],
    DAL: ['Delta Air Lines', 'Commercial Airline'],
    SWA: ['Southwest Airlines', 'Low-Cost Carrier'],
    BAW: ['British Airways', 'Commercial Airline'],
    DLH: ['Lufthansa', 'Commercial Airline'],
    AFR: ['Air France', 'Commercial Airline'],
    KLM: ['KLM Royal Dutch Airlines', 'Commercial Airline'],
    UAE: ['Emirates', 'Commercial Airline'],
    ETH: ['Ethiopian Airlines', 'Commercial Airline'],
    QFA: ['Qantas', 'Commercial Airline'],
    SIA: ['Singapore Airlines', 'Commercial Airline'],
    THY: ['Turkish Airlines', 'Commercial Airline'],
    AIC: ['Air India', 'Commercial Airline'],
    CCA: ['Air China', 'Commercial Airline'],
    CSN: ['China Southern Airlines', 'Commercial Airline'],
    CES: ['China Eastern Airlines', 'Commercial Airline'],
    JAL: ['Japan Airlines', 'Commercial Airline'],
    ANA: ['All Nippon Airways', 'Commercial Airline'],
    KAL: ['Korean Air', 'Commercial Airline'],
    AAR: ['Asiana Airlines', 'Commercial Airline'],
    VIR: ['Virgin Atlantic', 'Commercial Airline'],
    RYR: ['Ryanair', 'Low-Cost Carrier'],
    EZY: ['easyJet', 'Low-Cost Carrier'],
    WZZ: ['Wizz Air', 'Low-Cost Carrier'],
    IBE: ['Iberia', 'Commercial Airline'],
    VUE: ['Vueling', 'Low-Cost Carrier'],
    ELY: ['El Al Israel Airlines', 'Commercial Airline'],
    MSR: ['EgyptAir', 'Commercial Airline'],
    ETD: ['Etihad Airways', 'Commercial Airline'],
    QTR: ['Qatar Airways', 'Commercial Airline'],
    GFA: ['Gulf Air', 'Commercial Airline'],
    SVA: ['Saudi Arabian Airlines (Saudia)', 'Commercial Airline'],
    RAM: ['Royal Air Maroc', 'Commercial Airline'],
    KQA: ['Kenya Airways', 'Commercial Airline'],
    SAA: ['South African Airways', 'Commercial Airline'],
    TAM: ['LATAM Brasil', 'Commercial Airline'],
    LAN: ['LATAM Airlines', 'Commercial Airline'],
    AVA: ['Avianca', 'Commercial Airline'],
    GLO: ['Gol Linhas Aéreas', 'Low-Cost Carrier'],
    AZU: ['Azul Brazilian Airlines', 'Low-Cost Carrier'],
    AAB: ['Thomas Cook Airlines', 'Charter Airline'],
    TOM: ['TUI Airways', 'Charter Airline'],
    MXD: ['Mexicana', 'Commercial Airline'],
    VOI: ['Volaris', 'Low-Cost Carrier'],
    SKW: ['SkyWest Airlines', 'Regional Carrier'],
    EDV: ['Endeavor Air (Delta Connection)', 'Regional Carrier'],
    JBU: ['JetBlue Airways', 'Low-Cost Carrier'],
    ASA: ['Alaska Airlines', 'Commercial Airline'],
    HAL: ['Hawaiian Airlines', 'Commercial Airline'],
    FDX: ['FedEx Express', 'Cargo / Freighter'],
    UPS: ['UPS Airlines', 'Cargo / Freighter'],
    CLX: ['Cargolux', 'Cargo / Freighter'],
    DHL: ['DHL Aviation', 'Cargo / Freighter'],
    GTI: ['Atlas Air', 'Cargo / Freighter'],
    POL: ['Polar Air Cargo', 'Cargo / Freighter'],
    ABX: ['ABX Air', 'Cargo / Freighter'],
    SXS: ['Swissair (historic)', 'Commercial Airline'],
    SWR: ['Swiss International Air Lines', 'Commercial Airline'],
    AUA: ['Austrian Airlines', 'Commercial Airline'],
    BEL: ['Brussels Airlines', 'Commercial Airline'],
    TAP: ['TAP Air Portugal', 'Commercial Airline'],
    LOT: ['LOT Polish Airlines', 'Commercial Airline'],
    CSA: ['Czech Airlines', 'Commercial Airline'],
    ROT: ['TAROM Romanian Air Transport', 'Commercial Airline'],
    AFL: ['Aeroflot', 'Commercial Airline'],
    SBI: ['S7 Airlines (Siberia)', 'Commercial Airline'],
    SDM: ['Rossiya Airlines', 'Commercial Airline'],
    FIN: ['Finnair', 'Commercial Airline'],
    SAS: ['Scandinavian Airlines', 'Commercial Airline'],
    NOR: ['Norwegian Air Shuttle', 'Low-Cost Carrier'],
    ICE: ['Icelandair', 'Commercial Airline'],
    AEE: ['Aegean Airlines', 'Commercial Airline'],
    OAL: ['Olympic Air', 'Commercial Airline'],
    AZA: ['Alitalia (historic)', 'Commercial Airline'],
    ITY: ['ITA Airways', 'Commercial Airline'],
    CAI: ['Corendon Airlines', 'Charter Airline'],
    PGT: ['Pegasus Airlines', 'Low-Cost Carrier'],
    SHY: ['SunExpress', 'Low-Cost Carrier'],
    MGL: ['MIAT Mongolian Airlines', 'Commercial Airline'],
    VNL: ['Vietnam Airlines', 'Commercial Airline'],
    PAL: ['Philippine Airlines', 'Commercial Airline'],
    MAS: ['Malaysia Airlines', 'Commercial Airline'],
    SJX: ['Scoot', 'Low-Cost Carrier'],
    THA: ['Thai Airways International', 'Commercial Airline'],
    BAV: ['Bamboo Airways', 'Commercial Airline'],
    VJC: ['VietJet Air', 'Low-Cost Carrier'],
    AIQ: ['AirAsia X', 'Low-Cost Carrier'],
    AXM: ['AirAsia', 'Low-Cost Carrier'],
    IGO: ['IndiGo', 'Low-Cost Carrier'],
    GOW: ['Go First (formerly GoAir)', 'Low-Cost Carrier'],
    SEJ: ['SpiceJet', 'Low-Cost Carrier'],
    JAI: ['Air India Express', 'Low-Cost Carrier'],
    GAP: ['Garuda Indonesia', 'Commercial Airline'],
    BKP: ['Batik Air', 'Commercial Airline'],
    IDA: ['Lion Air', 'Low-Cost Carrier'],
    CEB: ['Cebu Pacific', 'Low-Cost Carrier'],
    PDT: ['Horizon Air', 'Regional Carrier'],
    ENY: ['Envoy Air', 'Regional Carrier'],
    RPA: ['Republic Airways', 'Regional Carrier'],
    UCA: ['CommutAir', 'Regional Carrier'],
    CPZ: ['Compass Airlines', 'Regional Carrier'],
    CHQ: ['Cape Air', 'Regional Carrier'],
    ROU: ['Edelweiss Air', 'Charter Airline'],
    AMC: ['Air Malta', 'Commercial Airline'],
    LAA: ['Libyan Airlines', 'Commercial Airline'],
    MSE: ['Aeroméxico Connect', 'Regional Carrier'],
    AMX: ['Aeroméxico', 'Commercial Airline'],
  }

  if (AIRLINES[prefix3]) {
    const [airline, type] = AIRLINES[prefix3]
    return { airline, type }
  }

  // Fallback: military / government prefix heuristics
  if (/^(RCH|CNV|SAM|AF|REACH|EVAC|DUKE|JAKE)/.test(cs)) {
    return { airline: 'U.S. Military / Government', type: 'Military / State Flight' }
  }
  if (/^(RFF|RFR|RAF|NATO|NATA)/.test(cs)) {
    return { airline: 'Military / Government', type: 'Military / State Flight' }
  }
  if (/^\d{3,}/.test(cs)) {
    return { airline: 'Private / Charter Flight', type: 'General Aviation' }
  }

  // Try 2-letter ICAO prefix as last resort
  const AIRLINES2: Record<string, [string, string]> = {
    AA: ['American Airlines', 'Commercial Airline'],
    UA: ['United Airlines', 'Commercial Airline'],
    DL: ['Delta Air Lines', 'Commercial Airline'],
    WN: ['Southwest Airlines', 'Low-Cost Carrier'],
    BA: ['British Airways', 'Commercial Airline'],
    LH: ['Lufthansa', 'Commercial Airline'],
    AF: ['Air France', 'Commercial Airline'],
    KL: ['KLM', 'Commercial Airline'],
    EK: ['Emirates', 'Commercial Airline'],
    QF: ['Qantas', 'Commercial Airline'],
    SQ: ['Singapore Airlines', 'Commercial Airline'],
    TK: ['Turkish Airlines', 'Commercial Airline'],
    AI: ['Air India', 'Commercial Airline'],
    CA: ['Air China', 'Commercial Airline'],
    FR: ['Ryanair', 'Low-Cost Carrier'],
    U2: ['easyJet', 'Low-Cost Carrier'],
    QR: ['Qatar Airways', 'Commercial Airline'],
    EY: ['Etihad Airways', 'Commercial Airline'],
  }
  if (AIRLINES2[prefix2]) {
    const [airline, type] = AIRLINES2[prefix2]
    return { airline, type }
  }

  return { airline: `Flight ${cs}`, type: 'Commercial / Unverified Callsign' }
}

function getFlightPhase(altMeters: number | null, velocityMs: number | null): string {
  const alt = altMeters ?? 0
  const spd = velocityMs ?? 0
  if (alt < 300 && spd < 50) return '🛬 On Ground / Taxiing'
  if (alt < 1500) return '🛫 Departing / Approach'
  if (alt < 5000) return '📈 Climbing'
  if (alt >= 9000 && spd > 180) return '✈ Cruising at Altitude'
  if (alt < 9000 && spd < 150) return '📉 Descending'
  return '✈ En Route'
}

function SatelliteFields({ data }: { data: any }) {
  const catInfo = getSatelliteCategoryInfo(data.name, data.norad_id)

  return (
    <>
      <Field label="Name" value={data.name} />
      <Field label="NORAD ID" value={data.norad_id} />
      <Field label="Category" value={catInfo.category} accent={catInfo.color} />
      <Field label="Mission" value={catInfo.description} highlight />
      <Field label="Altitude" value={`${data.altitude_km?.toFixed(1) ?? '—'} km`} />
      <Field label="Position" value={`${data.lat?.toFixed(2)}°, ${data.lng?.toFixed(2)}°`} />
    </>
  )
}

function AircraftFields({ data }: { data: any }) {
  const { airline, type } = getAirlineInfo(data.callsign)
  const phase = getFlightPhase(data.altitude, data.velocity)
  const altKm = data.altitude != null ? (data.altitude / 1000).toFixed(1) : null
  const altFt = data.altitude != null ? Math.round(data.altitude * 3.28084) : null

  return (
    <>
      <Field label="Callsign" value={data.callsign || 'No Callsign Broadcast'} />
      <Field label="Airline / Operator" value={airline} accent="#00b0ff" />
      <Field label="Flight Type" value={type} />
      <Field label="Origin Country" value={data.origin_country ?? '—'} />
      <Field label="Flight Phase" value={phase} highlight />
      <Field
        label="Altitude"
        value={altKm ? `${altKm} km  (${altFt?.toLocaleString()} ft)` : '—'}
      />
      <Field label="Airspeed" value={data.velocity != null ? `${(data.velocity * 3.6).toFixed(0)} km/h  (${(data.velocity * 1.944).toFixed(0)} kts)` : '—'} />
      <Field label="Heading" value={data.heading != null ? `${data.heading.toFixed(0)}° (${headingToCompass(data.heading)})` : '—'} />
      <Field label="ICAO24 Hex" value={data.icao24 ?? '—'} />
    </>
  )
}

function headingToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16]
}

function WeatherFields({ data }: { data: any }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Field label="Location" value={data.city_name ?? data.name} />
          {data.country && <div style={{ fontSize: 11, color: '#80deea', marginTop: -6, marginBottom: 8 }}>{data.country}</div>}
        </div>
        <ParticleWeatherIcon condition={data.condition} />
      </div>
      <Field label="Temperature" value={data.temperature_c != null ? `${data.temperature_c}°C` : '—'} accent="#ffd740" />
      <Field label="Condition" value={data.condition ?? '—'} />
      <Field label="Wind Speed" value={data.wind_speed_kmh != null ? `${data.wind_speed_kmh} km/h` : '—'} />
      {data.lat != null && data.lng != null && (
        <Field label="Coordinates" value={`${Math.abs(data.lat)}°${data.lat >= 0 ? 'N' : 'S'}, ${Math.abs(data.lng)}°${data.lng >= 0 ? 'E' : 'W'}`} />
      )}
    </>
  )
}

function Field({ label, value, accent, highlight }: { label: string; value: string; accent?: string; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: highlight ? 12 : 13,
          fontWeight: 600,
          color: accent || (highlight ? '#80deea' : '#e8eaf6'),
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function DetailCard() {
  const selectedEntity = useUniverseStore((s) => s.selectedEntity)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)

  const [isMobile, setIsMobile] = useEffectWindowWidthMobile()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEntity(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSelectedEntity])

  const card = selectedEntity ? (
    () => {
      const { type, data } = selectedEntity
      const theme = THEMES[type]

      return (
        <motion.div
          key={type + JSON.stringify((data as any).norad_id ?? (data as any).icao24 ?? (data as any).id)}
          initial={isMobile ? { opacity: 0, y: 80 } : { opacity: 0, x: 60, scale: 0.95 }}
          animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0, scale: 1 }}
          exit={isMobile ? { opacity: 0, y: 80 } : { opacity: 0, x: 60, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={
            isMobile
              ? {
                  position: 'fixed',
                  bottom: 'max(12px, env(safe-area-inset-bottom))',
                  left: 12,
                  right: 12,
                  width: 'auto',
                  maxHeight: '65vh',
                  background: 'rgba(8, 14, 28, 0.95)',
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 16,
                  boxShadow: `0 -4px 32px ${theme.glow}`,
                  padding: '16px 18px',
                  backdropFilter: 'blur(20px)',
                  color: '#c5cae9',
                  fontFamily: '"JetBrains Mono", monospace',
                  zIndex: 9999,
                  userSelect: 'none',
                  overflowY: 'auto',
                }
              : {
                  position: 'fixed',
                  top: '50%',
                  right: 32,
                  transform: 'translateY(-50%)',
                  width: 300,
                  maxHeight: '80vh',
                  background: 'rgba(8, 14, 28, 0.92)',
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 12,
                  boxShadow: `0 0 32px ${theme.glow}, 0 0 0 1px ${theme.accent}22`,
                  padding: '22px 24px',
                  backdropFilter: 'blur(20px)',
                  color: '#c5cae9',
                  fontFamily: '"JetBrains Mono", monospace',
                  zIndex: 9999,
                  userSelect: 'none',
                  overflowY: 'auto',
                }
          }
        >
          {/* Scan-Line Sweep Reveal Effect */}
          <motion.div
            initial={{ top: '-100%' }}
            animate={{ top: '200%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '40%',
              background: `linear-gradient(180deg, transparent 0%, ${theme.accent}22 50%, transparent 100%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 9, letterSpacing: 2.2, color: theme.accent, fontWeight: 700 }}>
              {theme.label}
            </span>
            <button
              onClick={() => setSelectedEntity(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7986cb',
                fontSize: 18,
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg, ${theme.accent}, transparent)`, marginBottom: 16 }} />

          {type === 'satellite' && <SatelliteFields data={data} />}
          {type === 'aircraft' && <AircraftFields data={data} />}
          {type === 'weather' && <WeatherFields data={data} />}
        </motion.div>
      )
    }
  ) : null

  return ReactDOM.createPortal(
    <AnimatePresence>
      {card && card()}
    </AnimatePresence>,
    document.body
  )
}
