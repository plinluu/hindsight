import { useEffect, useState } from 'react'
import { useValue } from './data'
import { season, sunState } from './season'
export default function Scene() {
  const place = useValue('place'),
    sky = useValue('sky'),
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
  const which = season(month, p?.latitude ?? 1),
    size = window.innerWidth < 760 ? '-small' : ''
  const url = (v: string) => import.meta.env.BASE_URL + 'assets/bg/' + which + '-' + v + size + '.webp'
  const src = url(state ?? 'day'),
    next = url(state === 'day' ? 'sunset' : state === 'sunset' ? 'night' : 'day')
  useEffect(() => {
    let active = true
    const img = new Image()
    img.onload = () => {
      if (active) {
        show(src)
        const preload = new Image()
        preload.src = next
      }
    }
    img.src = src
    return () => {
      active = false
    }
  }, [src, next])
  useEffect(() => {
    const timer = setTimeout(() => previous(shown), 450)
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
            animationName: old && old !== shown ? 'scene-in' : 'none',
          }}
        />
      )}
      <i
        style={{
          background: valid && s.code >= 51 ? '#526a7b22' : valid && s.code > 0 ? '#989c9c12' : 'transparent',
        }}
      />
    </div>
  )
}
