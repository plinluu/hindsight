import { useEffect, useState } from 'react'
import { useValue } from './data'
import { localSeason } from './season'

export function useLocalScene() {
  const place = useValue('place')
  const sky = useValue('sky')
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  const location = place ? JSON.parse(place) : null
  const savedSky = sky ? JSON.parse(sky) : null
  const forecast = place && savedSky?.place === place ? savedSky : null
  const detectedSeason = localSeason(now, location?.latitude, forecast?.zone ?? location?.timezone)
  return { now, forecast, detectedSeason, locationName: location?.name }
}
