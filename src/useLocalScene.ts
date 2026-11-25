import { useEffect, useState } from 'react'
import { useValue } from './data'
import { localSeason, winterWeatherReason } from './season'

export function useLocalScene() {
  const place = useValue('place')
  const weather = useValue('weather')
  const sky = useValue('sky')
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  const location = place ? JSON.parse(place) : null
  const savedSky = sky ? JSON.parse(sky) : null
  const forecast = place && savedSky?.place === place ? savedSky : null
  const entry = weather ? JSON.parse(weather) : null
  const reason = place && entry?.place === place ? winterWeatherReason(now, entry.payload) : null
  const detectedSeason = reason ? 'winter' : localSeason(now, location?.latitude, forecast?.zone ?? location?.timezone)
  return { now, forecast, detectedSeason, reason, locationName: location?.name }
}
