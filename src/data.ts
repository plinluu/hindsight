import { useSyncExternalStore } from 'react'
import { listen, read, save } from './preferences'
export { read, save }
export function useValue(k: string) {
  return useSyncExternalStore(listen, () => read(k))
}
export type Place = { latitude: number; longitude: number; timezone?: string; name: string }
export function setPlace(p: Place) {
  save('place', JSON.stringify(p))
}
export async function json(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { signal: signal ?? AbortSignal.timeout(12000) })
  if (!r.ok) throw Error('Request failed')
  return r.json()
}
export async function locate() {
  try {
    const pos = await new Promise<GeolocationPosition>((ok, no) =>
      navigator.geolocation.getCurrentPosition(ok, no, { timeout: 10000 }),
    )
    setPlace({
      latitude: +pos.coords.latitude.toFixed(2),
      longitude: +pos.coords.longitude.toFixed(2),
      name: 'Current location',
    })
  } catch {
    const ip = await json('https://ipapi.co/json/')
    if (ip.error || !Number.isFinite(ip.latitude) || !Number.isFinite(ip.longitude)) throw Error('Choose your city below.')
    setPlace({ latitude: ip.latitude, longitude: ip.longitude, timezone: ip.timezone, name: ip.city })
  }
}
