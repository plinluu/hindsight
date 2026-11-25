export default function Declined({homeHref = '#/Today'}: {homeHref?: string}) {
  return (
    <>
      <h1>Trade review is closed</h1>
      <p>You can still explore the markets and lessons.</p>
      <a href={homeHref}>Return to Today</a>
    </>
  )
}
