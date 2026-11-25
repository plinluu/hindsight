export function season(month, latitude) {
  return ['winter', 'spring', 'summer', 'autumn'][
    (Math.floor(((month + 1) % 12) / 3) + (latitude < 0 ? 2 : 0)) % 4
  ]
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
