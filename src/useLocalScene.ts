import { useEffect, useState } from 'react'
import { save, useValue } from './data'
import { localSeason, winterLatch } from './season'

export function useLocalScene() {
  const place = useValue('place')
  const weather = useValue('weather')
  const storedLatch = useValue('hindsight.winterLatch')
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
  const zone = forecast?.zone ?? location?.timezone
  const report = entry && entry.place === place && now - entry.at < 600000 ? entry.payload : null
  const latch = winterLatch(now, location, zone, report, storedLatch ? JSON.parse(storedLatch) : null)
  const serialized = latch ? JSON.stringify(latch) : null
  useEffect(() => { save('hindsight.winterLatch', serialized) }, [serialized])
  const reason = latch?.active ? 'recent winter weather' : null
  const detectedSeason = reason ? 'winter' : localSeason(now, location?.latitude, zone)
  return { now, forecast, detectedSeason, reason, locationName: location?.name }
}
