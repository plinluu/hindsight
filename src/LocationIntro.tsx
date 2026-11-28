import { useState } from 'react'
import { locate, save } from './data'
export default function LocationIntro() {
  const [busy, setBusy] = useState(false)
  return (
    <aside className="panel">
      <h2>Make the view local</h2>
      <p>
        Match the weather and seasonal scene to your location. Your choice stays on this device. Open-Meteo
        receives your rounded coordinates for forecasts. You can search for a city instead.
      </p>
      <div className="row">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await locate()
            } catch {
              location.hash = '/Settings'
            } finally {
              save('location-seen', 'yes')
              setBusy(false)
            }
          }}
        >
          {busy ? 'Finding your city…' : 'Use my location'}
        </button>
        <button disabled={busy} onClick={() => save('location-seen', 'yes')}>
          Maybe later
        </button>
      </div>
    </aside>
  )
}
