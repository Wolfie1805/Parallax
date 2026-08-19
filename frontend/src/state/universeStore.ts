import { create } from 'zustand'

export type UniverseType = 'satellite' | 'aircraft' | 'weather'

export interface SatelliteData {
  norad_id: string
  name: string
  lat: number
  lng: number
  altitude_km: number
}

export interface AircraftData {
  icao24: string
  callsign: string | null
  lat: number
  lng: number
  altitude: number | null
  velocity: number | null
  heading: number | null
  origin_country: string | null
}

export interface CityData {
  id?: number
  name: string
  city_name?: string
  state?: string
  country?: string
  lat: number
  lng: number
}

export interface SelectedEntity {
  type: UniverseType
  data: SatelliteData | AircraftData | (CityData & { temperature_c?: number; wind_speed_kmh?: number; condition?: string })
}

interface UniverseStore {
  activeUniverse: UniverseType
  satellites: SatelliteData[]
  aircraft: AircraftData[]
  cities: CityData[]
  selectedEntity: SelectedEntity | null
  wsConnected: boolean

  setActiveUniverse: (u: UniverseType) => void
  setSatellites: (data: SatelliteData[]) => void
  setAircraft: (data: AircraftData[]) => void
  setCities: (data: CityData[]) => void
  setSelectedEntity: (entity: SelectedEntity | null) => void
  setWsConnected: (connected: boolean) => void
}

export const useUniverseStore = create<UniverseStore>((set) => ({
  activeUniverse: 'satellite',
  satellites: [],
  aircraft: [],
  cities: [],
  selectedEntity: null,
  wsConnected: false,

  setActiveUniverse: (u) => set({ activeUniverse: u, selectedEntity: null }),
  setSatellites: (data) => set({ satellites: data }),
  setAircraft: (data) => set({ aircraft: data }),
  setCities: (data) => set({ cities: data }),
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
}))
