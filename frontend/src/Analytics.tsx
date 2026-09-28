import { useEffect, useState } from 'react'
import { apiFetch, localDateInput } from './lib/api'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type AnalyticsData = {
  days: number; loggedHours: number; totalSlots: number
  categories: Array<{ name: string; hours: number; percentage: number; previousHours: number; changePercentage: number | null }>
  hourly: Array<{ hour: string; focus: number; distractions: number }>
  planned: { total: number; completed: number; diverted: number; completionPercentage: number | null }
  distractions: Array<{ name: string; count: number }>
  studyBreakdown: Array<{ name: string; hours: number }>
}

export default function Analytics() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setData(null); setError(false)
    apiFetch(`/api/analytics/${days}?date=${localDateInput()}`).then(async (response) => {
      if (!response.ok) throw new Error('Analytics request failed')
      setData(await response.json() as AnalyticsData)
    }).catch(() => setError(true))
  }, [days])

  if (error) return <main className="dashboard-shell"><p className="notice">Unable to load analytics. Please refresh and try again.</p></main>
  if (!data) return <main className="dashboard-shell"><p className="quiet">Calculating your patterns…</p></main>
  return <main className="dashboard-shell">
    <header className="masthead"><div><p className="eyebrow">TIME LENS</p><h1>Patterns over time</h1></div><p className="quiet">Only recorded hours are included. Comparisons use the immediately preceding matching period.</p></header>
    <div className="period-tabs" role="tablist" aria-label="Analytics period">{[7, 15, 30].map((period) => <button key={period} role="tab" aria-selected={days === period} onClick={() => setDays(period)}>{period} days</button>)}</div>
    <p className="analytics-note">{data.loggedHours} of {data.totalSlots} possible hourly blocks have a category.</p>
    <section className="analytics-table panel"><h2>Where your time went</h2><table><thead><tr><th>Category</th><th>This period</th><th>Of period</th><th>Previous</th><th>Change</th></tr></thead><tbody>{data.categories.map((item) => <tr key={item.name}><th>{item.name}</th><td>{item.hours}h</td><td>{item.percentage}%</td><td>{item.previousHours}h</td><td>{item.changePercentage === null ? '—' : `${item.changePercentage > 0 ? '+' : ''}${item.changePercentage}%`}</td></tr>)}</tbody></table></section>
    <section className="dashboard-columns analytics-gap"><article className="panel"><p className="eyebrow">PLANNED VS ACTUAL</p><h2>{data.planned.total} planned focus blocks</h2><ul className="metric-list"><li><span>Completed</span><strong>{data.planned.completed}</strong></li><li><span>Diverted</span><strong>{data.planned.diverted}</strong></li><li><span>Completion</span><strong>{data.planned.completionPercentage === null ? '—' : `${data.planned.completionPercentage}%`}</strong></li></ul></article><article className="panel"><p className="eyebrow">DISTRACTIONS</p><h2>Recorded interruptions</h2>{data.distractions.length ? <ul className="metric-list">{data.distractions.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.count}</strong></li>)}</ul> : <p className="quiet">No distractions were recorded for this period.</p>}</article></section>
    <section className="panel chart-panel"><p className="eyebrow">HOURLY PATTERN</p><h2>Focus and distractions by hour</h2><div className="chart-wrap"><ResponsiveContainer width="100%" height={280}><BarChart data={data.hourly}><CartesianGrid strokeDasharray="3 3" stroke="#dce7e1" /><XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="focus" name="Study / Work" fill="#426c60" radius={[3, 3, 0, 0]} /><Bar dataKey="distractions" name="Distractions" fill="#b5794f" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="dashboard-columns analytics-gap"><article className="panel"><p className="eyebrow">CATEGORY BREAKDOWN</p><ul className="metric-list">{data.studyBreakdown.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.hours}h</strong></li>)}</ul></article></section>
  </main>
}
