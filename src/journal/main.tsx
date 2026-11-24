import React,{lazy,Suspense,useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import '@fontsource/newsreader/latin-500.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-600.css'
import Today from './Today'
import './journal.css'
const Detail=lazy(()=>import('./Detail'))
const names=['Today','Markets','News','Review','Learn','Settings','Tools']
const path=(name:string)=>name==='Today'?'/':'/'+name.toLowerCase()
function App(){
 const [url,setUrl]=useState(location.pathname),[menu,setMenu]=useState(''),[loader,setLoader]=useState(matchMedia('(prefers-reduced-motion: reduce)').matches?'gone':'visible')
 const page=names.find(n=>path(n)===url)||'Page not found'
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
 return <><header><span className="brand">Hindsight</span><nav className="desktop">{names.slice(0,6).map(link)}{toggle('Tools')}{menu==='Tools'&&<aside>{['Tools','Review','Learn'].map(link)}</aside>}</nav></header><nav className="mobile">{names.slice(0,4).map(link)}{toggle('More')}{menu==='More'&&<aside>{names.slice(4).map(link)}</aside>}</nav><main>{page==='Today'?<Today/>:<Suspense fallback={<p>Loading…</p>}><Detail page={page}/></Suspense>}</main>{loader!=='gone'&&<div className={'loader '+loader} role="status"><strong>Hindsight</strong><i/></div>}</>
}
createRoot(document.getElementById('root')!).render(<App/>)
