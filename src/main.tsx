import Today from './pages/Today'
import '@fontsource/spectral/latin-500.css'
import '@fontsource/dm-sans/latin-400.css'
import Icon from './Icon'
import { WeatherSync } from './Weather'
import Scene from './Scene'
import LocationIntro from './LocationIntro'
import { useValue } from './data'
import { createRoot } from 'react-dom/client'
import { Component, useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react'
import './style.css'
import './responsive.css'
import './journal.css'
const modules = import.meta.glob(['./pages/*.tsx', '!./pages/Today.tsx'])
const routes = Object.fromEntries(
  Object.entries(modules).map(([path, load]) => [
    path.split('/').pop()!.split('.')[0],
    lazy(load as () => Promise<{ default: React.ComponentType }>),
  ]),
)
function route() {
  const name = location.hash.slice(2)
  return Object.hasOwn(routes, name) ? name : 'Today'
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <section className="panel">
        <h2>This page couldn’t open</h2>
        <button onClick={() => location.reload()}>Try again</button>
      </section>
    ) : (
      this.props.children
    )
  }
}
function App() {
  const [page, setPage] = useState(route),
    main = useRef<HTMLElement>(null)
  useEffect(() => {
    const change = () => {
      setPage(route())
      requestAnimationFrame(() => main.current?.focus())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => {
    document.title = 'Hindsight · ' + page
  }, [page])
  const seen = useValue('location-seen')
  const Page = page === 'Today' ? Today : routes[page]
  return (
    <>
      <WeatherSync />
      <Scene />
      <a
        className="skip"
        href="#content"
        onClick={(e) => {
          e.preventDefault()
          main.current?.focus()
        }}
      >
        Skip to content
      </a>
      <header>
        <a className="brand" href="#/Today">
          <Icon name="Today" /> Hindsight
        </a>
        <nav aria-label="Main">
          {['Today', 'Markets', 'Review', 'Learn'].map((n) => (
            <a key={n} aria-current={n === page ? 'page' : undefined} href={'#/' + n}>
              <Icon name={n} /> {n}
            </a>
          ))}
        </nav>
        <a href="#/Settings">Settings</a>
      </header>
      <main id="content" tabIndex={-1} ref={main}>
        <Boundary key={page}>
          <Suspense
            fallback={
              <div className="panel skeleton" role="status">
                Opening journal…
              </div>
            }
          >
            <Page />
            {!seen && page === 'Today' && <LocationIntro />}
          </Suspense>
        </Boundary>
      </main>
      <footer>
        Hindsight <span>Personal market journal</span>
        <a href="#/About">About & privacy</a>
      </footer>
    </>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
