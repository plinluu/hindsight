import { useEffect, useState } from 'react'
import { json, read, save, useValue } from './data'
import { condition } from './season'
type Forecast = {
  timezone: string
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number; time: number }
  hourly: { time: number[]; temperature_2m: number[]; weather_code: number[] }
  daily: { sunrise: number[]; sunset: number[] }
}
type Entry = { place: string; at: number; payload: Forecast }
const ttl = 600000
export function WeatherSync() {
  const place = useValue('place')
  useEffect(() => {
    if (!place) {
      save('weather', null)
      save('sky', null)
      return
    }
    let active = true,
      busy = false
    async function refresh() {
      if (busy) return
      busy = true
      try {
        const cached = read('weather')
        const prior: Entry | null = cached ? JSON.parse(cached) : null
        if (prior?.place === place && Date.now() - prior.at < ttl) return
        const p = JSON.parse(place!)
        const params = new URLSearchParams({
          latitude: p.latitude,
          longitude: p.longitude,
          timezone: 'auto',
          timeformat: 'unixtime',
          forecast_days: '2',
          current: 'temperature_2m,apparent_temperature,weather_code',
          hourly: 'temperature_2m,weather_code',
          daily: 'sunrise,sunset',
        })
        const d: Forecast = await json('https://api.open-meteo.com/v1/forecast?' + params)
        if (active) {
          save('weather', JSON.stringify({ place, at: Date.now(), payload: d }))
          save(
            'sky',
            JSON.stringify({
              place,
              zone: d.timezone,
              rise: d.daily.sunrise[0],
              set: d.daily.sunset[0],
              code: d.current.weather_code,
            }),
          )
          save('weather-error', null)
        }
      } catch {
        if (active) save('weather-error', 'Weather service unavailable.')
      } finally {
        busy = false
      }
    }
    void refresh()
    const timer = setInterval(refresh, 60000)
    window.addEventListener('online', refresh)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('online', refresh)
    }
  }, [place])
  return null
}
export default function Weather() {
  const place = useValue('place'),
    stored = useValue('weather'),
    error = useValue('weather-error'),
    unit = useValue('unit') ?? 'C'
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  const entry: Entry | null = stored ? JSON.parse(stored) : null,
    d = entry?.place === place ? entry?.payload : null
  const temp = (c: number) => Math.round(unit === 'F' ? (c * 9) / 5 + 32 : c) + '°' + unit
  const time = (s: number) =>
    new Date(s * 1000).toLocaleTimeString(undefined, {
      timeZone: d?.timezone,
      hour: 'numeric',
      minute: '2-digit',
    })
  const minutes = d ? Math.ceil((d.daily.sunset[0] * 1000 - now) / 60000) : 0
  return (
    <section className="panel">
      <div className="row">
        <h2>Local weather</h2>
        <button aria-label="Switch temperature units" onClick={() => save('unit', unit === 'C' ? 'F' : 'C')}>
          °{unit}
        </button>
      </div>
      {d && entry ? (
        <>
          <p>
            {JSON.parse(place!).name} · {temp(d.current.temperature_2m)} · {condition(d.current.weather_code)}
          </p>
          <p>
            Feels like {temp(d.current.apparent_temperature)}. Sunrise {time(d.daily.sunrise[0])}, sunset{' '}
            {time(d.daily.sunset[0])} ({d.timezone}).{' '}
            {minutes > 0
              ? Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm until sunset.'
              : 'The sun has set.'}
          </p>
          <details>
            <summary>Next 12 hours</summary>
            {d.hourly.time
              .map((v, i) => ({ v, i }))
              .filter((x) => x.v >= d.current.time)
              .slice(0, 12)
              .map(({ v, i }) => (
                <p key={v}>
                  {time(v)} · {temp(d.hourly.temperature_2m[i])} · {condition(d.hourly.weather_code[i])}
                </p>
              ))}
          </details>
          <small>
            {now - entry.at > ttl ? 'Cached forecast' : 'Updated'} · {new Date(entry.at).toLocaleString()}
          </small>
        </>
      ) : (
        <p>
          {place ? 'Waiting for the forecast.' : 'Choose a location to see your forecast.'}{' '}
          <a href="#/Settings">Location settings</a>
        </p>
      )}
      {place && error && <p role="status">{error} Retrying automatically.</p>}
    </section>
  )
}
