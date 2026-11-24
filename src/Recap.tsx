import { useFeed } from './feed'
export default function Recap() {
  const { data, error } = useFeed()
  return (
    <section className="feature">
      <small>Daily recap</small>
      <h2>{data?.recap ?? 'Today in the markets'}</h2>
      {!data && (
        <p role="status">
          {error
            ? 'Live market data is unavailable. You can still explore charts and review trades.'
            : 'Checking for market updates…'}
        </p>
      )}
      {data && (
        <>
          <small>
            {error || Date.now() - data.at > 600000 ? 'Cached · ' : ''}Retrieved{' '}
            {new Date(data.at).toLocaleString()}
          </small>
          {['Index', 'Stock', 'Sector'].map((group, i) => (
            <details key={group}>
              <summary>
                {['Index trackers', 'Largest moves among five tracked stocks', 'Sector ETF performance'][i]}
              </summary>
              {data.prices
                .filter((p) => p.group === group)
                .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                .map((p) => (
                  <p key={p.symbol}>
                    {p.name} · {p.price.toFixed(2)} USD · {p.change > 0 ? '+' : ''}
                    {p.change.toFixed(2)}% <small>{new Date(p.time * 1000).toLocaleDateString()}</small>
                  </p>
                ))}
              {!data.prices.some((p) => p.group === group) && <p>Quotes unavailable.</p>}
            </details>
          ))}
          <details>
            <summary>Upcoming earnings</summary>
            {data.events?.length ? (
              data.events.map((e, i) => (
                <p key={i}>
                  {e.date} · {e.symbol} reports earnings
                </p>
              ))
            ) : (
              <p>No scheduled events available from the feed.</p>
            )}
          </details>
          {data.stories[0] && (
            <p>
              In the news · <a href={data.stories[0].url}>{data.stories[0].headline}</a>
            </p>
          )}
        </>
      )}
      <a href="#/News">Read market news</a>
    </section>
  )
}
