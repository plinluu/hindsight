import { type CSSProperties, useEffect, useState } from 'react'
import { useValue } from './data'
import { season, sunState, condition } from './season'
export default function Scene() {
  const place = useValue('place'),
    sky = useValue('sky'),
    seasonOverride = useValue('season'),
    lightOverride = useValue('daylight'),
    [tick, setTick] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  const p = place ? JSON.parse(place) : null,
    s = sky ? JSON.parse(sky) : null,
    valid = p && s && s.place === place
  const month = valid
    ? Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: s.zone }).format(tick)) - 1
    : new Date(tick).getMonth()
  const state = valid ? sunState(tick / 1000, s.rise, s.set) : undefined
  const which = seasonOverride && ['spring', 'summer', 'autumn', 'winter'].includes(seasonOverride)
    ? seasonOverride : season(month, p?.latitude ?? 1)
  const manualLight = lightOverride && ['day', 'sunset', 'night'].includes(lightOverride) ? lightOverride : null
  const light = manualLight ?? state ?? 'day'
  const weather = valid ? condition(s.code) : 'Clear'
  return (
    <div className="scene" aria-hidden="true" data-season={which} data-light={light} data-weather={weather}>
      {Array.from({ length: which === 'winter' ? 42 : 20 }, (_, i) => {
        const duration = (which === 'summer' ? 28 : 15) + (i * 7 % 13)
        const style = {
          left: ((i * 61.8) % 105 - 3) + '%',
          '--depth': 0.48 + (i * 11 % 17) / 25,
          '--tilt': (i * 47 % 180) + 'deg',
          '--duration': duration + 's',
          '--delay': -(i * 0.382 % 1) * duration + 's',
          '--still-y': (i * 37.2 % 100) + '%',
        } as CSSProperties
        return <span className="sky-particle" key={i} style={style} />
      })}
    </div>
  )
}
