import { useState } from 'react'
import { locate, save } from './data'
export default function LocationIntro() {
  const [busy, setBusy] = useState(false)
  return (
    <aside className="panel">
      <h2>Make the view local</h2>
      <p>
        Match the weather and seasonal scene to your location. Your choice stays on this device. Open-Meteo
        receives your coordinates, and an IP lookup estimates your city if browser location is unavailable.
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
