const projectPages = import.meta.env.BASE_URL === '/hindsight/'

export function journalHref(path: string) {
  return projectPages ? '/hindsight/#' + path : path
}

export function journalPath() {
  return projectPages ? location.hash.slice(1) || '/' : location.pathname
}
