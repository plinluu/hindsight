import Recap from '../Recap'
import Weather from '../Weather'
import Icon from '../Icon'
const dateLabel = new Date().toLocaleDateString(undefined, {dateStyle: 'full'})
export default function Today() {
  return (
    <>
      <div className="journal-date">
        <span />
        {dateLabel}
      </div>
      <h1>Your market journal</h1>
      <Recap />
      <div className="grid2">
        {[
          ['Review', 'Review a trade', 'Follow a sale from its purchase price to the result after fees.'],
          ['Learn', 'Why prices move', 'Explore seven illustrated examples of what moves a stock.'],
        ].map(([page, title, desc]) => (
          <a className="panel destination" key={page} href={'#/' + page}>
            <Icon name={page} />
            <div>
              <h2>{title}</h2>
              <p>{desc}</p>
            </div>
          </a>
        ))}
      </div>
      <Weather />
    </>
  )
}
