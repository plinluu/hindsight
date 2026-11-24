const strokes: Record<string, string> = {
  Today: 'M2 15h16 M5 13a5 5 0 0 1 10 0',
  Markets: 'M3 15l4-6 4 3 6-8',
  Review: 'M5 3h10v14l-2-1-3 1-3-1-2 1z M8 7h4 M8 10h4',
  Learn: 'M2 4q4-1 8 2 4-3 8-2v11q-4-1-8 2-4-3-8-2z M10 6v11',
}
export default function Icon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={strokes[name]} />
    </svg>
  )
}
