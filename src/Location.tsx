import { useState } from 'react'
import { json, locate, setPlace, save, useValue, type Place } from './data'
export default function Location() {
  const place = useValue('place'),
    seen = useValue('location-seen'),
    [q, setQ] = useState(''),
    [choices, setChoices] = useState<Place[]>([]),
    [status, msg] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <section className="glass location-form" id="location-settings" tabIndex={-1}>
      <h2>Local weather and scenery</h2>
      {place && <p>Selected location · {JSON.parse(place).name}</p>}
      <p>
        We use your location to match your local weather, sun times and season. Nothing is stored on a server. Open-Meteo receives your coordinates. If the browser can’t locate you, an IP
        lookup estimates your city.
      </p>
      <div className="row">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await locate()
              save('location-seen', 'yes')
              msg('Location updated.')
            } catch {
              msg('Automatic location unavailable. Search for your city.')
            } finally {
              setBusy(false)
            }
          }}
        >
          Use my location
        </button>
        {!seen && <button onClick={() => save('location-seen', 'yes')}>Maybe later</button>}
        {place && (
          <button
            onClick={() => {
              save('place', null)
              msg('Location cleared.')
            }}
          >
            Clear location
          </button>
        )}
      </div>
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setChoices([])
          try {
            const data = await json(
              'https://geocoding-api.open-meteo.com/v1/search?count=6&name=' + encodeURIComponent(q),
            )
            const items = (data.results ?? []).map((v: Place & { admin1: string; country: string }) => ({
              ...v,
              name: [v.name, v.admin1, v.country].filter(Boolean).join(', '),
            }))
            setChoices(items)
            msg(items.length ? 'Select a city.' : 'No matching cities.')
          } catch {
            msg('City search unavailable. Try again.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <label>
          City
          <input required minLength={2} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button disabled={busy}>Find city</button>
      </form>
      <p role="status">{busy ? 'Locating…' : status}</p>
      {choices.map((p) => (
        <button
          key={p.latitude + ',' + p.longitude}
          onClick={() => {
            setPlace(p)
            save('location-seen', 'yes')
            setChoices([])
            msg('Location updated.')
          }}
        >
          {p.name}
        </button>
      ))}
    </section>
  )
}
