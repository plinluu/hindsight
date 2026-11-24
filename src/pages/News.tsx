import { useState } from 'react'
import { useFeed } from '../feed'
export default function News() {
  const { data, error } = useFeed(),
    [category, set] = useState('All')
  const stories = data?.stories.filter((n) => category === 'All' || n.category === category) ?? []
  return (
    <>
      <h1>Market news</h1>
      <label>
        Category
        <select value={category} onChange={(e) => set(e.target.value)}>
          {['All', 'Markets', 'Earnings', 'Economy', 'Deals'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {data && (
        <p>
          {error || Date.now() - data.at > 600000 ? 'Cached feed' : 'Updated'} ·{' '}
          {new Date(data.at).toLocaleString()}
        </p>
      )}
      {stories.map((n) => (
        <article className="panel" key={n.url}>
          <small>
            {n.source} · {new Date(n.time * 1000).toLocaleString()} · {n.category}
          </small>
          <h2>
            <a href={n.url} rel="noreferrer" target="_blank">
              {n.headline}
            </a>
          </h2>
          <p>Why it matters · {n.why}</p>
          <small>Headline tone · {n.tone} (keyword estimate)</small>
        </article>
      ))}
      {!stories.length && (
        <p role="status">
          {error
            ? 'Market news is unavailable. Retrying automatically.'
            : data
              ? 'No headlines in this category.'
              : 'Checking for headlines…'}
        </p>
      )}
    </>
  )
}
