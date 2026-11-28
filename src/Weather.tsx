import { journalHref } from './journal/routes'
import { useEffect, useState } from 'react'
import { json, read, save, useValue } from './data'
import { condition } from './season'
type Forecast = {
  timezone: string
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number; time: number }
  hourly: { time: number[]; temperature_2m: number[]; weather_code: number[] }
  daily: { sunrise: number[]; sunset: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; snowfall_sum: number[]; weather_code: number[] }
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
          past_days: '7',
          temperature_unit: 'celsius',
          current: 'temperature_2m,apparent_temperature,weather_code,snowfall',
          hourly: 'temperature_2m,weather_code,snowfall',
          daily: 'sunrise,sunset,temperature_2m_max,temperature_2m_min,snowfall_sum,weather_code',
        })
        const d: Forecast = await json('https://api.open-meteo.com/v1/forecast?' + params)
        if (active) {
          save('weather', JSON.stringify({ place, at: Date.now(), payload: d }))
          save(
            'sky',
            JSON.stringify({
              place,
              zone: d.timezone,
              rise: d.daily.sunrise[7],
              set: d.daily.sunset[7],
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
export default function Weather({compact = false}: {compact?: boolean}) {
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
  const today = d?.daily.temperature_2m_max ? 7 : 0
  const minutes = d ? Math.ceil((d.daily.sunset[today] * 1000 - now) / 60000) : 0
  const sample = !d || !!error
  const label = sample ? 'Toronto' : JSON.parse(place!).name
  const degrees = temp(sample ? 18 : d.current.temperature_2m)
  const sunset = sample ? '7:42 PM' : time(d.daily.sunset[today])
  if (compact) return <div className="conditions"><span aria-hidden="true">☼</span> {label} · {degrees} <i/> Sunset {sunset} {sample && <small>Sample data</small>}</div>
  return (
    <section className="glass forecast">
      <div className="row">
        <h2>Local weather</h2>
        <button aria-label="Switch temperature units" onClick={() => save('unit', unit === 'C' ? 'F' : 'C')}>
          °{unit}
        </button>
      </div>
      {!sample && d && entry ? (
        <>
          <p>
            {JSON.parse(place!).name} · {temp(d.current.temperature_2m)} · {condition(d.current.weather_code)}
          </p>
          <p>
            Feels like {temp(d.current.apparent_temperature)}. Sunrise {time(d.daily.sunrise[today])}, sunset{' '}
            {time(d.daily.sunset[today])} ({d.timezone}).{' '}
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
        <>
          <small>Sample data</small>
          <h3>{degrees} · Partly cloudy</h3>
          <p>Toronto · Feels like {temp(17)}</p>
          <p>Sunrise 6:34 AM · Sunset 7:42 PM (Toronto time)</p>
          <details><summary>Hourly forecast</summary>{[18,17,16].map((c,i)=><p key={c}>{4+i}:00 PM · {temp(c)} · Partly cloudy</p>)}</details>
          <a href={journalHref("/settings")}>Location settings</a>
        </>
      )}
      {!sample && <p>Weather data by <a href="https://open-meteo.com/">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Temperatures are rounded and displayed in your selected units.</p>}
      {place && error && <p role="status">{error} Retrying automatically.</p>}
    </section>
  )
}
