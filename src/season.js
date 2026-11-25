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
export function winterWeatherReason(now, weather) {
  if (!weather?.current) return null
  const { time, weather_code, temperature_2m } = weather.current
  const seconds = now / 1000
  const fresh = time <= seconds && time >= seconds - 3600
  if (fresh && condition(weather_code) === 'Snow') return 'snow reported'
  if (fresh && Number.isFinite(temperature_2m) && temperature_2m <= 0) return 'freezing temperature'
  const recentSnow = weather.hourly?.time.some((hour, index) =>
    hour >= seconds - 86400 && hour <= Math.min(time, seconds) &&
    condition(weather.hourly.weather_code[index]) === 'Snow')
  return recentSnow ? 'snow in the past 24 hours' : null
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
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  return code >= 95 ? 'Thunderstorms' : 'Rain'
}
