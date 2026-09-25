import { Router } from 'express'
import { getDashboard } from '../services/dashboard.js'

const router = Router()

router.get('/analytics/dashboard', async (request, response, next) => {
  try {
    const rawDate = typeof request.query.date === 'string' ? request.query.date : undefined
    const date = rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : new Date()
    if (Number.isNaN(date.getTime())) return response.status(400).json({ message: 'Please use a valid date.' })
    response.json(await getDashboard(date))
  } catch (error) {
    next(error)
  }
})

export default router
