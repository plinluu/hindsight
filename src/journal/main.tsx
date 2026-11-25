import React,{lazy,Suspense,useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import {read,useValue} from '../data'
import {WeatherSync} from '../Weather'
import Location from '../Location'
import Scene from '../Scene'
import Today from './Today'
import './journal.css'
import './settings.css'
const Detail=lazy(()=>import('./Detail'))
const names=['Today','Markets','News','Review','Learn','Settings','Tools']
const path=(name:string)=>name==='Today'?'/':'/'+name.toLowerCase()
function App(){
 const [url,setUrl]=useState(location.pathname),[menu,setMenu]=useState(''),[loader,setLoader]=useState(read('motion')==='reduce'||matchMedia('(prefers-reduced-motion: reduce)').matches?'gone':'visible')
 const seen=useValue('location-seen'), motion=useValue('motion'), light=useValue('daylight')
 useEffect(()=>{document.documentElement.dataset.motion=motion||'system';document.documentElement.dataset.daylight=light||'auto';if(motion==='reduce')setLoader('gone')},[motion,light])
 const page=[...names,'About','Declined'].find(n=>path(n)===url)||'Page not found'
 useEffect(()=>{
  const navigate=()=>{setUrl(location.pathname);setMenu('');window.scrollTo(0,0)}
  const click=(e:MouseEvent)=>{const a=(e.target as Element).closest('a');if(!a||a.origin!==location.origin||e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();history.pushState(null,'',a.href);navigate()}
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenu('')}
  document.addEventListener('keydown',escape);document.addEventListener('click',click);window.addEventListener('popstate',navigate)
  return ()=>{document.removeEventListener('keydown',escape);document.removeEventListener('click',click);window.removeEventListener('popstate',navigate)}
 },[])
 useEffect(()=>{document.title=page+' · Hindsight'},[page])
 useEffect(()=>{if(loader!=='visible')return;const fade=setTimeout(()=>setLoader('fade'),1200);return ()=>clearTimeout(fade)},[loader])
 useEffect(()=>{if(loader!=='fade')return;const end=setTimeout(()=>setLoader('gone'),600);return ()=>clearTimeout(end)},[loader])
 const link=(n:string)=><a key={n} aria-current={page===n?'page':undefined} href={path(n)}>{n}</a>
 const toggle=(n:string)=><button aria-expanded={menu===n} onClick={()=>setMenu(menu===n?'':n)}>{n} ⌄</button>
 return <><WeatherSync/><Scene/><header><nav className="desktop">{names.slice(0,6).map(link)}{toggle('Tools')}{menu==='Tools'&&<aside>{['Review','Learn','Markets','News','About'].map(link)}</aside>}</nav></header><nav className="mobile">{names.slice(0,4).map(link)}{toggle('More')}{menu==='More'&&<aside>{names.slice(4).map(link)}</aside>}</nav><main>{page==='Today'?<Today/>:<Suspense fallback={<p>Loading…</p>}><Detail page={page}/></Suspense>}{!seen&&page!=='Settings'&&<Location/>}</main>{loader!=='gone'&&<div className={'loader '+loader} role="status" aria-label="Loading Hindsight"/>}</>
}
createRoot(document.getElementById('root')!).render(<App/>)
