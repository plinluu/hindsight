import { type CSSProperties } from 'react'
import { useValue } from './data'
import { useLocalScene } from './useLocalScene'
import { sunState, condition, sceneSeason } from './season'
export default function Scene() {
  const seasonOverride = useValue('season')
  const lightOverride = useValue('daylight')
  const { now, forecast, detectedSeason } = useLocalScene()
  const state = forecast ? sunState(now / 1000, forecast.rise, forecast.set) : undefined
  const which = sceneSeason(seasonOverride, detectedSeason)
  const manualLight = lightOverride && ['day', 'sunset', 'night'].includes(lightOverride) ? lightOverride : null
  const light = manualLight ?? state ?? 'day'
  const weather = forecast ? condition(forecast.code) : 'Clear'
  return (
    <div className="scene" aria-hidden="true" data-season={which} data-light={light} data-weather={weather}>
      {Array.from({ length: which === 'winter' ? 42 : which ? 20 : 0 }, (_, i) => {
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
