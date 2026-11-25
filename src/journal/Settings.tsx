import {useState} from 'react'
import {save, useValue} from '../data'
import {useLocalScene} from '../useLocalScene'
import Location from '../Location'


export default function Settings() {
  const unit = useValue('unit') || 'C'
  const motion = useValue('motion') || 'system'
  const daylight = useValue('daylight') || 'auto'
  const season = useValue('season') || 'auto'
  const {detectedSeason, reason, locationName} = useLocalScene()
  const stored = useValue('watchlist')
  const symbols: string[] = stored ? JSON.parse(stored) : []
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState('')
  const update = (next: string[]) => save('watchlist', JSON.stringify(next))
  return <>
    <div className="hero"><h1>Settings</h1></div>
    <section className="glass"><h2>Quick settings</h2>
      <div className="quick-grid">
        <button onClick={()=>save('unit',unit==='C'?'F':'C')}><b aria-hidden="true">°{unit}</b>Units · {unit}</button>
        <button onClick={()=>document.getElementById('location-settings')?.focus()}><b aria-hidden="true">⌖</b>Location</button>
        <button aria-pressed={motion==='reduce'} onClick={()=>save('motion',motion==='reduce'?'system':'reduce')}><b aria-hidden="true">≈</b>Motion · {motion==='reduce'?'reduced':'system'}</button>
        <button onClick={()=>save('daylight',daylight==='auto'?'day':daylight==='day'?'sunset':daylight==='sunset'?'night':'auto')}><b aria-hidden="true">{daylight==='night'?'☾':'☼'}</b>Light · {daylight}</button>
      </div>
    </section>
    <section className="glass pref-form"><h2>Today’s background</h2>
      <label>Season <select value={season} onChange={event=>save('season',event.target.value)}>
        {['auto','spring','summer','autumn','winter'].map(value=><option key={value} value={value}>{value==='auto'?'Automatic':value[0].toUpperCase()+value.slice(1)}</option>)}
      </select></label>
      <p>{season === 'auto'
        ? detectedSeason
          ? `Automatic · ${detectedSeason} at ${locationName === 'Current location' ? 'your current location' : locationName}${reason ? ` (${reason})` : ''}.`
          : 'Choose a weather location below to match your background to its season.'
        : 'Choose Automatic to follow your weather location again.'}</p>
    </section>
    <Location/>
    <section className="glass pref-form"><h2>Watchlist</h2>
      <form onSubmit={event=>{
        event.preventDefault()
        const symbol=query.trim().toUpperCase()
        if(symbols.includes(symbol)){setNotice(symbol+' is already saved.');return}
        update([...symbols,symbol]);setQuery('');setNotice(symbol+' added.')
      }}>
        <label>Market symbol <input required pattern="[A-Za-z0-9][A-Za-z0-9.:\-]{0,24}" placeholder="AMEX:SPY" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <button>Add symbol</button>
      </form>
      {symbols.map(symbol=><div className="row" key={symbol}><span>{symbol}</span><button aria-label={'Remove '+symbol} onClick={()=>{update(symbols.filter(s=>s!==symbol));setNotice(symbol+' removed.')}}>Remove</button></div>)}
      <p role="status">{notice}</p>
    </section>
    <section className="glass pref-form"><h2>Reset preferences</h2>
      <p>Clear your saved location, forecast, watchlist and display settings on this device.</p>
      {confirm ? <><button onClick={()=>{
        for(const key of ['place','sky','weather','weather-error','location-seen','watchlist','unit','motion','daylight','season'])save(key,null)
        setConfirm(false);setQuery('');setNotice('Preferences reset.')
      }}>Confirm reset</button> <button onClick={()=>setConfirm(false)}>Cancel</button></> : <button onClick={()=>setConfirm(true)}>Reset preferences</button>}
    </section>
  </>
}
