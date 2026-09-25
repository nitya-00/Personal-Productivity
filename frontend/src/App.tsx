import { useEffect, useState } from 'react'

type HealthResponse = { status: string }

export default function App() {
  const [health, setHealth] = useState<'checking' | 'ok' | 'unavailable'>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then(async (response) => {
        if (!response.ok) throw new Error('Health request failed')
        return response.json() as Promise<HealthResponse>
      })
      .then((data) => setHealth(data.status === 'ok' ? 'ok' : 'unavailable'))
      .catch(() => setHealth('unavailable'))
  }, [])

  return (
    <main>
      <h1>TimeLens</h1>
      <p>Personal time and productivity tracking.</p>
      <p aria-live="polite">Backend status: {health}</p>
    </main>
  )
}
