const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${apiOrigin}${path}`, { ...options, credentials: 'include' })
}

export function localDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
