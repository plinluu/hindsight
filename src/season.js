export function season(month, latitude) {
  return ['winter', 'spring', 'summer', 'autumn'][
    (Math.floor(((month + 1) % 12) / 3) + (latitude < 0 ? 2 : 0)) % 4
  ]
}
export function localSeason(now, latitude, timeZone) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) return null
  const month = new Intl.DateTimeFormat('en', { month: 'numeric', timeZone }).format(now)
  return season(Number(month) - 1, latitude)
}
const snowCodes = new Set([71, 73, 75, 77, 85, 86])

function wintryDay(daily, i) {
  const high = daily?.temperature_2m_max?.[i]
  return (Number.isFinite(high) && high <= 0) || daily?.snowfall_sum?.[i] > 0 ||
    snowCodes.has(daily?.weather_code?.[i])
}

export function winterLatch(now, location, zone, weather, previous) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location.longitude)) return null
  const lat = Number(location.latitude.toFixed(1))
  const lon = Number(location.longitude.toFixed(1))
  const longitudeDistance = Math.abs(lon - previous?.lon)
  const samePlace = Math.abs(lat - previous?.lat) <= 1 && Math.min(longitudeDistance, 360 - longitudeDistance) <= 1
  const month = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: zone }).format(now))
  const coldSeason = location.latitude < 0 ? month >= 4 && month <= 10 : month >= 10 || month <= 4
  const daily = weather?.daily
  const wasActive = samePlace && previous.active
  const warm = daily?.temperature_2m_max?.[7] >= 15 || weather?.current?.temperature_2m >= 15
  const snowy = snowCodes.has(weather?.current?.weather_code) ||
    Array.from({ length: 8 }, (_, i) => wintryDay(daily, i)).filter(Boolean).length >= 3
  const active = coldSeason && !warm && (wasActive || snowy)
  return { active, since: active ? (wasActive ? previous.since : now) : null,
    lat: wasActive && active ? previous.lat : lat, lon: wasActive && active ? previous.lon : lon }
}

export function sceneSeason(override, detected) {
  return ['spring', 'summer', 'autumn', 'winter'].includes(override) ? override : detected
}
export function sunState(now, rise, set) {
  if (!Number.isFinite(rise) || !Number.isFinite(set) || !Number.isFinite(now) || set <= rise) return undefined
  if (now < rise || now >= set) return 'night'
  return now >= Math.max(rise, set - 3600) ? 'sunset' : 'day'
}
export function condition(code) {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Fog'
  if (snowCodes.has(code)) return 'Snow'
  return code >= 95 ? 'Thunderstorms' : 'Rain'
}
