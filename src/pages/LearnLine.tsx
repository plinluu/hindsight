export function Line({ points }: { points: number[] }) {
  const min = Math.min(...points),
    max = Math.max(...points)
  return (
    <svg
      role="img"
      aria-label={'Values in order: ' + points.map((v) => v.toFixed(2)).join(', ')}
      viewBox="0 0 500 96"
      width="100%"
      height="96"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        points={points
          .map(
            (v, i) =>
              8 +
              (i * 484) / Math.max(1, points.length - 1) +
              ',' +
              (84 - (72 * (v - min)) / (max - min || 1)),
          )
          .join(' ')}
      />
    </svg>
  )
}
