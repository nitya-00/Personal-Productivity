import cors from 'cors'
import express from 'express'
import dailyLogRouter from './routes/dailyLog.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api', dailyLogRouter)

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error)
  response.status(500).json({ message: 'Unable to complete that request. Please try again.' })
})

export default app
