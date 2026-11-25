import { useEffect, useState } from 'react'
import { useValue } from './data'
import { season, sunState, condition } from './season'
export default function Scene() {
  const place = useValue('place'),
    sky = useValue('sky'),
    seasonOverride = useValue('season'),
    lightOverride = useValue('daylight'),
    [tick, setTick] = useState(Date.now()),
    [shown, show] = useState(''),
    [old, previous] = useState('')
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
  const url = (v: string) => import.meta.env.BASE_URL + 'assets/bg/' + which + '-' + v + '.webp'
  const src = url(light),
    next = manualLight ? null : url(light === 'day' ? 'sunset' : light === 'sunset' ? 'night' : 'day')
  useEffect(() => {
    let active = true
    const img = new Image()
    img.onload = () => {
      if (active) {
        show(src)
        if (next) {
          const preload = new Image()
          preload.src = next
        }
      }
    }
    img.src = src
    return () => {
      active = false
    }
  }, [src, next])
  useEffect(() => {
    const timer = setTimeout(() => previous(shown), 700)
    return () => clearTimeout(timer)
  }, [shown])
  useEffect(() => {
    document.documentElement.dataset.sun = state ?? 'unknown'
    document.documentElement.dataset.season = which
  }, [state, which])
  return (
    <div
      aria-hidden="true"
      className="scene"
      style={{ backgroundImage: old ? 'url(' + old + ')' : undefined }}
    >
      {shown && (
        <div
          key={shown}
          style={{
            backgroundImage: 'url(' + shown + ')',
            
          }}
        />
      )}
      <i
        style={{
          background: weather === 'Snow' ? '#d1e5f530' : weather === 'Cloudy' || weather === 'Fog' ? '#80889732' : weather === 'Clear' ? 'transparent' : '#344f7244',
        }}
      />
    </div>
  )
}
