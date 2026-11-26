const memory = new Map<string, string | null>()
const prefix = 'hs2:'
const latchKey = 'hindsight.winterLatch'
const storageKey = (key: string) => key === latchKey ? key : prefix + key
const event = 'hindsight-preference'
export function read(key: string) {
  if (!memory.has(key)) {
    try {
      memory.set(key, localStorage.getItem(storageKey(key)))
    } catch {
      memory.set(key, null)
    }
  }
  return memory.get(key) ?? null
}
export function save(key: string, value: string | null) {
  if (read(key) === value) return
  memory.set(key, value)
  try {
    if (value === null) localStorage.removeItem(storageKey(key))
    else localStorage.setItem(storageKey(key), value)
  } catch {
    /* Preferences remain available for this session. */
  }
  window.dispatchEvent(new Event(event))
}
window.addEventListener('storage', (e) => {
  if (e.key === null) memory.clear()
  else if (e.key === latchKey) memory.delete(latchKey)
  else if (e.key.startsWith(prefix)) memory.delete(e.key.slice(prefix.length))
  else return
  window.dispatchEvent(new Event(event))
})
export function listen(update: () => void) {
  window.addEventListener(event, update)
  return () => window.removeEventListener(event, update)
}
