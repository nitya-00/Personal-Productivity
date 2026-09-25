import cors from 'cors'
import express from 'express'
import dailyLogRouter from './routes/dailyLog.js'
import analyticsRouter from './routes/analytics.js'
import goalsRouter from './routes/goals.js'
import challengeRouter from './routes/challenge.js'
import checkinsRouter from './routes/checkins.js'
import remindersRouter from './routes/reminders.js'
import phoneFreeRouter from './routes/phoneFree.js'
import insightsRouter from './routes/insights.js'
import experimentsRouter from './routes/experiments.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api', dailyLogRouter)
app.use('/api', analyticsRouter)
app.use('/api', goalsRouter)
app.use('/api', challengeRouter)
app.use('/api', checkinsRouter)
app.use('/api', remindersRouter)
app.use('/api', phoneFreeRouter)
app.use('/api', insightsRouter)
app.use('/api', experimentsRouter)

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error)
  response.status(500).json({ message: 'Unable to complete that request. Please try again.' })
})

export default app
