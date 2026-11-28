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
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
  )
  setPlace({
    latitude: Number(position.coords.latitude.toFixed(2)),
    longitude: Number(position.coords.longitude.toFixed(2)),
    name: 'Current location',
  })
}
