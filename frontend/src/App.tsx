import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, localDateInput } from './lib/api'
import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './Dashboard'
import Analytics from './Analytics'
import Goals from './Goals'
import Challenge from './Challenge'
import Checkins from './Checkins'
import PhoneFree from './PhoneFree'
import Experiments from './Experiments'
import Auth from './Auth'

type Category = { id: string; name: string }
type Distraction = 'NONE' | 'PHONE' | 'YOUTUBE' | 'FRIENDS' | 'UNEXPECTED_WORK' | 'TIRED' | 'PROCRASTINATION' | 'OTHER'
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
  ['UNEXPECTED_WORK', 'Unexpected work'], ['TIRED', 'Tired'], ['PROCRASTINATION', 'Procrastination'], ['OTHER', 'Other'],
]

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return localDateInput(next)
}

function hourLabel(hour: number) {
  const format = (value: number) => {
    const suffix = value >= 12 && value < 24 ? 'PM' : 'AM'
    const normalized = value % 12 || 12
    return `${normalized} ${suffix}`
  }
  return `${format(hour)} – ${format((hour + 1) % 24)}`
}

function ProfilePhoto() {
  const [photo, setPhoto] = useState(() => localStorage.getItem('timelens-profile-photo') ?? '')
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => { const image = String(reader.result); localStorage.setItem('timelens-profile-photo', image); setPhoto(image) }
    reader.readAsDataURL(file)
  }
  return <label className="profile-photo" title="Choose your photo">
    {photo ? <img src={photo} alt="Your profile" /> : <span>✦</span>}
    <input type="file" accept="image/*" onChange={choosePhoto} />
  </label>
}

function DailyLogPage() {
  const [date, setDate] = useState(localDateInput())
  const [log, setLog] = useState<DailyLog | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [savingHour, setSavingHour] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const loadDay = useCallback(async (selectedDate: string) => {
    setMessage('')
    try {
      const [logResponse, categoryResponse] = await Promise.all([
        apiFetch(`/api/daily-log/${selectedDate}`),
        apiFetch('/api/categories'),
      ])
      if (!logResponse.ok || !categoryResponse.ok) throw new Error('Could not load the daily log.')
      setLog(await logResponse.json() as DailyLog)
      setCategories((await categoryResponse.json() as { categories: Category[] }).categories)
    } catch {
      setMessage('Unable to load this day. Please refresh and try again.')
    }
  }, [])

  useEffect(() => { void loadDay(date) }, [date, loadDay])
  useEffect(() => () => Object.values(saveTimers.current).forEach(clearTimeout), [])

  function updateDraft(hourIndex: number, values: Partial<HourlyBlock>) {
    setLog((current) => current && {
      ...current,
      blocks: current.blocks.map((block) => block.hourIndex === hourIndex ? { ...block, ...values } : block),
    })
  }

  async function saveBlock(block: HourlyBlock, quietly = false) {
    setSavingHour(block.hourIndex)
    setMessage('')
    try {
      const response = await apiFetch(`/api/daily-log/${date}/blocks/${block.hourIndex}`, {
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
      if (!quietly) setMessage(`${hourLabel(block.hourIndex)} saved.`)
    } catch {
      setMessage('Unable to save this block. Please try again.')
    } finally {
      setSavingHour(null)
    }
  }

  function updateAndSave(block: HourlyBlock, values: Partial<HourlyBlock>) {
    const next = { ...block, ...values }
    updateDraft(block.hourIndex, values)
    clearTimeout(saveTimers.current[block.hourIndex])
    saveTimers.current[block.hourIndex] = setTimeout(() => void saveBlock(next, true), 550)
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div><p className="eyebrow">TIME LENS</p><h1>Daily log</h1></div>
        <p className="quiet">Changes save automatically while you write.</p>
      </header>

      <section className="date-bar" aria-label="Choose a day">
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">←</button>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <button onClick={() => setDate(localDateInput())}>Today</button>
        <button onClick={() => setDate(addDays(date, 1))} aria-label="Next day">→</button>
      </section>

      {message && <p className="notice" role="status">{message}</p>}
      <section className="table-frame" aria-label="24 hour daily log">
        <table>
          <thead><tr><th>Time</th><th>Category</th><th>Activity</th><th>Planned task</th><th>Distraction</th></tr></thead>
          <tbody>
            {log?.blocks.map((block) => <tr key={block.hourIndex}>
              <th scope="row">{hourLabel(block.hourIndex)}</th>
              <td><select aria-label={`${hourLabel(block.hourIndex)} category`} value={block.categoryId ?? ''} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value); updateAndSave(block, { categoryId: event.target.value || null, category: category ? { name: category.name } : null }) }}><option value="">—</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td>
              <td><input aria-label={`${hourLabel(block.hourIndex)} activity`} value={block.activity ?? ''} placeholder="What did you do?" onChange={(event) => updateAndSave(block, { activity: event.target.value })} /></td>
              <td><input aria-label={`${hourLabel(block.hourIndex)} planned task`} value={block.plannedTask ?? ''} placeholder="Optional" onChange={(event) => updateAndSave(block, { plannedTask: event.target.value })} /></td>
              <td><select aria-label={`${hourLabel(block.hourIndex)} distraction`} value={block.distraction} onChange={(event) => updateAndSave(block, { distraction: event.target.value as Distraction })}>{distractions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
            </tr>)}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default function App() {
  return <><nav className="main-nav" aria-label="Main navigation"><div className="nav-links"><NavLink to="/">Daily log</NavLink><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/analytics">Analytics</NavLink><NavLink to="/goals">Goals</NavLink><NavLink to="/challenge">100 Days</NavLink><NavLink to="/checkins">Check-ins</NavLink><NavLink to="/phone-free">Phone-free</NavLink><NavLink to="/experiments">Experiments</NavLink></div><div className="nav-profile"><ProfilePhoto /><NavLink to="/auth">Sign in</NavLink></div></nav><Routes><Route path="/" element={<DailyLogPage />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/analytics" element={<Analytics />} /><Route path="/goals" element={<Goals />} /><Route path="/challenge" element={<Challenge />} /><Route path="/checkins" element={<Checkins />} /><Route path="/phone-free" element={<PhoneFree />} /><Route path="/experiments" element={<Experiments />} /><Route path="/auth" element={<Auth />} /></Routes></>
}
