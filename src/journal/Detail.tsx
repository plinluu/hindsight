import {lazy} from 'react'
import Settings from './Settings'
import Briefing from './Briefing'
import Markets from './Markets'
import {Products} from './Today'
import './products.css'

const Review = lazy(() => import('../pages/Review'))
const Learn = lazy(() => import('../pages/Learn'))
const About = lazy(() => import('../pages/About'))
const Declined = lazy(() => import('../pages/Declined'))

export default function Detail({page}: {page: string}) {
  if (page === 'Settings') return <Settings/>
  if (page === 'Markets') return <Markets/>
  const products: Record<string, React.ReactNode> = {
    Review: <Review aboutHref="/about" declineHref="/declined"/>,
    Learn: <Learn/>,
    About: <About/>,
    Declined: <Declined homeHref="/"/>,
  }
  if (products[page]) return <div className={page === 'Review' ? 'review-page' : 'journal-product'}>{products[page]}</div>
  return <><div className="hero"><h1>{page}</h1></div>
    {page === 'News' ? <Briefing/> : page === 'Tools' ? <Products/> : <a href="/">Return to Today</a>}
  </>
}
