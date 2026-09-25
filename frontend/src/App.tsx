import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './Dashboard'
import Analytics from './Analytics'
import Goals from './Goals'
import Challenge from './Challenge'
import Checkins from './Checkins'
import Reminders from './Reminders'
import PhoneFree from './PhoneFree'

type Category = { id: string; name: string }
type Distraction = 'NONE' | 'PHONE' | 'YOUTUBE' | 'FRIENDS' | 'UNEXPECTED_WORK' | 'TIRED' | 'OTHER'
type HourlyBlock = {
  hourIndex: number
  category: { name: string } | null
  categoryId: string | null
  activity: string | null
  plannedTask: string | null
  distraction: Distraction
  missedPlanReason: string | null
}
type DailyLog = { date: string; blocks: HourlyBlock[] }

const distractions: Array<[Distraction, string]> = [
  ['NONE', 'None'], ['PHONE', 'Phone'], ['YOUTUBE', 'YouTube'], ['FRIENDS', 'Friends'],
  ['UNEXPECTED_WORK', 'Unexpected work'], ['TIRED', 'Tired'], ['OTHER', 'Other'],
]

function dateToInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return dateToInput(next)
}

function hourLabel(hour: number) {
  const format = (value: number) => {
    const suffix = value >= 12 && value < 24 ? 'PM' : 'AM'
    const normalized = value % 12 || 12
    return `${normalized} ${suffix}`
  }
  return `${format(hour)} – ${format((hour + 1) % 24)}`
}

function DailyLogPage() {
  const [date, setDate] = useState(dateToInput(new Date()))
  const [log, setLog] = useState<DailyLog | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [savingHour, setSavingHour] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  const loadDay = useCallback(async (selectedDate: string) => {
    setMessage('')
    try {
      const [logResponse, categoryResponse] = await Promise.all([
        fetch(`/api/daily-log/${selectedDate}`),
        fetch('/api/categories'),
      ])
      if (!logResponse.ok || !categoryResponse.ok) throw new Error('Could not load the daily log.')
      setLog(await logResponse.json() as DailyLog)
      setCategories((await categoryResponse.json() as { categories: Category[] }).categories)
    } catch {
      setMessage('Unable to load this day. Please refresh and try again.')
    }
  }, [])

  useEffect(() => { void loadDay(date) }, [date, loadDay])

  function updateDraft(hourIndex: number, values: Partial<HourlyBlock>) {
    setLog((current) => current && {
      ...current,
      blocks: current.blocks.map((block) => block.hourIndex === hourIndex ? { ...block, ...values } : block),
    })
  }

  async function saveBlock(block: HourlyBlock) {
    setSavingHour(block.hourIndex)
    setMessage('')
    try {
      const response = await fetch(`/api/daily-log/${date}/blocks/${block.hourIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: block.categoryId,
          activity: block.activity || null,
          plannedTask: block.plannedTask || null,
          distraction: block.distraction,
          missedPlanReason: block.missedPlanReason || null,
        }),
      })
      if (!response.ok) throw new Error('Could not save the block.')
      const updated = await response.json() as HourlyBlock
      updateDraft(block.hourIndex, updated)
      setMessage(`${hourLabel(block.hourIndex)} saved.`)
    } catch {
      setMessage('Unable to save this block. Please try again.')
    } finally {
      setSavingHour(null)
    }
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div><p className="eyebrow">TIME LENS</p><h1>Daily log</h1></div>
        <p className="quiet">Fill in what happened, one hour at a time.</p>
      </header>

      <section className="date-bar" aria-label="Choose a day">
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">←</button>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <button onClick={() => setDate(dateToInput(new Date()))}>Today</button>
        <button onClick={() => setDate(addDays(date, 1))} aria-label="Next day">→</button>
      </section>

      {message && <p className="notice" role="status">{message}</p>}
      <section className="table-frame" aria-label="24 hour daily log">
        <table>
          <thead><tr><th>Time</th><th>Category</th><th>Activity</th><th>Planned task</th><th>Distraction</th><th><span className="sr-only">Save</span></th></tr></thead>
          <tbody>
            {log?.blocks.map((block) => <tr key={block.hourIndex}>
              <th scope="row">{hourLabel(block.hourIndex)}</th>
              <td><select aria-label={`${hourLabel(block.hourIndex)} category`} value={block.categoryId ?? ''} onChange={(event) => updateDraft(block.hourIndex, { categoryId: event.target.value || null, category: categories.find((item) => item.id === event.target.value) ? { name: categories.find((item) => item.id === event.target.value)!.name } : null })}><option value="">—</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td>
              <td><input aria-label={`${hourLabel(block.hourIndex)} activity`} value={block.activity ?? ''} placeholder="What did you do?" onChange={(event) => updateDraft(block.hourIndex, { activity: event.target.value })} /></td>
              <td><input aria-label={`${hourLabel(block.hourIndex)} planned task`} value={block.plannedTask ?? ''} placeholder="Optional" onChange={(event) => updateDraft(block.hourIndex, { plannedTask: event.target.value })} /></td>
              <td><select aria-label={`${hourLabel(block.hourIndex)} distraction`} value={block.distraction} onChange={(event) => updateDraft(block.hourIndex, { distraction: event.target.value as Distraction })}>{distractions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
              <td><button className="save-button" disabled={savingHour === block.hourIndex} onClick={() => void saveBlock(block)}>{savingHour === block.hourIndex ? 'Saving' : 'Save'}</button></td>
            </tr>)}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default function App() {
  return <><nav className="main-nav" aria-label="Main navigation"><NavLink to="/">Daily log</NavLink><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/analytics">Analytics</NavLink><NavLink to="/goals">Goals</NavLink><NavLink to="/challenge">100 Days</NavLink><NavLink to="/checkins">Check-ins</NavLink><NavLink to="/reminders">Reminders</NavLink><NavLink to="/phone-free">Phone-free</NavLink></nav><Routes><Route path="/" element={<DailyLogPage />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/analytics" element={<Analytics />} /><Route path="/goals" element={<Goals />} /><Route path="/challenge" element={<Challenge />} /><Route path="/checkins" element={<Checkins />} /><Route path="/reminders" element={<Reminders />} /><Route path="/phone-free" element={<PhoneFree />} /></Routes></>
}
